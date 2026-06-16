# Warehouses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Warehouses subsystem — `GET /api/warehouses` (Admin + Operator) and `POST /api/warehouses` (Admin only). Smaller and simpler than Products: no business rules, no edit endpoint, no PRD-mandated unit test.

**Architecture:** Same layering as Products: `application/use-cases/warehouses/{CreateWarehouse,GetWarehouses}.ts` → `IWarehouseRepository` (domain, plan 1) → `PrismaWarehouseRepository` (infrastructure, plan 2, untouched here) → `api/routes/warehouses.routes.ts` → registered in the existing `api/routes/index.ts` aggregator.

**Tech Stack:** Same as plans 2–4 — Fastify, Zod, `@fastify/type-provider-zod`. No new dependencies.

---

## Notes for whoever picks this up

- **Cross-checked against both the PRD (`PRD-WRMS.md`) and the original assessment PDF (`WTEC Mid-Level Full Stack Developer Technical Assessment.pdf`, in `~/Downloads`) before writing this plan** — both agree exactly: `GET /api/warehouses`, `POST /api/warehouses`, no `PUT`, no `DELETE`. Fields: `Warehouse ID, Name, Location, Active Status` in both documents.
- **No `update` method on `IWarehouseRepository`** (locked in back in plan 1) — matches PRD §4.2 "Armazém pode ser criado mas não editado (o PDF não incluiu PUT /warehouses)". `CreateWarehouse`/`GetWarehouses` are the only two use cases, exactly matching PRD §7.1's file list — no extra `GetWarehouseById` like Products needed, because there is no `GET /api/warehouses/:id` route in either source document.
- **`GET /api/warehouses` is open to `Operator`, not just `Admin`.** The original PDF's Operator permissions list doesn't mention warehouses at all, and its Admin permissions just say "Manage warehouses" — read literally, that could mean Admin-only. The PRD explicitly overrides this with a documented exception (§5.3: "decisão de implementação: liberar GET /api/warehouses para Operator também, pois o form de reserva precisa listar armazéns"), and `backend/README.md` already documents it under "Assumptions and Trade-offs". This was already decided before this plan — implementing it here, not re-deciding it.
- **`CreateWarehouse` and `GetWarehouses` have no business logic at all** — no uniqueness check (no `@unique` on `Warehouse.name` in the schema, unlike `Product.sku`), no other validation beyond "name and location are non-empty strings", which Zod already enforces at the HTTP boundary. Unlike `CreateProduct`, there's no PRD-mandated unit test demanding the use case re-validate this itself, so no guard clauses are duplicated here — Zod is the only validation layer. Both use cases are intentionally thin pass-throughs to the repository; they exist because PRD §7.1 names these exact two files, not because there's logic to encapsulate.
- **No PRD-mandated unit test for this subsystem.** Neither the PRD (§9.1 only lists `CreateReservation`, `CancelReservation`, `AdjustInventory`, `CreateProduct`) nor the original PDF ("Unit Tests: Reservation business rules, Inventory validation, Product validation") ever mention warehouse validation as a unit-test target. Consistent with the no-business-logic point above — there's nothing to unit test in isolation.
- **`tests/integration/warehouses.test.ts` is added anyway**, same deliberate-deviation reasoning as plans 2 and 4 (`repositories.test.ts`, `products.test.ts`): proves the real route → real `PrismaWarehouseRepository` → real SQL Server path, including the Operator-can-GET exception, which is exactly the kind of thing worth a regression test since it's a deviation from the literal PDF.
- **`tests/integration/authorization.test.ts` (started in plan 4) gets its next case here**: `POST /api/warehouses` with an Operator token → 403. One PRD §9.2 case remains after this plan — `PUT /api/inventory` with an Operator token → 403 — added in plan 6.
- Formatting: tabs, single quotes (matches `biome.json`). `verbatimModuleSyntax` is `true` — type-only imports use `import type`.

---

### Task 1: Warehouse Use Cases

**Files:**
- Create: `src/application/use-cases/warehouses/CreateWarehouse.ts`
- Create: `src/application/use-cases/warehouses/GetWarehouses.ts`

No test in this task — see Notes on why neither PRD nor the original PDF call for one. Verified by type-check only, exercised end-to-end by Task 2's integration tests.

- [ ] **Step 1: Create `src/application/use-cases/warehouses/CreateWarehouse.ts`**

```ts
import type { Warehouse } from '../../../domain/entities/Warehouse';
import type { CreateWarehouseInput, IWarehouseRepository } from '../../../domain/repositories/IWarehouseRepository';

export class CreateWarehouse {
	constructor(private readonly warehouseRepository: IWarehouseRepository) {}

	async execute(input: CreateWarehouseInput): Promise<Warehouse> {
		return this.warehouseRepository.create(input);
	}
}
```

- [ ] **Step 2: Create `src/application/use-cases/warehouses/GetWarehouses.ts`**

```ts
import type { Warehouse } from '../../../domain/entities/Warehouse';
import type { IWarehouseRepository } from '../../../domain/repositories/IWarehouseRepository';

export class GetWarehouses {
	constructor(private readonly warehouseRepository: IWarehouseRepository) {}

	async execute(): Promise<Warehouse[]> {
		return this.warehouseRepository.findAll();
	}
}
```

- [ ] **Step 3: Verify the project still type-checks**

Run: `bunx tsc -p tsconfig.json`
Expected: exits with code 0, no output.

- [ ] **Step 4: Commit**

```bash
git add src/application/use-cases/warehouses
git commit -m "feat: add warehouse use cases"
```

---

### Task 2: Warehouses Route

**Files:**
- Create: `src/api/schemas/warehouse.schema.ts`
- Create: `src/api/routes/warehouses.routes.ts`
- Modify: `src/api/routes/index.ts`
- Test: `tests/integration/warehouses.test.ts`
- Modify: `tests/integration/authorization.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/integration/warehouses.test.ts
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';
import { prisma } from '../../src/infrastructure/database/prisma';

const app = buildApp();
const adminToken = jwtService.sign({ sub: randomUUID(), email: 'admin@wrms.com', role: 'Admin' });
const operatorToken = jwtService.sign({ sub: randomUUID(), email: 'operator@wrms.com', role: 'Operator' });
let createdId: string | undefined;

beforeAll(async () => {
	await app.ready();
});

afterAll(async () => {
	if (createdId) {
		await prisma.warehouse.delete({ where: { id: createdId } });
	}
});

describe('warehouses', () => {
	it('creates a warehouse as Admin and lists it', async () => {
		const name = `Warehouse-${randomUUID()}`;

		const createResponse = await request(app.server)
			.post('/api/warehouses')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ name, location: 'SP' });

		expect(createResponse.status).toBe(201);
		createdId = createResponse.body.id;

		const listResponse = await request(app.server)
			.get('/api/warehouses')
			.set('Authorization', `Bearer ${adminToken}`);

		expect(listResponse.status).toBe(200);
		expect(listResponse.body.some((warehouse: { id: string }) => warehouse.id === createdId)).toBe(true);
	});

	it('allows an Operator to list warehouses (deliberate PRD exception)', async () => {
		const response = await request(app.server)
			.get('/api/warehouses')
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(200);
	});
});
```

Append this test inside the existing `describe('authorization', ...)` block in `tests/integration/authorization.test.ts`, right after the `GET /api/products` case:

```ts
	it('returns 403 for POST /api/warehouses with an Operator token', async () => {
		const response = await request(app.server)
			.post('/api/warehouses')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ name: 'Should not be created', location: 'SP' });

		expect(response.status).toBe(403);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- tests/integration/warehouses.test.ts tests/integration/authorization.test.ts`
Expected: FAIL — every `/api/warehouses` request returns 404 (no route registered yet).

- [ ] **Step 3: Implement `src/api/schemas/warehouse.schema.ts`**

```ts
import { z } from 'zod';

export const createWarehouseBodySchema = z.object({
	name: z.string().min(1).describe('Warehouse name'),
	location: z.string().min(1).describe('Warehouse location'),
	isActive: z.boolean().optional().describe('Whether the warehouse is active'),
});

export const warehouseResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	location: z.string(),
	isActive: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});
```

- [ ] **Step 4: Implement `src/api/routes/warehouses.routes.ts`**

```ts
import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { CreateWarehouse } from '../../application/use-cases/warehouses/CreateWarehouse';
import { GetWarehouses } from '../../application/use-cases/warehouses/GetWarehouses';
import { PrismaWarehouseRepository } from '../../infrastructure/repositories/PrismaWarehouseRepository';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { errorResponseSchema } from '../schemas/error.schema';
import { createWarehouseBodySchema, warehouseResponseSchema } from '../schemas/warehouse.schema';

export const warehousesRoutes: FastifyPluginAsyncZod = async (app) => {
	const warehouseRepository = new PrismaWarehouseRepository();
	const createWarehouse = new CreateWarehouse(warehouseRepository);
	const getWarehouses = new GetWarehouses(warehouseRepository);

	app.get(
		'/warehouses',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Warehouses'],
				summary: 'List all warehouses',
				security: [{ bearerAuth: [] }],
				response: {
					200: warehouseResponseSchema.array(),
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async () => {
			return getWarehouses.execute();
		},
	);

	app.post(
		'/warehouses',
		{
			preHandler: [authenticate, authorize(['Admin'])],
			schema: {
				tags: ['Warehouses'],
				summary: 'Create a warehouse',
				security: [{ bearerAuth: [] }],
				body: createWarehouseBodySchema,
				response: {
					201: warehouseResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await createWarehouse.execute(request.body);
			reply.status(201).send(result);
		},
	);
};
```

- [ ] **Step 5: Modify `src/api/routes/index.ts`**

```ts
import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { authRoutes } from './auth.routes';
import { productsRoutes } from './products.routes';
import { warehousesRoutes } from './warehouses.routes';

export const routes: FastifyPluginAsyncZod = async (app) => {
	await app.register(authRoutes);
	await app.register(productsRoutes);
	await app.register(warehousesRoutes);
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun run test -- tests/integration/warehouses.test.ts tests/integration/authorization.test.ts`
Expected: PASS — 7 tests passed (2 + 5).

- [ ] **Step 7: Run the full test suite to check for regressions**

Run: `bun run test`
Expected: PASS — all tests across all files still pass.

- [ ] **Step 8: Commit**

```bash
git add src/api/schemas/warehouse.schema.ts src/api/routes/warehouses.routes.ts src/api/routes/index.ts tests/integration/warehouses.test.ts tests/integration/authorization.test.ts
git commit -m "feat: add warehouses routes"
```

---

## Self-Review

**Spec coverage:**
- PRD §3.2 / PDF "Each warehouse contains" → already covered by plan 1's entity. ✅
- PRD §4.2 / PDF "no PUT /warehouses" → no `update` method, no edit route. ✅
- PRD §5.3 / PDF API requirements, exact methods/paths → Task 2. ✅
- PRD §5.3's Operator exception for `GET /api/warehouses` → implemented with `authorize(['Admin', 'Operator'])`, tested explicitly. ✅
- PRD §9.2 `authorization.test.ts`, `POST /api/warehouses` Operator case → Task 2 (last remaining case, `PUT /api/inventory`, deferred to plan 6). ✅
- Verified against the original PDF directly (not just the PRD) per the project owner's standing instruction to always cross-check both. ✅

**Placeholder scan:** No TBD/TODO — every step has complete code. ✅

**Type consistency:** `IWarehouseRepository`/`CreateWarehouseInput` reused exactly as defined in plan 1. `warehouseResponseSchema` mirrors the `Warehouse` domain entity field-for-field. `errorResponseSchema` reused from plan 3. ✅

---

## Execution Handoff

Plan complete and saved to `backend/docs/tasks/05-warehouses.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
