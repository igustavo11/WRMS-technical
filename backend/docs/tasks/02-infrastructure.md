# Infrastructure & API Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the plumbing every feature route needs — Prisma repository implementations, JWT signing/verification, the global error handler, the `authenticate`/`authorize` middlewares, and a Fastify app factory that is testable via Supertest without `listen()`. No business routes yet.

**Architecture:** `src/infrastructure/repositories` implements the four domain repository interfaces from plan 1 against the shared `prisma` client (`src/infrastructure/database/prisma.ts`). `src/infrastructure/auth/JwtService.ts` wraps `jsonwebtoken` behind a small class so the rest of the app never imports `jsonwebtoken` directly. `src/api/middlewares` holds `authenticate` (populates `request.user` from the JWT) and `authorize` (checks `request.user.role`), both reusing the concrete `DomainError` class for 401/403 — there are no dedicated `UnauthorizedError`/`ForbiddenError` subclasses, by design (see Notes). `src/api/middlewares/errorHandler.ts` is the single `setErrorHandler` registered on the app: maps `DomainError` → its own `statusCode`, Zod validation failures → 400, anything else → 500. `src/app.ts` wires the Zod type provider + error handler into a Fastify instance and returns it unstarted; `src/server.ts` is the only file that calls `.listen()`.

**Tech Stack:** Fastify 5, `@fastify/type-provider-zod` 1.x, Zod 4, `jsonwebtoken` 9, Prisma 7 (`@prisma/client` + `@prisma/adapter-mssql`). Tests via Vitest + Supertest, some hitting the real `wrms_test` SQL Server database (now wired via `.env.test`).

---

## Notes for whoever picks this up

- **JWT library:** `jsonwebtoken` (chosen over `jose`/`@fastify/jwt` — decouples `JwtService` from Fastify, matches the framework-agnostic infra layer the PRD wants). Already installed (`bun add jsonwebtoken` + `bun add -d @types/jsonwebtoken`).
- **`.env.test` gap fixed:** it never existed on disk or in git history, despite `vitest.config.ts` and `tests/setup/global-setup.ts` assuming it does. The `wrms_test` database already existed on the SQL Server container (confirmed via `sqlcmd`) — only the env file was missing. It now exists, pointing `DATABASE_URL` at `wrms_test` with the same SA credentials as `.env`. Without it, every test run silently hit the dev `wrms` database.
- **No new domain error subclasses for auth.** `DomainError` is concrete specifically so call sites can `throw new DomainError(message, code, statusCode)` directly for one-off cases (see plan 1's notes). `authenticate` throws `DomainError('...', 'UNAUTHORIZED', 401)`, `authorize` throws `DomainError('...', 'FORBIDDEN', 403)`. The global error handler treats them exactly like any other `DomainError` — one code path, no special-casing.
- **Prisma repositories get a lightweight integration test even though PRD §9.2 doesn't name a dedicated file for them.** PRD's unit tests mock repositories and its integration tests (`auth`, `reservations`, `authorization`) exercise them only transitively through HTTP in later subsystems. Type-checking alone can't catch a wrong compound-key name or a wrong `increment`/`decrement` shape, so this plan adds `tests/integration/repositories.test.ts` — one happy-path test per repository against the real `wrms_test` database, with manual cleanup. This is the one deliberate deviation from "only what's traceable to a PRD requirement"; flagged here so it's not mistaken for scope creep.
- **`authorization.test.ts` (PRD §9.2) is NOT written in this plan.** Its literal test cases (`POST /api/products` as Operator → 403, etc.) need routes that don't exist until subsystems 4–6. This plan instead proves the `authenticate`/`authorize` middlewares work in isolation, using temporary routes registered inline inside `tests/integration/app.test.ts` (not real business routes). The PRD-literal `authorization.test.ts` gets assembled incrementally as each subsystem's routes land.
- **`buildApp()` has no explicit return type annotation**, despite the project convention of explicit return types. `Fastify().withTypeProvider<ZodTypeProvider>()` returns a precisely-generic-typed instance; annotating the function's return type would mean spelling out `FastifyInstance<RawServerDefault, ..., ZodTypeProvider>` by hand, which is brittle and unreadable for no real benefit. Letting TypeScript infer it is the standard idiom in every Fastify+Zod-type-provider codebase.
- `Reservation.status` is `string` in the Prisma schema (SQL Server has no native enum support — see `database-schema.md`) but `ReservationStatus` in the domain layer is a 3-value string literal union. `PrismaReservationRepository` narrows via `as Reservation`/`as Reservation[]` after awaiting the Prisma call — safe because the domain type is a narrowing of the Prisma type, not an unrelated cast.
- Formatting: tabs, single quotes (matches `biome.json`). `verbatimModuleSyntax` is `true` — type-only imports use `import type`.

---

### Task 1: Prisma Repository Implementations

**Files:**
- Create: `src/infrastructure/repositories/PrismaProductRepository.ts`
- Create: `src/infrastructure/repositories/PrismaWarehouseRepository.ts`
- Create: `src/infrastructure/repositories/PrismaInventoryRepository.ts`
- Create: `src/infrastructure/repositories/PrismaReservationRepository.ts`
- Test: `tests/integration/repositories.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/repositories.test.ts
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/infrastructure/database/prisma';
import { PrismaInventoryRepository } from '../../src/infrastructure/repositories/PrismaInventoryRepository';
import { PrismaProductRepository } from '../../src/infrastructure/repositories/PrismaProductRepository';
import { PrismaReservationRepository } from '../../src/infrastructure/repositories/PrismaReservationRepository';
import { PrismaWarehouseRepository } from '../../src/infrastructure/repositories/PrismaWarehouseRepository';

describe('PrismaProductRepository', () => {
	const repository = new PrismaProductRepository();
	let createdId: string | undefined;

	afterEach(async () => {
		if (createdId) {
			await prisma.product.delete({ where: { id: createdId } });
			createdId = undefined;
		}
	});

	it('creates a product and finds it by id and by sku', async () => {
		const sku = `SKU-${randomUUID()}`;
		const created = await repository.create({ sku, name: 'Test Product' });
		createdId = created.id;

		const byId = await repository.findById(created.id);
		const bySku = await repository.findBySku(sku);

		expect(byId?.sku).toBe(sku);
		expect(bySku?.id).toBe(created.id);
	});
});

describe('PrismaWarehouseRepository', () => {
	const repository = new PrismaWarehouseRepository();
	let createdId: string | undefined;

	afterEach(async () => {
		if (createdId) {
			await prisma.warehouse.delete({ where: { id: createdId } });
			createdId = undefined;
		}
	});

	it('creates a warehouse and finds it by id', async () => {
		const created = await repository.create({ name: `Warehouse-${randomUUID()}`, location: 'SP' });
		createdId = created.id;

		const found = await repository.findById(created.id);

		expect(found?.id).toBe(created.id);
	});
});

describe('PrismaInventoryRepository', () => {
	const productRepository = new PrismaProductRepository();
	const warehouseRepository = new PrismaWarehouseRepository();
	const repository = new PrismaInventoryRepository();
	let productId: string | undefined;
	let warehouseId: string | undefined;
	let inventoryId: string | undefined;

	afterEach(async () => {
		if (inventoryId) {
			await prisma.inventory.delete({ where: { id: inventoryId } });
			inventoryId = undefined;
		}
		if (productId) {
			await prisma.product.delete({ where: { id: productId } });
			productId = undefined;
		}
		if (warehouseId) {
			await prisma.warehouse.delete({ where: { id: warehouseId } });
			warehouseId = undefined;
		}
	});

	it('increments and decrements quantity for a product/warehouse pair', async () => {
		const product = await productRepository.create({ sku: `SKU-${randomUUID()}`, name: 'Inventory Product' });
		const warehouse = await warehouseRepository.create({ name: `Warehouse-${randomUUID()}`, location: 'SP' });
		productId = product.id;
		warehouseId = warehouse.id;

		const created = await prisma.inventory.create({
			data: { productId: product.id, warehouseId: warehouse.id, quantity: 10 },
		});
		inventoryId = created.id;

		const incremented = await repository.incrementQuantity(created.id, 5);
		expect(incremented.quantity).toBe(15);

		const decremented = await repository.decrementQuantity(created.id, 3);
		expect(decremented.quantity).toBe(12);

		const found = await repository.findByProductAndWarehouse(product.id, warehouse.id);
		expect(found?.quantity).toBe(12);
	});
});

describe('PrismaReservationRepository', () => {
	const productRepository = new PrismaProductRepository();
	const warehouseRepository = new PrismaWarehouseRepository();
	const repository = new PrismaReservationRepository();
	let productId: string | undefined;
	let warehouseId: string | undefined;
	let reservationId: string | undefined;

	afterEach(async () => {
		if (reservationId) {
			await prisma.reservation.delete({ where: { id: reservationId } });
			reservationId = undefined;
		}
		if (productId) {
			await prisma.product.delete({ where: { id: productId } });
			productId = undefined;
		}
		if (warehouseId) {
			await prisma.warehouse.delete({ where: { id: warehouseId } });
			warehouseId = undefined;
		}
	});

	it('creates a reservation as Pending, counts it as active, then updates its status', async () => {
		const product = await productRepository.create({ sku: `SKU-${randomUUID()}`, name: 'Reservation Product' });
		const warehouse = await warehouseRepository.create({ name: `Warehouse-${randomUUID()}`, location: 'SP' });
		productId = product.id;
		warehouseId = warehouse.id;

		const countBefore = await repository.countActive();

		const created = await repository.create({ productId: product.id, warehouseId: warehouse.id, quantity: 2 });
		reservationId = created.id;
		expect(created.status).toBe('Pending');

		const countAfterCreate = await repository.countActive();
		expect(countAfterCreate).toBe(countBefore + 1);

		const cancelled = await repository.updateStatus(created.id, 'Cancelled');
		expect(cancelled.status).toBe('Cancelled');

		const countAfterCancel = await repository.countActive();
		expect(countAfterCancel).toBe(countBefore);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/integration/repositories.test.ts`
Expected: FAIL — cannot find module `../../src/infrastructure/repositories/PrismaProductRepository` (none of the 4 files exist yet).

- [ ] **Step 3: Implement `src/infrastructure/repositories/PrismaProductRepository.ts`**

```ts
import type { Product } from '../../domain/entities/Product';
import type {
	CreateProductInput,
	IProductRepository,
	UpdateProductInput,
} from '../../domain/repositories/IProductRepository';
import { prisma } from '../database/prisma';

export class PrismaProductRepository implements IProductRepository {
	async findById(id: string): Promise<Product | null> {
		return prisma.product.findUnique({ where: { id } });
	}

	async findBySku(sku: string): Promise<Product | null> {
		return prisma.product.findUnique({ where: { sku } });
	}

	async findAll(): Promise<Product[]> {
		return prisma.product.findMany();
	}

	async countActive(): Promise<number> {
		return prisma.product.count({ where: { isActive: true } });
	}

	async create(data: CreateProductInput): Promise<Product> {
		return prisma.product.create({ data });
	}

	async update(id: string, data: UpdateProductInput): Promise<Product> {
		return prisma.product.update({ where: { id }, data });
	}
}
```

- [ ] **Step 4: Implement `src/infrastructure/repositories/PrismaWarehouseRepository.ts`**

```ts
import type { Warehouse } from '../../domain/entities/Warehouse';
import type { CreateWarehouseInput, IWarehouseRepository } from '../../domain/repositories/IWarehouseRepository';
import { prisma } from '../database/prisma';

export class PrismaWarehouseRepository implements IWarehouseRepository {
	async findById(id: string): Promise<Warehouse | null> {
		return prisma.warehouse.findUnique({ where: { id } });
	}

	async findAll(): Promise<Warehouse[]> {
		return prisma.warehouse.findMany();
	}

	async create(data: CreateWarehouseInput): Promise<Warehouse> {
		return prisma.warehouse.create({ data });
	}
}
```

- [ ] **Step 5: Implement `src/infrastructure/repositories/PrismaInventoryRepository.ts`**

```ts
import type { Inventory } from '../../domain/entities/Inventory';
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { prisma } from '../database/prisma';

export class PrismaInventoryRepository implements IInventoryRepository {
	async findByProductAndWarehouse(productId: string, warehouseId: string): Promise<Inventory | null> {
		return prisma.inventory.findUnique({
			where: { productId_warehouseId: { productId, warehouseId } },
		});
	}

	async findAll(): Promise<Inventory[]> {
		return prisma.inventory.findMany();
	}

	async update(id: string, quantity: number): Promise<Inventory> {
		return prisma.inventory.update({ where: { id }, data: { quantity } });
	}

	async decrementQuantity(id: string, amount: number): Promise<Inventory> {
		return prisma.inventory.update({ where: { id }, data: { quantity: { decrement: amount } } });
	}

	async incrementQuantity(id: string, amount: number): Promise<Inventory> {
		return prisma.inventory.update({ where: { id }, data: { quantity: { increment: amount } } });
	}

	async sumQuantity(): Promise<number> {
		const result = await prisma.inventory.aggregate({ _sum: { quantity: true } });
		return result._sum.quantity ?? 0;
	}
}
```

- [ ] **Step 6: Implement `src/infrastructure/repositories/PrismaReservationRepository.ts`**

```ts
import type { Reservation, ReservationStatus } from '../../domain/entities/Reservation';
import type {
	CreateReservationInput,
	IReservationRepository,
} from '../../domain/repositories/IReservationRepository';
import { prisma } from '../database/prisma';

export class PrismaReservationRepository implements IReservationRepository {
	async findById(id: string): Promise<Reservation | null> {
		const reservation = await prisma.reservation.findUnique({ where: { id } });
		return reservation as Reservation | null;
	}

	async findAll(): Promise<Reservation[]> {
		const reservations = await prisma.reservation.findMany();
		return reservations as Reservation[];
	}

	async create(data: CreateReservationInput): Promise<Reservation> {
		const reservation = await prisma.reservation.create({
			data: { ...data, status: 'Pending' },
		});
		return reservation as Reservation;
	}

	async updateStatus(id: string, status: ReservationStatus): Promise<Reservation> {
		const reservation = await prisma.reservation.update({ where: { id }, data: { status } });
		return reservation as Reservation;
	}

	async countActive(): Promise<number> {
		return prisma.reservation.count({ where: { status: { in: ['Pending', 'Confirmed'] } } });
	}
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `bun run test -- tests/integration/repositories.test.ts`
Expected: PASS — 4 tests passed. (Hits the real `wrms_test` database — confirm `docker compose ps` shows the SQL Server container `Up` first.)

- [ ] **Step 8: Commit**

```bash
git add src/infrastructure/repositories tests/integration/repositories.test.ts
git commit -m "feat: add Prisma repository implementations"
```

---

### Task 2: JwtService

**Files:**
- Create: `src/infrastructure/auth/JwtService.ts`
- Test: `tests/unit/infrastructure/JwtService.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/infrastructure/JwtService.test.ts
import { describe, expect, it } from 'vitest';
import { JwtService } from '../../../src/infrastructure/auth/JwtService';

describe('JwtService', () => {
	it('signs a payload and verifies it back to the same payload', () => {
		const service = new JwtService('test-secret', '1h');
		const payload = { sub: 'user-1', email: 'admin@wrms.com', role: 'Admin' as const };

		const token = service.sign(payload);
		const decoded = service.verify(token);

		expect(decoded.sub).toBe(payload.sub);
		expect(decoded.email).toBe(payload.email);
		expect(decoded.role).toBe(payload.role);
	});

	it('throws when verifying a token signed with a different secret', () => {
		const signer = new JwtService('secret-a', '1h');
		const verifier = new JwtService('secret-b', '1h');
		const token = signer.sign({ sub: 'user-1', email: 'admin@wrms.com', role: 'Admin' });

		expect(() => verifier.verify(token)).toThrow();
	});

	it('throws when verifying a malformed token', () => {
		const service = new JwtService('test-secret', '1h');

		expect(() => service.verify('not-a-valid-token')).toThrow();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/unit/infrastructure/JwtService.test.ts`
Expected: FAIL — cannot find module `../../../src/infrastructure/auth/JwtService`.

- [ ] **Step 3: Implement `src/infrastructure/auth/JwtService.ts`**

```ts
import jwt, { type SignOptions } from 'jsonwebtoken';

export type AuthTokenPayload = {
	sub: string;
	email: string;
	role: 'Admin' | 'Operator';
};

export class JwtService {
	constructor(
		private readonly secret: string,
		private readonly expiresIn: string,
	) {}

	sign(payload: AuthTokenPayload): string {
		return jwt.sign(payload, this.secret, {
			expiresIn: this.expiresIn as SignOptions['expiresIn'],
		});
	}

	verify(token: string): AuthTokenPayload {
		return jwt.verify(token, this.secret) as AuthTokenPayload;
	}
}

export const jwtService = new JwtService(process.env.JWT_SECRET as string, process.env.JWT_EXPIRES_IN as string);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- tests/unit/infrastructure/JwtService.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/auth tests/unit/infrastructure/JwtService.test.ts
git commit -m "feat: add JwtService"
```

---

### Task 3: Global Error Handler + Fastify App Factory

**Files:**
- Create: `src/api/middlewares/errorHandler.ts`
- Create: `src/app.ts`
- Test: `tests/integration/app.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/app.test.ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildApp } from '../../src/app';
import { NotFoundError } from '../../src/domain/errors/NotFoundError';

function buildTestApp() {
	const app = buildApp();

	app.get('/throws-domain-error', async () => {
		throw new NotFoundError('Product');
	});

	app.get('/throws-unknown-error', async () => {
		throw new Error('boom');
	});

	app.post('/validated', { schema: { body: z.object({ name: z.string() }) } }, async (httpRequest) => {
		return httpRequest.body;
	});

	return app;
}

describe('errorHandler', () => {
	it('maps a DomainError to its statusCode and code', async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server).get('/throws-domain-error');

		expect(response.status).toBe(404);
		expect(response.body).toEqual({
			error: 'NOT_FOUND',
			message: 'Product not found.',
			statusCode: 404,
		});
	});

	it('maps a Zod validation failure to 400', async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server).post('/validated').send({});

		expect(response.status).toBe(400);
		expect(response.body.statusCode).toBe(400);
	});

	it('maps an unknown error to 500', async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server).get('/throws-unknown-error');

		expect(response.status).toBe(500);
		expect(response.body).toEqual({
			error: 'INTERNAL_SERVER_ERROR',
			message: 'An unexpected error occurred.',
			statusCode: 500,
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/integration/app.test.ts`
Expected: FAIL — cannot find module `../../src/app`.

- [ ] **Step 3: Implement `src/api/middlewares/errorHandler.ts`**

```ts
import { hasZodFastifySchemaValidationErrors } from '@fastify/type-provider-zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../../domain/errors/DomainError';

export function errorHandler(error: unknown, request: FastifyRequest, reply: FastifyReply): void {
	if (error instanceof DomainError) {
		reply.status(error.statusCode).send({
			error: error.code,
			message: error.message,
			statusCode: error.statusCode,
		});
		return;
	}

	if (hasZodFastifySchemaValidationErrors(error)) {
		const message = error.validation.map((issue) => issue.message).join('; ');

		reply.status(400).send({
			error: 'VALIDATION_ERROR',
			message,
			statusCode: 400,
		});
		return;
	}

	request.log.error(error);

	reply.status(500).send({
		error: 'INTERNAL_SERVER_ERROR',
		message: 'An unexpected error occurred.',
		statusCode: 500,
	});
}
```

- [ ] **Step 4: Implement `src/app.ts`**

```ts
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from '@fastify/type-provider-zod';
import Fastify from 'fastify';
import { errorHandler } from './api/middlewares/errorHandler';

export function buildApp() {
	const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);
	app.setErrorHandler(errorHandler);

	return app;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test -- tests/integration/app.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 6: Commit**

```bash
git add src/api/middlewares/errorHandler.ts src/app.ts tests/integration/app.test.ts
git commit -m "feat: add global error handler and Fastify app factory"
```

---

### Task 4: Authenticate + Authorize Middlewares

**Files:**
- Create: `src/api/middlewares/authenticate.ts`
- Create: `src/api/middlewares/authorize.ts`
- Modify: `tests/integration/app.test.ts` (append two `describe` blocks)

- [ ] **Step 1: Append the failing test to `tests/integration/app.test.ts`**

Add these imports to the top of the file:

```ts
import { authenticate } from '../../src/api/middlewares/authenticate';
import { authorize } from '../../src/api/middlewares/authorize';
import { jwtService } from '../../src/infrastructure/auth/JwtService';
```

Add this route inside `buildTestApp()`, after the existing routes:

```ts
	app.get('/admin-only', { preHandler: [authenticate, authorize(['Admin'])] }, async (httpRequest) => {
		return { user: httpRequest.user };
	});
```

Append these `describe` blocks at the end of the file:

```ts
describe('authenticate', () => {
	it('returns 401 when the Authorization header is missing', async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server).get('/admin-only');

		expect(response.status).toBe(401);
	});

	it('returns 401 when the token is invalid', async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server).get('/admin-only').set('Authorization', 'Bearer not-a-real-token');

		expect(response.status).toBe(401);
	});
});

describe('authorize', () => {
	it('returns 403 when the role is not allowed', async () => {
		const app = buildTestApp();
		await app.ready();
		const token = jwtService.sign({ sub: 'user-1', email: 'operator@wrms.com', role: 'Operator' });

		const response = await request(app.server).get('/admin-only').set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(403);
	});

	it('returns 200 when the role is allowed', async () => {
		const app = buildTestApp();
		await app.ready();
		const token = jwtService.sign({ sub: 'user-1', email: 'admin@wrms.com', role: 'Admin' });

		const response = await request(app.server).get('/admin-only').set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/integration/app.test.ts`
Expected: FAIL — cannot find module `../../src/api/middlewares/authenticate`.

- [ ] **Step 3: Implement `src/api/middlewares/authenticate.ts`**

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../../domain/errors/DomainError';
import type { AuthTokenPayload } from '../../infrastructure/auth/JwtService';
import { jwtService } from '../../infrastructure/auth/JwtService';

declare module 'fastify' {
	interface FastifyRequest {
		user?: AuthTokenPayload;
	}
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
	const authorization = request.headers.authorization;

	if (!authorization?.startsWith('Bearer ')) {
		throw new DomainError('Missing or invalid authentication token.', 'UNAUTHORIZED', 401);
	}

	const token = authorization.slice('Bearer '.length);

	try {
		request.user = jwtService.verify(token);
	} catch {
		throw new DomainError('Missing or invalid authentication token.', 'UNAUTHORIZED', 401);
	}
}
```

- [ ] **Step 4: Implement `src/api/middlewares/authorize.ts`**

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../../domain/errors/DomainError';
import type { AuthTokenPayload } from '../../infrastructure/auth/JwtService';

export function authorize(allowedRoles: AuthTokenPayload['role'][]) {
	return async function authorizeHandler(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
		const role = request.user?.role;

		if (!role || !allowedRoles.includes(role)) {
			throw new DomainError('Insufficient permissions.', 'FORBIDDEN', 403);
		}
	};
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test -- tests/integration/app.test.ts`
Expected: PASS — 7 tests passed.

- [ ] **Step 6: Commit**

```bash
git add src/api/middlewares/authenticate.ts src/api/middlewares/authorize.ts tests/integration/app.test.ts
git commit -m "feat: add authenticate and authorize middlewares"
```

---

### Task 5: Wire Up the Real Entry Point

**Files:**
- Modify: `src/server.ts`

This is the only task with no test — it is 4 lines of bootstrap code with no business logic, calling `buildApp()` (already tested in Task 3) and Fastify's own `.listen()` (already tested by the framework itself).

- [ ] **Step 1: Replace `src/server.ts`**

```ts
import { buildApp } from './app';

const app = buildApp();
const port = Number(process.env.PORT ?? 3333);

app.listen({ port, host: '0.0.0.0' }, (error, address) => {
	if (error) {
		app.log.error(error);
		process.exit(1);
	}

	app.log.info(`Server listening at ${address}`);
});
```

- [ ] **Step 2: Verify it boots**

Run: `bun run dev`
Expected: log line `Server listening at http://0.0.0.0:3333`, process stays up. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/server.ts
git commit -m "feat: wire up the Fastify entry point"
```

---

## Self-Review

**Spec coverage:**
- PRD §7.1 `infrastructure/repositories`, `infrastructure/auth/JwtService.ts` → Tasks 1–2, exact file names. ✅
- PRD §7.1 `api/middlewares/authenticate.ts`, `authorize.ts`, `errorHandler.ts` → Tasks 3–4, exact file names. ✅
- PRD §7.2 request flow (`authenticate → authorize → use case → repository → errorHandler`) → proven end-to-end in `tests/integration/app.test.ts` using temporary routes, since no use cases exist yet. ✅
- PRD §13 checklist "Middleware de autenticação (401) e autorização (403)" and "Global error handler mapeando DomainErrors para HTTP status" → Tasks 3–4. ✅
- PRD §13 checklist "JWT Auth com roles" → Task 2 (`JwtService`); the login route itself is plan 3's job. ✅
- Overview.md subsystem 2 description (Fastify app factory testable without `listen()`, Zod type provider wiring, Prisma repos, JwtService) → all five pieces present. ✅

**Placeholder scan:** No TBD/TODO, no "add appropriate error handling" — every step has complete code. ✅

**Type consistency:** `AuthTokenPayload` defined once in `JwtService.ts`, imported via `import type` everywhere else. `IProductRepository`/`IWarehouseRepository`/`IInventoryRepository`/`IReservationRepository` method names match plan 1 exactly — no renames. `DomainError` reused as-is, no new subclasses introduced. ✅

**Known deviation (documented above in Notes):** `tests/integration/repositories.test.ts` is not named anywhere in the PRD; added deliberately for risk reduction on DB-touching code that type-checking can't fully verify.

---

## Execution Handoff

Plan complete and saved to `backend/docs/tasks/02-infrastructure.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
