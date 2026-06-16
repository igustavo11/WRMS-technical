# Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `GET /api/inventory` (Admin + Operator) and `PUT /api/inventory` (Admin only) — adjusting an existing inventory record's quantity. This plan also closes out `tests/integration/authorization.test.ts`, started in plan 4 — all 6 cases from PRD §9.2 are covered after this.

**Architecture:** Same layering as Products/Warehouses: `application/use-cases/inventory/{AdjustInventory,GetInventory}.ts` → `IInventoryRepository` (domain, plan 1) → `PrismaInventoryRepository` (infrastructure, plan 2, untouched here) → `api/routes/inventory.routes.ts` → registered in the existing `api/routes/index.ts` aggregator.

**Tech Stack:** Same as plans 2–5 — Fastify, Zod, `@fastify/type-provider-zod`. No new dependencies.

---

## Notes for whoever picks this up

- **There is no way to create an `Inventory` row through any API endpoint, and that's intentional, not a gap.** `IInventoryRepository` (locked in back in plan 1) has no `create` method — only `update`, `incrementQuantity`, `decrementQuantity`, `findByProductAndWarehouse`, `findAll`, `sumQuantity`. This was flagged as an open question back in plan 2's research and is resolved now by direct evidence: PRD §9.1's `AdjustInventory` unit test list explicitly demands `lança NotFoundError quando inventory não existe para produto+armazém` — i.e., adjusting a non-existent product×warehouse pair is a 404, not an upsert. Separately, the math in PRD §4.4 (`CreateReservation` treats a missing row as quantity 0, then requires `quantity >= reservation.quantity` where reservation quantity is always ≥ 1) means a reservation can never succeed against a missing row either — so nothing in the spec ever needs to *create* one. Inventory rows only ever come from seed data (plan 9).
- **`quantity` in the `PUT /api/inventory` body is an absolute value, not a delta.** PRD §5.4's example body (`{ "productId", "warehouseId", "quantity": 100 }`) and `IInventoryRepository.update(id, quantity)`'s signature both confirm this — `AdjustInventory` calls `update`, never `incrementQuantity`/`decrementQuantity` (those two are reserved for `CreateReservation`/`CancelReservation` in plan 7, to debit/restore stock).
- **The Zod body schema validates that `quantity` is an integer, but deliberately does *not* enforce `>= 0`.** This is different from `CreateProduct` in plan 4, where the Zod `min(1)` and the use case's guard clause check the *same* thing (empty string), duplicated only because PRD wants a unit test exercising the use case directly. Here the two layers check genuinely *different* things: Zod confirms the request is well-formed (a number was sent — 400 if not), while `AdjustInventory` enforces the business rule that the resulting quantity can't be negative (422 if it is, per PRD §4.3: "Retorna 422 se o ajuste resultar em valor < 0"). If Zod also rejected negative numbers, every negative-quantity request would get a generic 400 and the PRD-mandated 422 path would be unreachable from real HTTP — only the unit test would ever exercise it. Keeping Zod's check narrow is what makes the 422 real, not just a unit-test artifact.
- **`AdjustInventory` throws the generic `DomainError` directly for the negative-quantity case** (`code: 'NEGATIVE_QUANTITY'`, `statusCode: 422`) — no dedicated subclass, exactly the pattern plan 1's notes anticipated ("`DomainError` is concrete specifically so call sites can throw it directly for one-off cases... PRD §9.1's AdjustInventory unit tests expect a generic `DomainError`... there's no dedicated named subclass for that case").
- **Existence is checked before the negative-quantity rule** — adjusting a non-existent pair returns 404 regardless of what quantity was requested; an existing pair with a negative target quantity returns 422.
- **No PRD-mandated unit test for `GetInventory`.** Neither PRD §9.1 nor the original PDF's unit test list ("Reservation business rules, Inventory validation, Product validation") name it — "Inventory validation" refers to `AdjustInventory`'s rules, the only inventory-related unit test PRD actually lists. `GetInventory` is a thin pass-through, exercised transitively by `tests/integration/inventory.test.ts`.
- **`inventoryResponseSchema` only exposes `id`, `productId`, `warehouseId`, `quantity`, `updatedAt`** — matching the `Inventory` domain entity field-for-field (no `createdAt`, confirmed back in plan 1). No nested `product`/`warehouse` objects: nothing in the PRD, the original PDF, or `IInventoryRepository.findAll()`'s return type supports eager-loading them, so this isn't added speculatively.
- **`tests/integration/inventory.test.ts` is added beyond the PRD's literal ask**, same deliberate-deviation reasoning as plans 2, 4, and 5 — proves the real route → real `PrismaInventoryRepository` → real SQL Server path, including the 404 and 422 cases.
- **This plan adds the last case to `tests/integration/authorization.test.ts`**: `PUT /api/inventory` with an Operator token → 403. After this, all 6 of PRD §9.2's cases for this file exist (3 products + 1 warehouses + this 1 + the generic no-token case, all already in the file from plans 4–5).
- **Cross-checked against both the PRD and the original PDF before writing this plan** — both agree: `GET /api/inventory` (Admin + Operator), `PUT /api/inventory` (Admin only), "inventory quantity cannot be negative." No divergence found.
- Formatting: tabs, single quotes (matches `biome.json`). `verbatimModuleSyntax` is `true` — type-only imports use `import type`.

---

### Task 1: Inventory Use Cases

**Files:**
- Create: `src/application/use-cases/inventory/AdjustInventory.ts`
- Create: `src/application/use-cases/inventory/GetInventory.ts`
- Test: `tests/unit/AdjustInventory.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/AdjustInventory.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdjustInventory } from '../../src/application/use-cases/inventory/AdjustInventory';
import { DomainError } from '../../src/domain/errors/DomainError';
import { NotFoundError } from '../../src/domain/errors/NotFoundError';
import type { Inventory } from '../../src/domain/entities/Inventory';
import type { IInventoryRepository } from '../../src/domain/repositories/IInventoryRepository';

function buildInventory(overrides: Partial<Inventory> = {}): Inventory {
	return {
		id: 'inventory-1',
		productId: 'product-1',
		warehouseId: 'warehouse-1',
		quantity: 50,
		updatedAt: new Date(),
		...overrides,
	};
}

function buildRepository(): IInventoryRepository {
	return {
		findByProductAndWarehouse: vi.fn(),
		findAll: vi.fn(),
		update: vi.fn(),
		decrementQuantity: vi.fn(),
		incrementQuantity: vi.fn(),
		sumQuantity: vi.fn(),
	};
}

describe('AdjustInventory', () => {
	let repository: IInventoryRepository;
	let adjustInventory: AdjustInventory;

	beforeEach(() => {
		repository = buildRepository();
		adjustInventory = new AdjustInventory(repository);
	});

	it('adjusts the quantity to a valid positive value', async () => {
		vi.mocked(repository.findByProductAndWarehouse).mockResolvedValue(buildInventory());
		vi.mocked(repository.update).mockResolvedValue(buildInventory({ quantity: 100 }));

		const result = await adjustInventory.execute({
			productId: 'product-1',
			warehouseId: 'warehouse-1',
			quantity: 100,
		});

		expect(result.quantity).toBe(100);
		expect(repository.update).toHaveBeenCalledWith('inventory-1', 100);
	});

	it('adjusts the quantity to zero', async () => {
		vi.mocked(repository.findByProductAndWarehouse).mockResolvedValue(buildInventory());
		vi.mocked(repository.update).mockResolvedValue(buildInventory({ quantity: 0 }));

		const result = await adjustInventory.execute({ productId: 'product-1', warehouseId: 'warehouse-1', quantity: 0 });

		expect(result.quantity).toBe(0);
	});

	it('throws a DomainError when the new quantity is negative', async () => {
		vi.mocked(repository.findByProductAndWarehouse).mockResolvedValue(buildInventory());

		await expect(
			adjustInventory.execute({ productId: 'product-1', warehouseId: 'warehouse-1', quantity: -1 }),
		).rejects.toThrow(DomainError);
		expect(repository.update).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when inventory does not exist for the product/warehouse pair', async () => {
		vi.mocked(repository.findByProductAndWarehouse).mockResolvedValue(null);

		await expect(
			adjustInventory.execute({ productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10 }),
		).rejects.toThrow(NotFoundError);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/unit/AdjustInventory.test.ts`
Expected: FAIL — cannot find module `../../src/application/use-cases/inventory/AdjustInventory`.

- [ ] **Step 3: Implement `src/application/use-cases/inventory/AdjustInventory.ts`**

```ts
import type { Inventory } from '../../../domain/entities/Inventory';
import { DomainError } from '../../../domain/errors/DomainError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import type { IInventoryRepository } from '../../../domain/repositories/IInventoryRepository';

export type AdjustInventoryInput = {
	productId: string;
	warehouseId: string;
	quantity: number;
};

export class AdjustInventory {
	constructor(private readonly inventoryRepository: IInventoryRepository) {}

	async execute(input: AdjustInventoryInput): Promise<Inventory> {
		const inventory = await this.inventoryRepository.findByProductAndWarehouse(input.productId, input.warehouseId);

		if (!inventory) {
			throw new NotFoundError('Inventory');
		}

		if (input.quantity < 0) {
			throw new DomainError('Inventory quantity cannot be negative.', 'NEGATIVE_QUANTITY', 422);
		}

		return this.inventoryRepository.update(inventory.id, input.quantity);
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- tests/unit/AdjustInventory.test.ts`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Implement `src/application/use-cases/inventory/GetInventory.ts`**

```ts
import type { Inventory } from '../../../domain/entities/Inventory';
import type { IInventoryRepository } from '../../../domain/repositories/IInventoryRepository';

export class GetInventory {
	constructor(private readonly inventoryRepository: IInventoryRepository) {}

	async execute(): Promise<Inventory[]> {
		return this.inventoryRepository.findAll();
	}
}
```

- [ ] **Step 6: Verify the project still type-checks**

Run: `bunx tsc -p tsconfig.json`
Expected: exits with code 0, no output.

- [ ] **Step 7: Commit**

```bash
git add src/application/use-cases/inventory tests/unit/AdjustInventory.test.ts
git commit -m "feat: add inventory use cases"
```

---

### Task 2: Inventory Route

**Files:**
- Create: `src/api/schemas/inventory.schema.ts`
- Create: `src/api/routes/inventory.routes.ts`
- Modify: `src/api/routes/index.ts`
- Test: `tests/integration/inventory.test.ts`
- Modify: `tests/integration/authorization.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/integration/inventory.test.ts
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';
import { prisma } from '../../src/infrastructure/database/prisma';

const app = buildApp();
const adminToken = jwtService.sign({ sub: randomUUID(), email: 'admin@wrms.com', role: 'Admin' });
const operatorToken = jwtService.sign({ sub: randomUUID(), email: 'operator@wrms.com', role: 'Operator' });

let productId: string;
let warehouseId: string;
let inventoryId: string;

beforeAll(async () => {
	await app.ready();

	const product = await prisma.product.create({ data: { sku: `SKU-${randomUUID()}`, name: 'Inventory Product' } });
	const warehouse = await prisma.warehouse.create({ data: { name: `Warehouse-${randomUUID()}`, location: 'SP' } });
	const inventory = await prisma.inventory.create({
		data: { productId: product.id, warehouseId: warehouse.id, quantity: 50 },
	});

	productId = product.id;
	warehouseId = warehouse.id;
	inventoryId = inventory.id;
});

afterAll(async () => {
	await prisma.inventory.delete({ where: { id: inventoryId } });
	await prisma.product.delete({ where: { id: productId } });
	await prisma.warehouse.delete({ where: { id: warehouseId } });
});

describe('inventory', () => {
	it('allows an Operator to list inventory', async () => {
		const response = await request(app.server).get('/api/inventory').set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(200);
		expect(response.body.some((item: { id: string }) => item.id === inventoryId)).toBe(true);
	});

	it('adjusts inventory quantity as Admin', async () => {
		const response = await request(app.server)
			.put('/api/inventory')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ productId, warehouseId, quantity: 75 });

		expect(response.status).toBe(200);
		expect(response.body.quantity).toBe(75);
	});

	it('returns 422 when adjusting to a negative quantity', async () => {
		const response = await request(app.server)
			.put('/api/inventory')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ productId, warehouseId, quantity: -5 });

		expect(response.status).toBe(422);
	});

	it('returns 404 when adjusting a non-existent product/warehouse pair', async () => {
		const response = await request(app.server)
			.put('/api/inventory')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ productId: randomUUID(), warehouseId: randomUUID(), quantity: 10 });

		expect(response.status).toBe(404);
	});
});
```

Append this test inside the existing `describe('authorization', ...)` block in `tests/integration/authorization.test.ts`, right after the `POST /api/warehouses` case:

```ts
	it('returns 403 for PUT /api/inventory with an Operator token', async () => {
		const response = await request(app.server)
			.put('/api/inventory')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ productId: randomUUID(), warehouseId: randomUUID(), quantity: 10 });

		expect(response.status).toBe(403);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- tests/integration/inventory.test.ts tests/integration/authorization.test.ts`
Expected: FAIL — every `/api/inventory` request returns 404 (no route registered yet).

- [ ] **Step 3: Implement `src/api/schemas/inventory.schema.ts`**

```ts
import { z } from 'zod';

export const adjustInventoryBodySchema = z.object({
	productId: z.uuid(),
	warehouseId: z.uuid(),
	quantity: z.number().int().describe('Absolute quantity to set. Negative values are rejected with 422, not 400.'),
});

export const inventoryResponseSchema = z.object({
	id: z.string(),
	productId: z.string(),
	warehouseId: z.string(),
	quantity: z.number(),
	updatedAt: z.date(),
});
```

- [ ] **Step 4: Implement `src/api/routes/inventory.routes.ts`**

```ts
import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { AdjustInventory } from '../../application/use-cases/inventory/AdjustInventory';
import { GetInventory } from '../../application/use-cases/inventory/GetInventory';
import { PrismaInventoryRepository } from '../../infrastructure/repositories/PrismaInventoryRepository';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { errorResponseSchema } from '../schemas/error.schema';
import { adjustInventoryBodySchema, inventoryResponseSchema } from '../schemas/inventory.schema';

export const inventoryRoutes: FastifyPluginAsyncZod = async (app) => {
	const inventoryRepository = new PrismaInventoryRepository();
	const getInventory = new GetInventory(inventoryRepository);
	const adjustInventory = new AdjustInventory(inventoryRepository);

	app.get(
		'/inventory',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Inventory'],
				summary: 'List all inventory records',
				security: [{ bearerAuth: [] }],
				response: {
					200: inventoryResponseSchema.array(),
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async () => {
			return getInventory.execute();
		},
	);

	app.put(
		'/inventory',
		{
			preHandler: [authenticate, authorize(['Admin'])],
			schema: {
				tags: ['Inventory'],
				summary: 'Adjust inventory quantity',
				security: [{ bearerAuth: [] }],
				body: adjustInventoryBodySchema,
				response: {
					200: inventoryResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					422: errorResponseSchema,
				},
			},
		},
		async (request) => {
			return adjustInventory.execute(request.body);
		},
	);
};
```

- [ ] **Step 5: Modify `src/api/routes/index.ts`**

```ts
import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { authRoutes } from './auth.routes';
import { inventoryRoutes } from './inventory.routes';
import { productsRoutes } from './products.routes';
import { warehousesRoutes } from './warehouses.routes';

export const routes: FastifyPluginAsyncZod = async (app) => {
	await app.register(authRoutes);
	await app.register(productsRoutes);
	await app.register(warehousesRoutes);
	await app.register(inventoryRoutes);
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun run test -- tests/integration/inventory.test.ts tests/integration/authorization.test.ts`
Expected: PASS — 10 tests passed (4 + 6).

- [ ] **Step 7: Run the full test suite to check for regressions**

Run: `bun run test`
Expected: PASS — all tests across all files still pass.

- [ ] **Step 8: Commit**

```bash
git add src/api/schemas/inventory.schema.ts src/api/routes/inventory.routes.ts src/api/routes/index.ts tests/integration/inventory.test.ts tests/integration/authorization.test.ts
git commit -m "feat: add inventory routes"
```

---

## Self-Review

**Spec coverage:**
- PRD §3.3 / PDF "Each inventory record contains" → already covered by plan 1's entity. ✅
- PRD §4.3 / PDF "Inventory quantity cannot be negative" → `AdjustInventory`'s 422 guard. ✅
- PRD §5.4 / PDF API requirements, exact methods/paths/roles → Task 2. ✅
- PRD §9.1 `AdjustInventory` unit test, all 4 cases → Task 1, exact match. ✅
- PRD §9.2 `authorization.test.ts`, final case (`PUT /api/inventory`) → Task 2; **all 6 PRD §9.2 cases now exist** across plans 4–6. ✅

**Placeholder scan:** No TBD/TODO — every step has complete code. ✅

**Type consistency:** `IInventoryRepository`/`Inventory` reused exactly as defined in plan 1 — no renames. `inventoryResponseSchema` mirrors the domain entity field-for-field. `errorResponseSchema` reused from plan 3. ✅

---

## Execution Handoff

Plan complete and saved to `backend/docs/tasks/06-inventory.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
