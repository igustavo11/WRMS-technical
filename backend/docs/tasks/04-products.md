# Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Products subsystem — `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PUT /api/products/:id` — all Admin-only. First subsystem to reuse every piece of plumbing built in plans 2–3 (`authenticate`, `authorize`, `errorHandler`, the Zod+Swagger setup, the route aggregator) without adding any new infra.

**Architecture:** Same layering as Auth: `application/use-cases/products/{CreateProduct,UpdateProduct,GetProducts,GetProductById}.ts` orchestrate business rules against `IProductRepository` (domain interface, already built in plan 1) → `PrismaProductRepository` (already built in plan 2, untouched here) → `api/routes/products.routes.ts` (Zod-validated, Swagger-documented, `Admin`-only via `authorize(['Admin'])`) → registered in the existing `api/routes/index.ts` aggregator.

**Tech Stack:** Same as plans 2–3 — Fastify, Zod, `@fastify/type-provider-zod`. No new dependencies.

---

## Notes for whoever picks this up

- **`GetProductById` is not in PRD §7.1's file tree** (only `CreateProduct.ts`, `UpdateProduct.ts`, `GetProducts.ts` are listed under `use-cases/products/`), but `GET /api/products/:id` needs *something* to find-or-404. Same situation as `Login`/`IUserRepository` in plan 3 — added for consistency with the layered pattern used everywhere else, not a new precedent.
- **`CreateProduct` re-validates non-empty `sku`/`name` itself, even though the Zod body schema already rejects empty strings with 400 at the HTTP boundary.** This looks redundant, but it's required: PRD §9.1 explicitly lists "lança erro de validação quando SKU está vazio" / "quando Nome está vazio" as **unit tests that call the use case directly**, bypassing Zod/HTTP entirely. Without the use case's own guard clause, that test would have nothing to assert. Uses the same `throw new DomainError(message, 'VALIDATION_ERROR', 400)` one-off pattern as everywhere else — no new error subclass.
- **`UpdateProduct`, `GetProducts`, `GetProductById` have no dedicated unit test.** PRD §9.1's unit test list only names `CreateProduct` for this subsystem. They're exercised by `tests/integration/products.test.ts` instead (see next point).
- **`tests/integration/products.test.ts` is not named anywhere in the PRD** — same deliberate deviation as plan 2's `repositories.test.ts`. The `CreateProduct` unit test mocks the repository (proves business logic, not wiring); the `authorization.test.ts` cases below only check 403/401. Nothing yet proves the real route → real `PrismaProductRepository` → real SQL Server path works end-to-end, so this plan adds one small integration test file for that.
- **This is where `tests/integration/authorization.test.ts` (PRD §9.2) actually gets created.** Plan 3's notes flagged that this file couldn't be written until real business routes existed. PRD's full list for this file has 6 cases; this plan covers the 3 that involve products plus the generic "no token" case:
  - ✅ `POST /api/products` com token Operator → 403
  - ✅ `PUT /api/products/:id` com token Operator → 403
  - ✅ `GET /api/products` com token Operator → 403
  - ✅ qualquer rota sem token → 401
  - ⏳ `POST /api/warehouses` com token Operator → 403 — added in plan 5
  - ⏳ `PUT /api/inventory` com token Operator → 403 — added in plan 6
- **`tests/unit/CreateProduct.test.ts` is flat, not nested under `tests/unit/application/products/`** — unlike `domain/errors.test.ts` or `infrastructure/JwtService.test.ts` (plans 1–2), where the path was my own choice since the PRD didn't name them, PRD §7.1 explicitly shows `tests/unit/CreateProduct.test.ts` flat. Matching it exactly here.
- **`z.string().email()`/`z.string().uuid()` are deprecated in this Zod version** (confirmed in plan 3 for email; same applies to uuid — verified directly in `node_modules/zod`). `productIdParamsSchema` uses the standalone `z.uuid()`, not `z.string().uuid()`.
- **No `422` for any product endpoint.** PRD §4.1 only calls out `409` (duplicate SKU) as product-specific; `422` business-rule violations are an inventory/reservation concern (plans 6–7), not products.
- **`sku` is absent from `UpdateProductInput`** (locked in back in plan 1 — `Partial<{name, description, isActive}>`), so SKU can never be changed via `PUT`. `UpdateProduct` never re-checks SKU uniqueness.
- Formatting: tabs, single quotes (matches `biome.json`). `verbatimModuleSyntax` is `true` — type-only imports use `import type`.

---

### Task 1: Product Use Cases

**Files:**
- Create: `src/application/use-cases/products/CreateProduct.ts`
- Create: `src/application/use-cases/products/UpdateProduct.ts`
- Create: `src/application/use-cases/products/GetProducts.ts`
- Create: `src/application/use-cases/products/GetProductById.ts`
- Test: `tests/unit/CreateProduct.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/CreateProduct.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateProduct } from '../../src/application/use-cases/products/CreateProduct';
import { DomainError } from '../../src/domain/errors/DomainError';
import { DuplicateSkuError } from '../../src/domain/errors/DuplicateSkuError';
import type { Product } from '../../src/domain/entities/Product';
import type { IProductRepository } from '../../src/domain/repositories/IProductRepository';

function buildProduct(overrides: Partial<Product> = {}): Product {
	return {
		id: 'product-1',
		sku: 'SKU-001',
		name: 'Product A',
		description: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function buildRepository(): IProductRepository {
	return {
		findById: vi.fn(),
		findBySku: vi.fn(),
		findAll: vi.fn(),
		countActive: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	};
}

describe('CreateProduct', () => {
	let repository: IProductRepository;
	let createProduct: CreateProduct;

	beforeEach(() => {
		repository = buildRepository();
		createProduct = new CreateProduct(repository);
	});

	it('creates a product with valid data', async () => {
		vi.mocked(repository.findBySku).mockResolvedValue(null);
		vi.mocked(repository.create).mockResolvedValue(buildProduct());

		const result = await createProduct.execute({ sku: 'SKU-001', name: 'Product A' });

		expect(result.sku).toBe('SKU-001');
		expect(repository.create).toHaveBeenCalledWith({ sku: 'SKU-001', name: 'Product A' });
	});

	it('throws DuplicateSkuError when the SKU already exists', async () => {
		vi.mocked(repository.findBySku).mockResolvedValue(buildProduct());

		await expect(createProduct.execute({ sku: 'SKU-001', name: 'Product A' })).rejects.toThrow(DuplicateSkuError);
	});

	it('throws a validation error when SKU is empty', async () => {
		await expect(createProduct.execute({ sku: '', name: 'Product A' })).rejects.toThrow(DomainError);
		expect(repository.findBySku).not.toHaveBeenCalled();
	});

	it('throws a validation error when name is empty', async () => {
		await expect(createProduct.execute({ sku: 'SKU-001', name: '' })).rejects.toThrow(DomainError);
		expect(repository.findBySku).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/unit/CreateProduct.test.ts`
Expected: FAIL — cannot find module `../../src/application/use-cases/products/CreateProduct`.

- [ ] **Step 3: Implement `src/application/use-cases/products/CreateProduct.ts`**

```ts
import type { Product } from '../../../domain/entities/Product';
import { DomainError } from '../../../domain/errors/DomainError';
import { DuplicateSkuError } from '../../../domain/errors/DuplicateSkuError';
import type { CreateProductInput, IProductRepository } from '../../../domain/repositories/IProductRepository';

export class CreateProduct {
	constructor(private readonly productRepository: IProductRepository) {}

	async execute(input: CreateProductInput): Promise<Product> {
		if (!input.sku.trim()) {
			throw new DomainError('SKU is required.', 'VALIDATION_ERROR', 400);
		}

		if (!input.name.trim()) {
			throw new DomainError('Name is required.', 'VALIDATION_ERROR', 400);
		}

		const existing = await this.productRepository.findBySku(input.sku);

		if (existing) {
			throw new DuplicateSkuError(input.sku);
		}

		return this.productRepository.create(input);
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- tests/unit/CreateProduct.test.ts`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Implement `src/application/use-cases/products/UpdateProduct.ts`**

```ts
import type { Product } from '../../../domain/entities/Product';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import type { IProductRepository, UpdateProductInput } from '../../../domain/repositories/IProductRepository';

export class UpdateProduct {
	constructor(private readonly productRepository: IProductRepository) {}

	async execute(id: string, data: UpdateProductInput): Promise<Product> {
		const existing = await this.productRepository.findById(id);

		if (!existing) {
			throw new NotFoundError('Product');
		}

		return this.productRepository.update(id, data);
	}
}
```

- [ ] **Step 6: Implement `src/application/use-cases/products/GetProducts.ts`**

```ts
import type { Product } from '../../../domain/entities/Product';
import type { IProductRepository } from '../../../domain/repositories/IProductRepository';

export class GetProducts {
	constructor(private readonly productRepository: IProductRepository) {}

	async execute(): Promise<Product[]> {
		return this.productRepository.findAll();
	}
}
```

- [ ] **Step 7: Implement `src/application/use-cases/products/GetProductById.ts`**

```ts
import type { Product } from '../../../domain/entities/Product';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import type { IProductRepository } from '../../../domain/repositories/IProductRepository';

export class GetProductById {
	constructor(private readonly productRepository: IProductRepository) {}

	async execute(id: string): Promise<Product> {
		const product = await this.productRepository.findById(id);

		if (!product) {
			throw new NotFoundError('Product');
		}

		return product;
	}
}
```

- [ ] **Step 8: Verify the project still type-checks**

Run: `bunx tsc -p tsconfig.json`
Expected: exits with code 0, no output.

- [ ] **Step 9: Commit**

```bash
git add src/application/use-cases/products tests/unit/CreateProduct.test.ts
git commit -m "feat: add product use cases"
```

---

### Task 2: Products Route

**Files:**
- Create: `src/api/schemas/product.schema.ts`
- Create: `src/api/routes/products.routes.ts`
- Modify: `src/api/routes/index.ts`
- Test: `tests/integration/products.test.ts`
- Test: `tests/integration/authorization.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/integration/products.test.ts
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';
import { prisma } from '../../src/infrastructure/database/prisma';

const app = buildApp();
const adminToken = jwtService.sign({ sub: randomUUID(), email: 'admin@wrms.com', role: 'Admin' });
let createdId: string | undefined;

beforeAll(async () => {
	await app.ready();
});

afterAll(async () => {
	if (createdId) {
		await prisma.product.delete({ where: { id: createdId } });
	}
});

describe('products', () => {
	it('creates a product, lists it, fetches it by id and updates it', async () => {
		const sku = `SKU-${randomUUID()}`;

		const createResponse = await request(app.server)
			.post('/api/products')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ sku, name: 'Integration Product' });

		expect(createResponse.status).toBe(201);
		createdId = createResponse.body.id;

		const listResponse = await request(app.server)
			.get('/api/products')
			.set('Authorization', `Bearer ${adminToken}`);

		expect(listResponse.status).toBe(200);
		expect(listResponse.body.some((product: { id: string }) => product.id === createdId)).toBe(true);

		const getResponse = await request(app.server)
			.get(`/api/products/${createdId}`)
			.set('Authorization', `Bearer ${adminToken}`);

		expect(getResponse.status).toBe(200);
		expect(getResponse.body.sku).toBe(sku);

		const updateResponse = await request(app.server)
			.put(`/api/products/${createdId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ isActive: false });

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body.isActive).toBe(false);
	});

	it('returns 409 when creating a product with a duplicate SKU', async () => {
		const sku = `SKU-${randomUUID()}`;

		const firstResponse = await request(app.server)
			.post('/api/products')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ sku, name: 'First' });
		const firstId = firstResponse.body.id;

		const duplicateResponse = await request(app.server)
			.post('/api/products')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ sku, name: 'Duplicate' });

		expect(duplicateResponse.status).toBe(409);

		await prisma.product.delete({ where: { id: firstId } });
	});

	it('returns 404 when fetching a non-existent product', async () => {
		const response = await request(app.server)
			.get(`/api/products/${randomUUID()}`)
			.set('Authorization', `Bearer ${adminToken}`);

		expect(response.status).toBe(404);
	});
});
```

```ts
// tests/integration/authorization.test.ts
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';

const app = buildApp();
const operatorToken = jwtService.sign({ sub: randomUUID(), email: 'operator@wrms.com', role: 'Operator' });

beforeAll(async () => {
	await app.ready();
});

describe('authorization', () => {
	it('returns 403 for POST /api/products with an Operator token', async () => {
		const response = await request(app.server)
			.post('/api/products')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ sku: 'SKU-999', name: 'Should not be created' });

		expect(response.status).toBe(403);
	});

	it('returns 403 for PUT /api/products/:id with an Operator token', async () => {
		const response = await request(app.server)
			.put(`/api/products/${randomUUID()}`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ name: 'Should not update' });

		expect(response.status).toBe(403);
	});

	it('returns 403 for GET /api/products with an Operator token', async () => {
		const response = await request(app.server)
			.get('/api/products')
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(403);
	});

	it('returns 401 for any route without a token', async () => {
		const response = await request(app.server).get('/api/products');

		expect(response.status).toBe(401);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test -- tests/integration/products.test.ts tests/integration/authorization.test.ts`
Expected: FAIL — every request returns 404 (no `/api/products*` route registered yet).

- [ ] **Step 3: Implement `src/api/schemas/product.schema.ts`**

```ts
import { z } from 'zod';

export const productIdParamsSchema = z.object({
	id: z.uuid(),
});

export const createProductBodySchema = z.object({
	sku: z.string().min(1).describe('Unique product SKU'),
	name: z.string().min(1).describe('Product name'),
	description: z.string().nullish().describe('Optional product description'),
	isActive: z.boolean().optional().describe('Whether the product is active'),
});

export const updateProductBodySchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().nullable().optional(),
	isActive: z.boolean().optional(),
});

export const productResponseSchema = z.object({
	id: z.string(),
	sku: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});
```

- [ ] **Step 4: Implement `src/api/routes/products.routes.ts`**

```ts
import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { CreateProduct } from '../../application/use-cases/products/CreateProduct';
import { GetProductById } from '../../application/use-cases/products/GetProductById';
import { GetProducts } from '../../application/use-cases/products/GetProducts';
import { UpdateProduct } from '../../application/use-cases/products/UpdateProduct';
import { PrismaProductRepository } from '../../infrastructure/repositories/PrismaProductRepository';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { errorResponseSchema } from '../schemas/error.schema';
import {
	createProductBodySchema,
	productIdParamsSchema,
	productResponseSchema,
	updateProductBodySchema,
} from '../schemas/product.schema';

export const productsRoutes: FastifyPluginAsyncZod = async (app) => {
	const productRepository = new PrismaProductRepository();
	const createProduct = new CreateProduct(productRepository);
	const updateProduct = new UpdateProduct(productRepository);
	const getProducts = new GetProducts(productRepository);
	const getProductById = new GetProductById(productRepository);

	app.get(
		'/products',
		{
			preHandler: [authenticate, authorize(['Admin'])],
			schema: {
				tags: ['Products'],
				summary: 'List all products',
				security: [{ bearerAuth: [] }],
				response: {
					200: productResponseSchema.array(),
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async () => {
			return getProducts.execute();
		},
	);

	app.get(
		'/products/:id',
		{
			preHandler: [authenticate, authorize(['Admin'])],
			schema: {
				tags: ['Products'],
				summary: 'Get a product by id',
				security: [{ bearerAuth: [] }],
				params: productIdParamsSchema,
				response: {
					200: productResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
				},
			},
		},
		async (request) => {
			return getProductById.execute(request.params.id);
		},
	);

	app.post(
		'/products',
		{
			preHandler: [authenticate, authorize(['Admin'])],
			schema: {
				tags: ['Products'],
				summary: 'Create a product',
				security: [{ bearerAuth: [] }],
				body: createProductBodySchema,
				response: {
					201: productResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					409: errorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await createProduct.execute(request.body);
			reply.status(201).send(result);
		},
	);

	app.put(
		'/products/:id',
		{
			preHandler: [authenticate, authorize(['Admin'])],
			schema: {
				tags: ['Products'],
				summary: 'Update a product',
				security: [{ bearerAuth: [] }],
				params: productIdParamsSchema,
				body: updateProductBodySchema,
				response: {
					200: productResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
				},
			},
		},
		async (request) => {
			return updateProduct.execute(request.params.id, request.body);
		},
	);
};
```

- [ ] **Step 5: Modify `src/api/routes/index.ts`**

```ts
import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { authRoutes } from './auth.routes';
import { productsRoutes } from './products.routes';

export const routes: FastifyPluginAsyncZod = async (app) => {
	await app.register(authRoutes);
	await app.register(productsRoutes);
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun run test -- tests/integration/products.test.ts tests/integration/authorization.test.ts`
Expected: PASS — 7 tests passed (3 + 4).

- [ ] **Step 7: Run the full test suite to check for regressions**

Run: `bun run test`
Expected: PASS — all tests across all files still pass.

- [ ] **Step 8: Commit**

```bash
git add src/api/schemas/product.schema.ts src/api/routes/products.routes.ts src/api/routes/index.ts tests/integration/products.test.ts tests/integration/authorization.test.ts
git commit -m "feat: add products routes"
```

---

## Self-Review

**Spec coverage:**
- PRD §3.1 `Product` fields → already covered by plan 1's entity; this plan only adds behavior on top. ✅
- PRD §4.1 "SKU deve ser único... Duplicata retorna 409" → `CreateProduct` + `DuplicateSkuError`. ✅
- PRD §4.1 "Produto pode ser editado mesmo se inativo" → `UpdateProduct` has no active/inactive guard, just existence + update. ✅
- PRD §5.2 all 4 routes, exact methods/paths/roles → Task 2. ✅
- PRD §9.1 `CreateProduct` unit test, all 4 cases → Task 1, exact match. ✅
- PRD §9.2 `authorization.test.ts`, the 3 products-related cases + generic no-token case → Task 2 (remaining 2 cases deferred to plans 5–6, documented above). ✅
- PRD §13 "Use cases implementados com todas as regras de negócio" (products slice) → Task 1. ✅

**Placeholder scan:** No TBD/TODO, no "add appropriate error handling" — every step has complete code. ✅

**Type consistency:** `IProductRepository`/`CreateProductInput`/`UpdateProductInput` reused exactly as defined in plan 1 — no renames, no redefinition. `productResponseSchema` mirrors the `Product` domain entity field-for-field. `errorResponseSchema` reused from plan 3, not redefined. ✅

---

## Execution Handoff

Plan complete and saved to `backend/docs/tasks/04-products.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
