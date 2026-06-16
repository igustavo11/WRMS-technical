# Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the most critical subsystem in the PRD — `GET /api/reservations`, `POST /api/reservations`, `PUT /api/reservations/:id/cancel` (all Admin + Operator) — with the transaction + row-level lock PRD §4.4 and §13 explicitly require for `CreateReservation` and `CancelReservation`.

**Architecture:** This is the first subsystem where a single use case must touch four repositories (`Product`, `Warehouse`, `Inventory`, `Reservation`) atomically. That doesn't fit the "one use case, one injected repository" shape every prior plan used, so this plan introduces a **Unit of Work** (`IUnitOfWork`, domain layer) — the only structural addition to the architecture in this plan. `application/use-cases/reservations/{CreateReservation,CancelReservation}.ts` depend on `IUnitOfWork` instead of individual repositories; `GetReservations.ts` is a plain read and keeps depending on `IReservationRepository` directly, same as every other `GetX` use case so far.

**Tech Stack:** Same as plans 2–6 — Fastify, Zod, `@fastify/type-provider-zod`, Prisma. No new npm dependencies — this plan uses Prisma's own interactive transaction API (`$transaction` with `isolationLevel`), not a new library.

---

## Notes for whoever picks this up

**This plan was grilled with the project owner before being written — every decision below was an explicit choice, not a unilateral call. Researched against Prisma's own docs (via Context7) before presenting options, not from memory.**

- **Row-level lock = `prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })`, not raw SQL.** Two options were on the table: (a) this one, or (b) raw `$queryRaw` with a SQL Server `WITH (UPDLOCK, ROWLOCK)` table hint. Chose (a). `SERIALIZABLE` on SQL Server is implemented via real row/key-range locks, not optimistic conflict detection — so it satisfies "row-level lock" in practice, not just in name. It's also Prisma's own documented pattern for exactly this "check stock, then act" race condition (confirmed directly in Prisma's test suite/docs, not assumed). Raw SQL would have been the more literal reading of "row-level lock," but the project's own convention ("never write raw SQL unless Prisma can't handle it") doesn't apply here — Prisma *can* handle it, just via isolation level rather than a table hint.
- **Prisma repository constructors now accept an optional client** (`PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient`, defaulting to the shared singleton). This is the only change to the four already-built Prisma repository classes (`PrismaProductRepository`, `PrismaWarehouseRepository`, `PrismaInventoryRepository`, `PrismaReservationRepository`) — **no domain interface changes**. Every route built in plans 4–6 still does `new PrismaProductRepository()` with no argument and gets the exact same singleton-bound behavior as before; nothing about them needed to change.
- **`IUnitOfWork.run(fn)` opens the transaction, constructs all four repositories bound to that transaction's client, and hands them to `fn`.** It retries up to **3 times total** on Prisma error `P2034` (write conflict / deadlock — Prisma's own code for exactly this kind of serialization failure), with **no delay between retries** (matches Prisma's own example; conflicts here are expected to be transient). If all 3 attempts fail, the error propagates to the global `errorHandler` → 500. Prisma's default `maxWait`/`timeout` (2s/5s) are left as-is — no load profile in the PRD justifies tuning them.
- **This Unit of Work is scoped specifically to what `CreateReservation`/`CancelReservation` need** (`productRepository`, `warehouseRepository`, `inventoryRepository`, `reservationRepository` — see `ReservationRepositories` type), not a generic catch-all reused everywhere. No other use case in this PRD needs a cross-repository transaction (Dashboard, plan 8, is read-only aggregation).
- **`CreateReservation`'s `quantity <= 0` check happens *before* `unitOfWork.run(...)` is even called**, not inside the transaction — it needs no database access, so there's no reason to open a transaction just to fail immediately. It throws the generic `DomainError('...', 'VALIDATION_ERROR', 400)` directly, deliberately duplicating what the Zod body schema (`min(1)`) already checks at the HTTP boundary — same reasoning as `CreateProduct` in plan 4: PRD §9.1 wants a unit test that calls the use case directly, bypassing Zod entirely, so the use case needs its own guard for that test to mean anything.
- **Unit tests mock `IUnitOfWork` by making `run()` immediately invoke its callback with the mocked repositories** (`run: vi.fn((fn) => fn(repositories))`) — no real transaction, no retry logic exercised. This isolates what the unit test is actually checking (the business rules in `CreateReservation`/`CancelReservation`) from the transaction *mechanism*, which is instead proven for real by `tests/integration/reservations.test.ts` against the real database.
- **`tests/unit/CreateReservation.test.ts` and `tests/unit/CancelReservation.test.ts` are flat**, not nested under `tests/unit/application/reservations/` — PRD §7.1 names these exact flat paths, same precedent as `CreateProduct.test.ts` (plan 4) and `AdjustInventory.test.ts` (plan 6).
- **No new cases added to `tests/integration/authorization.test.ts` in this plan.** PRD §9.2's literal list for that file has no reservation-related case — every reservation action (`GET`/`POST`/`PUT .../cancel`) is open to both `Admin` and `Operator`, so there's no 403 to test. All 6 of that file's cases were already completed by plan 6.
- **`POST /api/reservations` returns `201`** (PRD §5.7: "Criado com sucesso | 201"). **`PUT /api/reservations/:id/cancel` returns `200`** (PRD §9.2 literally: "→ 200 + inventário restaurado").
- **No `GetReservationById` use case** — PRD §5.5 lists only `GET /api/reservations` (list), `POST /api/reservations`, `PUT /api/reservations/:id/cancel`. No `GET /api/reservations/:id` route exists in either the PRD or the original PDF, unlike the gap Products had.
- **Cross-checked against both the PRD and the original PDF before writing this plan.** Both agree on the 3 routes, the 3 reservation statuses, "inventory cannot be over-reserved," and "cancelling must restore inventory." The PDF's Operator-permissions bullet list happens to omit "view reservation history" explicitly, but its Functional Requirements section grants reservation viewing generically to all users, and PRD §5.5/§6 resolve this exactly the way `00-overview.md` already described this subsystem (Admin + Operator on every reservation route) — no contradiction found.
- Formatting: tabs, single quotes (matches `biome.json`). `verbatimModuleSyntax` is `true` — type-only imports use `import type`.

---

### Task 1: Unit of Work Infrastructure

**Files:**
- Modify: `src/infrastructure/database/prisma.ts`
- Modify: `src/infrastructure/repositories/PrismaProductRepository.ts`
- Modify: `src/infrastructure/repositories/PrismaWarehouseRepository.ts`
- Modify: `src/infrastructure/repositories/PrismaInventoryRepository.ts`
- Modify: `src/infrastructure/repositories/PrismaReservationRepository.ts`
- Create: `src/domain/repositories/IUnitOfWork.ts`
- Create: `src/infrastructure/database/PrismaUnitOfWork.ts`

No new test in this task — it's a non-breaking refactor of already-tested infrastructure (every method's behavior is unchanged; only *which* client instance each method uses is now configurable). Verified by type-check plus a full regression run of the existing 51 tests.

- [ ] **Step 1: Modify `src/infrastructure/database/prisma.ts`**

```ts
import { PrismaMssql } from '@prisma/adapter-mssql';
import { Prisma, PrismaClient } from '@prisma/client';

const adapter = new PrismaMssql(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

export type PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient;

export { prisma };
```

- [ ] **Step 2: Modify `src/infrastructure/repositories/PrismaProductRepository.ts`**

```ts
import type { Product } from '../../domain/entities/Product';
import type {
	CreateProductInput,
	IProductRepository,
	UpdateProductInput,
} from '../../domain/repositories/IProductRepository';
import { prisma, type PrismaClientOrTransaction } from '../database/prisma';

export class PrismaProductRepository implements IProductRepository {
	constructor(private readonly client: PrismaClientOrTransaction = prisma) {}

	async findById(id: string): Promise<Product | null> {
		return this.client.product.findUnique({ where: { id } });
	}

	async findBySku(sku: string): Promise<Product | null> {
		return this.client.product.findUnique({ where: { sku } });
	}

	async findAll(): Promise<Product[]> {
		return this.client.product.findMany();
	}

	async countActive(): Promise<number> {
		return this.client.product.count({ where: { isActive: true } });
	}

	async create(data: CreateProductInput): Promise<Product> {
		return this.client.product.create({ data });
	}

	async update(id: string, data: UpdateProductInput): Promise<Product> {
		return this.client.product.update({ where: { id }, data });
	}
}
```

- [ ] **Step 3: Modify `src/infrastructure/repositories/PrismaWarehouseRepository.ts`**

```ts
import type { Warehouse } from '../../domain/entities/Warehouse';
import type {
	CreateWarehouseInput,
	IWarehouseRepository,
} from '../../domain/repositories/IWarehouseRepository';
import { prisma, type PrismaClientOrTransaction } from '../database/prisma';

export class PrismaWarehouseRepository implements IWarehouseRepository {
	constructor(private readonly client: PrismaClientOrTransaction = prisma) {}

	async findById(id: string): Promise<Warehouse | null> {
		return this.client.warehouse.findUnique({ where: { id } });
	}

	async findAll(): Promise<Warehouse[]> {
		return this.client.warehouse.findMany();
	}

	async create(data: CreateWarehouseInput): Promise<Warehouse> {
		return this.client.warehouse.create({ data });
	}
}
```

- [ ] **Step 4: Modify `src/infrastructure/repositories/PrismaInventoryRepository.ts`**

```ts
import type { Inventory } from '../../domain/entities/Inventory';
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { prisma, type PrismaClientOrTransaction } from '../database/prisma';

export class PrismaInventoryRepository implements IInventoryRepository {
	constructor(private readonly client: PrismaClientOrTransaction = prisma) {}

	async findByProductAndWarehouse(productId: string, warehouseId: string): Promise<Inventory | null> {
		return this.client.inventory.findUnique({
			where: { productId_warehouseId: { productId, warehouseId } },
		});
	}

	async findAll(): Promise<Inventory[]> {
		return this.client.inventory.findMany();
	}

	async update(id: string, quantity: number): Promise<Inventory> {
		return this.client.inventory.update({ where: { id }, data: { quantity } });
	}

	async decrementQuantity(id: string, amount: number): Promise<Inventory> {
		return this.client.inventory.update({
			where: { id },
			data: { quantity: { decrement: amount } },
		});
	}

	async incrementQuantity(id: string, amount: number): Promise<Inventory> {
		return this.client.inventory.update({
			where: { id },
			data: { quantity: { increment: amount } },
		});
	}

	async sumQuantity(): Promise<number> {
		const result = await this.client.inventory.aggregate({
			_sum: { quantity: true },
		});
		return result._sum.quantity ?? 0;
	}
}
```

- [ ] **Step 5: Modify `src/infrastructure/repositories/PrismaReservationRepository.ts`**

```ts
import type { Reservation, ReservationStatus } from '../../domain/entities/Reservation';
import type {
	CreateReservationInput,
	IReservationRepository,
} from '../../domain/repositories/IReservationRepository';
import { prisma, type PrismaClientOrTransaction } from '../database/prisma';

export class PrismaReservationRepository implements IReservationRepository {
	constructor(private readonly client: PrismaClientOrTransaction = prisma) {}

	async findById(id: string): Promise<Reservation | null> {
		const reservation = await this.client.reservation.findUnique({ where: { id } });
		return reservation as Reservation | null;
	}

	async findAll(): Promise<Reservation[]> {
		const reservations = await this.client.reservation.findMany();
		return reservations as Reservation[];
	}

	async create(data: CreateReservationInput): Promise<Reservation> {
		const reservation = await this.client.reservation.create({
			data: { ...data, status: 'Pending' },
		});
		return reservation as Reservation;
	}

	async updateStatus(id: string, status: ReservationStatus): Promise<Reservation> {
		const reservation = await this.client.reservation.update({
			where: { id },
			data: { status },
		});
		return reservation as Reservation;
	}

	async countActive(): Promise<number> {
		return this.client.reservation.count({
			where: { status: { in: ['Pending', 'Confirmed'] } },
		});
	}
}
```

- [ ] **Step 6: Create `src/domain/repositories/IUnitOfWork.ts`**

```ts
import type { IInventoryRepository } from './IInventoryRepository';
import type { IProductRepository } from './IProductRepository';
import type { IReservationRepository } from './IReservationRepository';
import type { IWarehouseRepository } from './IWarehouseRepository';

export type ReservationRepositories = {
	productRepository: IProductRepository;
	warehouseRepository: IWarehouseRepository;
	inventoryRepository: IInventoryRepository;
	reservationRepository: IReservationRepository;
};

export interface IUnitOfWork {
	run<T>(fn: (repositories: ReservationRepositories) => Promise<T>): Promise<T>;
}
```

- [ ] **Step 7: Create `src/infrastructure/database/PrismaUnitOfWork.ts`**

```ts
import { Prisma } from '@prisma/client';
import type { IUnitOfWork, ReservationRepositories } from '../../domain/repositories/IUnitOfWork';
import { prisma } from './prisma';
import { PrismaInventoryRepository } from '../repositories/PrismaInventoryRepository';
import { PrismaProductRepository } from '../repositories/PrismaProductRepository';
import { PrismaReservationRepository } from '../repositories/PrismaReservationRepository';
import { PrismaWarehouseRepository } from '../repositories/PrismaWarehouseRepository';

const MAX_ATTEMPTS = 3;

export class PrismaUnitOfWork implements IUnitOfWork {
	async run<T>(fn: (repositories: ReservationRepositories) => Promise<T>): Promise<T> {
		let lastError: unknown;

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				return await prisma.$transaction(
					(tx) =>
						fn({
							productRepository: new PrismaProductRepository(tx),
							warehouseRepository: new PrismaWarehouseRepository(tx),
							inventoryRepository: new PrismaInventoryRepository(tx),
							reservationRepository: new PrismaReservationRepository(tx),
						}),
					{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
				);
			} catch (error) {
				lastError = error;

				const isWriteConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';

				if (!isWriteConflict) {
					throw error;
				}
			}
		}

		throw lastError;
	}
}

export const unitOfWork = new PrismaUnitOfWork();
```

- [ ] **Step 8: Verify the project still type-checks**

Run: `bunx tsc -p tsconfig.json`
Expected: exits with code 0, no output.

- [ ] **Step 9: Run the full test suite to check for regressions**

Run: `bun run test`
Expected: PASS — all 51 existing tests still pass (the four Prisma repository classes behave identically when constructed with no argument).

- [ ] **Step 10: Commit**

```bash
git add src/infrastructure/database/prisma.ts src/infrastructure/database/PrismaUnitOfWork.ts src/infrastructure/repositories src/domain/repositories/IUnitOfWork.ts
git commit -m "feat: add unit of work for cross-repository transactions"
```

---

### Task 2: Reservation Use Cases

**Files:**
- Create: `src/application/use-cases/reservations/CreateReservation.ts`
- Create: `src/application/use-cases/reservations/CancelReservation.ts`
- Create: `src/application/use-cases/reservations/GetReservations.ts`
- Test: `tests/unit/CreateReservation.test.ts`
- Test: `tests/unit/CancelReservation.test.ts`

- [ ] **Step 1: Write the failing test for `CreateReservation`**

```ts
// tests/unit/CreateReservation.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateReservation } from '../../src/application/use-cases/reservations/CreateReservation';
import { DomainError } from '../../src/domain/errors/DomainError';
import { InactiveProductError } from '../../src/domain/errors/InactiveProductError';
import { InactiveWarehouseError } from '../../src/domain/errors/InactiveWarehouseError';
import { InsufficientStockError } from '../../src/domain/errors/InsufficientStockError';
import { NotFoundError } from '../../src/domain/errors/NotFoundError';
import type { Inventory } from '../../src/domain/entities/Inventory';
import type { Product } from '../../src/domain/entities/Product';
import type { Reservation } from '../../src/domain/entities/Reservation';
import type { Warehouse } from '../../src/domain/entities/Warehouse';
import type { IUnitOfWork, ReservationRepositories } from '../../src/domain/repositories/IUnitOfWork';

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

function buildWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
	return {
		id: 'warehouse-1',
		name: 'Warehouse A',
		location: 'SP',
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

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

function buildReservation(overrides: Partial<Reservation> = {}): Reservation {
	return {
		id: 'reservation-1',
		productId: 'product-1',
		warehouseId: 'warehouse-1',
		quantity: 10,
		status: 'Pending',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function buildRepositories(): ReservationRepositories {
	return {
		productRepository: {
			findById: vi.fn(),
			findBySku: vi.fn(),
			findAll: vi.fn(),
			countActive: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		warehouseRepository: {
			findById: vi.fn(),
			findAll: vi.fn(),
			create: vi.fn(),
		},
		inventoryRepository: {
			findByProductAndWarehouse: vi.fn(),
			findAll: vi.fn(),
			update: vi.fn(),
			decrementQuantity: vi.fn(),
			incrementQuantity: vi.fn(),
			sumQuantity: vi.fn(),
		},
		reservationRepository: {
			findById: vi.fn(),
			findAll: vi.fn(),
			create: vi.fn(),
			updateStatus: vi.fn(),
			countActive: vi.fn(),
		},
	};
}

function buildUnitOfWork(repositories: ReservationRepositories): IUnitOfWork {
	return {
		run: vi.fn((fn) => fn(repositories)),
	};
}

describe('CreateReservation', () => {
	let repositories: ReservationRepositories;
	let createReservation: CreateReservation;

	beforeEach(() => {
		repositories = buildRepositories();
		createReservation = new CreateReservation(buildUnitOfWork(repositories));
	});

	it('creates a reservation and debits stock when available quantity is sufficient', async () => {
		vi.mocked(repositories.productRepository.findById).mockResolvedValue(buildProduct());
		vi.mocked(repositories.warehouseRepository.findById).mockResolvedValue(buildWarehouse());
		vi.mocked(repositories.inventoryRepository.findByProductAndWarehouse).mockResolvedValue(buildInventory());
		vi.mocked(repositories.reservationRepository.create).mockResolvedValue(buildReservation());

		const result = await createReservation.execute({
			productId: 'product-1',
			warehouseId: 'warehouse-1',
			quantity: 10,
		});

		expect(result.status).toBe('Pending');
		expect(repositories.inventoryRepository.decrementQuantity).toHaveBeenCalledWith('inventory-1', 10);
	});

	it('throws InsufficientStockError when quantity exceeds inventory.quantity', async () => {
		vi.mocked(repositories.productRepository.findById).mockResolvedValue(buildProduct());
		vi.mocked(repositories.warehouseRepository.findById).mockResolvedValue(buildWarehouse());
		vi.mocked(repositories.inventoryRepository.findByProductAndWarehouse).mockResolvedValue(
			buildInventory({ quantity: 5 }),
		);

		await expect(
			createReservation.execute({ productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10 }),
		).rejects.toThrow(InsufficientStockError);
	});

	it('throws NotFoundError when the product does not exist', async () => {
		vi.mocked(repositories.productRepository.findById).mockResolvedValue(null);

		await expect(
			createReservation.execute({ productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10 }),
		).rejects.toThrow(NotFoundError);
	});

	it('throws NotFoundError when the warehouse does not exist', async () => {
		vi.mocked(repositories.productRepository.findById).mockResolvedValue(buildProduct());
		vi.mocked(repositories.warehouseRepository.findById).mockResolvedValue(null);

		await expect(
			createReservation.execute({ productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10 }),
		).rejects.toThrow(NotFoundError);
	});

	it('throws InactiveProductError when the product is inactive', async () => {
		vi.mocked(repositories.productRepository.findById).mockResolvedValue(buildProduct({ isActive: false }));

		await expect(
			createReservation.execute({ productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10 }),
		).rejects.toThrow(InactiveProductError);
	});

	it('throws InactiveWarehouseError when the warehouse is inactive', async () => {
		vi.mocked(repositories.productRepository.findById).mockResolvedValue(buildProduct());
		vi.mocked(repositories.warehouseRepository.findById).mockResolvedValue(buildWarehouse({ isActive: false }));

		await expect(
			createReservation.execute({ productId: 'product-1', warehouseId: 'warehouse-1', quantity: 10 }),
		).rejects.toThrow(InactiveWarehouseError);
	});

	it('throws a validation error when quantity is <= 0', async () => {
		await expect(
			createReservation.execute({ productId: 'product-1', warehouseId: 'warehouse-1', quantity: 0 }),
		).rejects.toThrow(DomainError);
		expect(repositories.productRepository.findById).not.toHaveBeenCalled();
	});

	it('treats a missing Inventory record as quantity 0', async () => {
		vi.mocked(repositories.productRepository.findById).mockResolvedValue(buildProduct());
		vi.mocked(repositories.warehouseRepository.findById).mockResolvedValue(buildWarehouse());
		vi.mocked(repositories.inventoryRepository.findByProductAndWarehouse).mockResolvedValue(null);

		await expect(
			createReservation.execute({ productId: 'product-1', warehouseId: 'warehouse-1', quantity: 1 }),
		).rejects.toThrow(InsufficientStockError);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/unit/CreateReservation.test.ts`
Expected: FAIL — cannot find module `../../src/application/use-cases/reservations/CreateReservation`.

- [ ] **Step 3: Implement `src/application/use-cases/reservations/CreateReservation.ts`**

```ts
import type { Reservation } from '../../../domain/entities/Reservation';
import { DomainError } from '../../../domain/errors/DomainError';
import { InactiveProductError } from '../../../domain/errors/InactiveProductError';
import { InactiveWarehouseError } from '../../../domain/errors/InactiveWarehouseError';
import { InsufficientStockError } from '../../../domain/errors/InsufficientStockError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import type { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';

export type CreateReservationInput = {
	productId: string;
	warehouseId: string;
	quantity: number;
};

export class CreateReservation {
	constructor(private readonly unitOfWork: IUnitOfWork) {}

	async execute(input: CreateReservationInput): Promise<Reservation> {
		if (input.quantity <= 0) {
			throw new DomainError('Reservation quantity must be greater than zero.', 'VALIDATION_ERROR', 400);
		}

		return this.unitOfWork.run(
			async ({ productRepository, warehouseRepository, inventoryRepository, reservationRepository }) => {
				const product = await productRepository.findById(input.productId);

				if (!product) {
					throw new NotFoundError('Product');
				}

				if (!product.isActive) {
					throw new InactiveProductError();
				}

				const warehouse = await warehouseRepository.findById(input.warehouseId);

				if (!warehouse) {
					throw new NotFoundError('Warehouse');
				}

				if (!warehouse.isActive) {
					throw new InactiveWarehouseError();
				}

				const inventory = await inventoryRepository.findByProductAndWarehouse(input.productId, input.warehouseId);

				if (!inventory || inventory.quantity < input.quantity) {
					throw new InsufficientStockError();
				}

				await inventoryRepository.decrementQuantity(inventory.id, input.quantity);

				return reservationRepository.create(input);
			},
		);
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- tests/unit/CreateReservation.test.ts`
Expected: PASS — 8 tests passed.

- [ ] **Step 5: Write the failing test for `CancelReservation`**

```ts
// tests/unit/CancelReservation.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelReservation } from '../../src/application/use-cases/reservations/CancelReservation';
import { NotFoundError } from '../../src/domain/errors/NotFoundError';
import { ReservationAlreadyCancelledError } from '../../src/domain/errors/ReservationAlreadyCancelledError';
import type { Inventory } from '../../src/domain/entities/Inventory';
import type { Reservation } from '../../src/domain/entities/Reservation';
import type { IUnitOfWork, ReservationRepositories } from '../../src/domain/repositories/IUnitOfWork';

function buildInventory(overrides: Partial<Inventory> = {}): Inventory {
	return {
		id: 'inventory-1',
		productId: 'product-1',
		warehouseId: 'warehouse-1',
		quantity: 40,
		updatedAt: new Date(),
		...overrides,
	};
}

function buildReservation(overrides: Partial<Reservation> = {}): Reservation {
	return {
		id: 'reservation-1',
		productId: 'product-1',
		warehouseId: 'warehouse-1',
		quantity: 10,
		status: 'Pending',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function buildRepositories(): ReservationRepositories {
	return {
		productRepository: {
			findById: vi.fn(),
			findBySku: vi.fn(),
			findAll: vi.fn(),
			countActive: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		warehouseRepository: {
			findById: vi.fn(),
			findAll: vi.fn(),
			create: vi.fn(),
		},
		inventoryRepository: {
			findByProductAndWarehouse: vi.fn(),
			findAll: vi.fn(),
			update: vi.fn(),
			decrementQuantity: vi.fn(),
			incrementQuantity: vi.fn(),
			sumQuantity: vi.fn(),
		},
		reservationRepository: {
			findById: vi.fn(),
			findAll: vi.fn(),
			create: vi.fn(),
			updateStatus: vi.fn(),
			countActive: vi.fn(),
		},
	};
}

function buildUnitOfWork(repositories: ReservationRepositories): IUnitOfWork {
	return {
		run: vi.fn((fn) => fn(repositories)),
	};
}

describe('CancelReservation', () => {
	let repositories: ReservationRepositories;
	let cancelReservation: CancelReservation;

	beforeEach(() => {
		repositories = buildRepositories();
		cancelReservation = new CancelReservation(buildUnitOfWork(repositories));
	});

	it('cancels a Pending reservation and restores stock correctly', async () => {
		vi.mocked(repositories.reservationRepository.findById).mockResolvedValue(buildReservation({ status: 'Pending' }));
		vi.mocked(repositories.inventoryRepository.findByProductAndWarehouse).mockResolvedValue(buildInventory());
		vi.mocked(repositories.reservationRepository.updateStatus).mockResolvedValue(
			buildReservation({ status: 'Cancelled' }),
		);

		const result = await cancelReservation.execute('reservation-1');

		expect(result.status).toBe('Cancelled');
		expect(repositories.inventoryRepository.incrementQuantity).toHaveBeenCalledWith('inventory-1', 10);
	});

	it('cancels a Confirmed reservation and restores stock correctly', async () => {
		vi.mocked(repositories.reservationRepository.findById).mockResolvedValue(
			buildReservation({ status: 'Confirmed' }),
		);
		vi.mocked(repositories.inventoryRepository.findByProductAndWarehouse).mockResolvedValue(buildInventory());
		vi.mocked(repositories.reservationRepository.updateStatus).mockResolvedValue(
			buildReservation({ status: 'Cancelled' }),
		);

		const result = await cancelReservation.execute('reservation-1');

		expect(result.status).toBe('Cancelled');
		expect(repositories.inventoryRepository.incrementQuantity).toHaveBeenCalledWith('inventory-1', 10);
	});

	it('throws ReservationAlreadyCancelledError when the status is already Cancelled', async () => {
		vi.mocked(repositories.reservationRepository.findById).mockResolvedValue(
			buildReservation({ status: 'Cancelled' }),
		);

		await expect(cancelReservation.execute('reservation-1')).rejects.toThrow(ReservationAlreadyCancelledError);
	});

	it('throws NotFoundError when the reservation does not exist', async () => {
		vi.mocked(repositories.reservationRepository.findById).mockResolvedValue(null);

		await expect(cancelReservation.execute('reservation-1')).rejects.toThrow(NotFoundError);
	});
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `bun run test -- tests/unit/CancelReservation.test.ts`
Expected: FAIL — cannot find module `../../src/application/use-cases/reservations/CancelReservation`.

- [ ] **Step 7: Implement `src/application/use-cases/reservations/CancelReservation.ts`**

```ts
import type { Reservation } from '../../../domain/entities/Reservation';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { ReservationAlreadyCancelledError } from '../../../domain/errors/ReservationAlreadyCancelledError';
import type { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';

export class CancelReservation {
	constructor(private readonly unitOfWork: IUnitOfWork) {}

	async execute(id: string): Promise<Reservation> {
		return this.unitOfWork.run(async ({ inventoryRepository, reservationRepository }) => {
			const reservation = await reservationRepository.findById(id);

			if (!reservation) {
				throw new NotFoundError('Reservation');
			}

			if (reservation.status === 'Cancelled') {
				throw new ReservationAlreadyCancelledError();
			}

			const inventory = await inventoryRepository.findByProductAndWarehouse(
				reservation.productId,
				reservation.warehouseId,
			);

			if (inventory) {
				await inventoryRepository.incrementQuantity(inventory.id, reservation.quantity);
			}

			return reservationRepository.updateStatus(id, 'Cancelled');
		});
	}
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `bun run test -- tests/unit/CancelReservation.test.ts`
Expected: PASS — 4 tests passed.

- [ ] **Step 9: Implement `src/application/use-cases/reservations/GetReservations.ts`**

```ts
import type { Reservation } from '../../../domain/entities/Reservation';
import type { IReservationRepository } from '../../../domain/repositories/IReservationRepository';

export class GetReservations {
	constructor(private readonly reservationRepository: IReservationRepository) {}

	async execute(): Promise<Reservation[]> {
		return this.reservationRepository.findAll();
	}
}
```

- [ ] **Step 10: Verify the project still type-checks**

Run: `bunx tsc -p tsconfig.json`
Expected: exits with code 0, no output.

- [ ] **Step 11: Commit**

```bash
git add src/application/use-cases/reservations tests/unit/CreateReservation.test.ts tests/unit/CancelReservation.test.ts
git commit -m "feat: add reservation use cases"
```

---

### Task 3: Reservations Route

**Files:**
- Create: `src/api/schemas/reservation.schema.ts`
- Create: `src/api/routes/reservations.routes.ts`
- Modify: `src/api/routes/index.ts`
- Test: `tests/integration/reservations.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/reservations.test.ts
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';
import { prisma } from '../../src/infrastructure/database/prisma';

const app = buildApp();
const operatorToken = jwtService.sign({ sub: randomUUID(), email: 'operator@wrms.com', role: 'Operator' });

let productId: string;
let warehouseId: string;
let inventoryId: string;
let reservationToCancelId: string;

beforeAll(async () => {
	await app.ready();

	const product = await prisma.product.create({ data: { sku: `SKU-${randomUUID()}`, name: 'Reservation Product' } });
	const warehouse = await prisma.warehouse.create({ data: { name: `Warehouse-${randomUUID()}`, location: 'SP' } });
	const inventory = await prisma.inventory.create({
		data: { productId: product.id, warehouseId: warehouse.id, quantity: 20 },
	});

	productId = product.id;
	warehouseId = warehouse.id;
	inventoryId = inventory.id;
});

afterAll(async () => {
	await prisma.reservation.deleteMany({ where: { productId } });
	await prisma.inventory.delete({ where: { id: inventoryId } });
	await prisma.product.delete({ where: { id: productId } });
	await prisma.warehouse.delete({ where: { id: warehouseId } });
});

describe('POST /api/reservations', () => {
	it('returns 401 without a token', async () => {
		const response = await request(app.server).post('/api/reservations').send({ productId, warehouseId, quantity: 1 });

		expect(response.status).toBe(401);
	});

	it('returns 201 with a valid Operator token', async () => {
		const response = await request(app.server)
			.post('/api/reservations')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ productId, warehouseId, quantity: 5 });

		expect(response.status).toBe(201);
		expect(response.body.status).toBe('Pending');
		reservationToCancelId = response.body.id;
	});

	it('returns 422 for insufficient stock', async () => {
		const response = await request(app.server)
			.post('/api/reservations')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ productId, warehouseId, quantity: 1000 });

		expect(response.status).toBe(422);
	});

	it('returns 404 for a non-existent product', async () => {
		const response = await request(app.server)
			.post('/api/reservations')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ productId: randomUUID(), warehouseId, quantity: 1 });

		expect(response.status).toBe(404);
	});

	it('returns 400 when quantity is 0', async () => {
		const response = await request(app.server)
			.post('/api/reservations')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ productId, warehouseId, quantity: 0 });

		expect(response.status).toBe(400);
	});
});

describe('PUT /api/reservations/:id/cancel', () => {
	it('cancels a reservation and restores inventory', async () => {
		const before = await prisma.inventory.findUniqueOrThrow({ where: { id: inventoryId } });

		const response = await request(app.server)
			.put(`/api/reservations/${reservationToCancelId}/cancel`)
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(200);
		expect(response.body.status).toBe('Cancelled');

		const after = await prisma.inventory.findUniqueOrThrow({ where: { id: inventoryId } });
		expect(after.quantity).toBe(before.quantity + 5);
	});

	it('returns 422 when the reservation is already cancelled', async () => {
		const response = await request(app.server)
			.put(`/api/reservations/${reservationToCancelId}/cancel`)
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(422);
	});

	it('returns 404 for a non-existent reservation', async () => {
		const response = await request(app.server)
			.put(`/api/reservations/${randomUUID()}/cancel`)
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(404);
	});
});

describe('GET /api/reservations', () => {
	it('returns 200 and a list with a valid token', async () => {
		const response = await request(app.server)
			.get('/api/reservations')
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/integration/reservations.test.ts`
Expected: FAIL — every `/api/reservations*` request returns 404 (no route registered yet).

- [ ] **Step 3: Implement `src/api/schemas/reservation.schema.ts`**

```ts
import { z } from 'zod';

export const createReservationBodySchema = z.object({
	productId: z.uuid(),
	warehouseId: z.uuid(),
	quantity: z.number().int().min(1).describe('Quantity to reserve (minimum 1)'),
});

export const reservationIdParamsSchema = z.object({
	id: z.uuid(),
});

export const reservationResponseSchema = z.object({
	id: z.string(),
	productId: z.string(),
	warehouseId: z.string(),
	quantity: z.number(),
	status: z.enum(['Pending', 'Confirmed', 'Cancelled']),
	createdAt: z.date(),
	updatedAt: z.date(),
});
```

- [ ] **Step 4: Implement `src/api/routes/reservations.routes.ts`**

```ts
import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { CancelReservation } from '../../application/use-cases/reservations/CancelReservation';
import { CreateReservation } from '../../application/use-cases/reservations/CreateReservation';
import { GetReservations } from '../../application/use-cases/reservations/GetReservations';
import { unitOfWork } from '../../infrastructure/database/PrismaUnitOfWork';
import { PrismaReservationRepository } from '../../infrastructure/repositories/PrismaReservationRepository';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { errorResponseSchema } from '../schemas/error.schema';
import {
	createReservationBodySchema,
	reservationIdParamsSchema,
	reservationResponseSchema,
} from '../schemas/reservation.schema';

export const reservationsRoutes: FastifyPluginAsyncZod = async (app) => {
	const reservationRepository = new PrismaReservationRepository();
	const createReservation = new CreateReservation(unitOfWork);
	const cancelReservation = new CancelReservation(unitOfWork);
	const getReservations = new GetReservations(reservationRepository);

	app.get(
		'/reservations',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Reservations'],
				summary: 'List full reservation history',
				security: [{ bearerAuth: [] }],
				response: {
					200: reservationResponseSchema.array(),
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async () => {
			return getReservations.execute();
		},
	);

	app.post(
		'/reservations',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Reservations'],
				summary: 'Create a reservation',
				security: [{ bearerAuth: [] }],
				body: createReservationBodySchema,
				response: {
					201: reservationResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					422: errorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await createReservation.execute(request.body);
			reply.status(201).send(result);
		},
	);

	app.put(
		'/reservations/:id/cancel',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Reservations'],
				summary: 'Cancel a reservation',
				security: [{ bearerAuth: [] }],
				params: reservationIdParamsSchema,
				response: {
					200: reservationResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					422: errorResponseSchema,
				},
			},
		},
		async (request) => {
			return cancelReservation.execute(request.params.id);
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
import { reservationsRoutes } from './reservations.routes';
import { warehousesRoutes } from './warehouses.routes';

export const routes: FastifyPluginAsyncZod = async (app) => {
	await app.register(authRoutes);
	await app.register(productsRoutes);
	await app.register(warehousesRoutes);
	await app.register(inventoryRoutes);
	await app.register(reservationsRoutes);
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun run test -- tests/integration/reservations.test.ts`
Expected: PASS — 9 tests passed.

- [ ] **Step 7: Run the full test suite to check for regressions**

Run: `bun run test`
Expected: PASS — all tests across all files still pass.

- [ ] **Step 8: Commit**

```bash
git add src/api/schemas/reservation.schema.ts src/api/routes/reservations.routes.ts src/api/routes/index.ts tests/integration/reservations.test.ts
git commit -m "feat: add reservations routes"
```

---

## Self-Review

**Spec coverage:**
- PRD §3.4 / PDF "Each reservation contains" → already covered by plan 1's entity. ✅
- PRD §4.4 / PDF business rules (existence checks, active checks, insufficient-stock check, debit on create, restore on cancel) → `CreateReservation`/`CancelReservation`, exact step order. ✅
- PRD §4.4 step 8 / §13 "transaction com row-level lock" → `IUnitOfWork` + `Serializable` isolation, Task 1. ✅
- PRD §5.5 / PDF API requirements, exact methods/paths/roles → Task 3. ✅
- PRD §9.1 `CreateReservation` (8 cases) and `CancelReservation` (4 cases) unit tests → Task 2, exact match. ✅
- PRD §9.2 `reservations.test.ts` (9 cases) → Task 3, exact match. ✅

**Placeholder scan:** No TBD/TODO — every step has complete code. ✅

**Type consistency:** `IUnitOfWork`/`ReservationRepositories` defined once in `IUnitOfWork.ts`, imported via `import type` everywhere else. `IProductRepository`/`IWarehouseRepository`/`IInventoryRepository`/`IReservationRepository` reused exactly as defined in plan 1 — no renames, no new methods added to any of them. `reservationResponseSchema.status` matches the domain's `ReservationStatus` union exactly. ✅

---

## Execution Handoff

Plan complete and saved to `backend/docs/tasks/07-reservations.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
