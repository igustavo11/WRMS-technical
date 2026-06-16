# Domain Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the domain layer — entities, typed domain errors, and repository interfaces — with zero dependencies on Prisma, Fastify, or any other framework. This is the foundation every other subsystem imports from.

**Architecture:** Pure TypeScript. `src/domain/entities` are plain `type` aliases describing the shape of each business object (no behavior — validation and business rules live in use cases, built in later plans). `src/domain/errors` are runtime classes used by use cases to signal rule violations, later caught by a global error handler (built in plan 2) and mapped to HTTP responses. `src/domain/repositories` are `interface` contracts (not `type`, because concrete classes `implements` them in plan 2) describing what each feature's use cases need from persistence, without committing to Prisma.

**Tech Stack:** TypeScript only. Tests run via Vitest (`bun run test`), no database involved.

---

## Notes for whoever picks this up

- `verbatimModuleSyntax` is `true` in `tsconfig.json` — every import that is only used as a type must use `import type`.
- Per PRD §7.1, `src/domain/entities` does **not** include a `User` entity — only `Product`, `Warehouse`, `Inventory`, `Reservation`. `User` is an auth concern, handled in plan 2/3.
- `DomainError` is a **concrete** class, not abstract. PRD §9.1 (AdjustInventory unit tests) expects a generic `DomainError` to be thrown directly for "new quantity is negative" — there's no dedicated named subclass for that case in PRD §7.1's file list. Making `DomainError` concrete lets use cases `throw new DomainError(message, code, statusCode)` directly for one-off cases, while the 6 named subclasses below cover the cases that recur across multiple use cases.
- Formatting: tabs, single quotes (matches `biome.json`). Verification command for type-only files (no runtime behavior to unit test): `bunx tsc -p tsconfig.json` — confirmed to pass with zero errors on the current codebase before this plan starts.

---

### Task 1: Domain Entities

**Files:**
- Create: `src/domain/entities/Product.ts`
- Create: `src/domain/entities/Warehouse.ts`
- Create: `src/domain/entities/Inventory.ts`
- Create: `src/domain/entities/Reservation.ts`

These are plain data shapes (PRD §3.1–§3.4) with no runtime behavior, so there is no failing test to write first — the verification step is that the project still type-checks.

- [ ] **Step 1: Create `src/domain/entities/Product.ts`**

```ts
export type Product = {
	id: string;
	sku: string;
	name: string;
	description: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};
```

- [ ] **Step 2: Create `src/domain/entities/Warehouse.ts`**

```ts
export type Warehouse = {
	id: string;
	name: string;
	location: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};
```

- [ ] **Step 3: Create `src/domain/entities/Inventory.ts`**

```ts
export type Inventory = {
	id: string;
	productId: string;
	warehouseId: string;
	quantity: number;
	updatedAt: Date;
};
```

- [ ] **Step 4: Create `src/domain/entities/Reservation.ts`**

```ts
export type ReservationStatus = 'Pending' | 'Confirmed' | 'Cancelled';

export type Reservation = {
	id: string;
	productId: string;
	warehouseId: string;
	quantity: number;
	status: ReservationStatus;
	createdAt: Date;
	updatedAt: Date;
};
```

- [ ] **Step 5: Verify the project still type-checks**

Run: `bunx tsc -p tsconfig.json`
Expected: exits with code 0, no output.

- [ ] **Step 6: Commit**

```bash
git add src/domain/entities
git commit -m "feat: add domain entities"
```

---

### Task 2: Domain Errors

**Files:**
- Create: `src/domain/errors/DomainError.ts`
- Create: `src/domain/errors/NotFoundError.ts`
- Create: `src/domain/errors/InsufficientStockError.ts`
- Create: `src/domain/errors/DuplicateSkuError.ts`
- Create: `src/domain/errors/InactiveProductError.ts`
- Create: `src/domain/errors/InactiveWarehouseError.ts`
- Create: `src/domain/errors/ReservationAlreadyCancelledError.ts`
- Test: `tests/unit/domain/errors.test.ts`

Every class has the same observable contract (`message`, `code`, `statusCode`, `instanceof Error`, `instanceof DomainError`), so all assertions are written together in one test file before any implementation exists.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../src/domain/errors/DomainError';
import { DuplicateSkuError } from '../../../src/domain/errors/DuplicateSkuError';
import { InactiveProductError } from '../../../src/domain/errors/InactiveProductError';
import { InactiveWarehouseError } from '../../../src/domain/errors/InactiveWarehouseError';
import { InsufficientStockError } from '../../../src/domain/errors/InsufficientStockError';
import { NotFoundError } from '../../../src/domain/errors/NotFoundError';
import { ReservationAlreadyCancelledError } from '../../../src/domain/errors/ReservationAlreadyCancelledError';

describe('DomainError', () => {
	it('carries message, code and statusCode', () => {
		const error = new DomainError('Something went wrong.', 'GENERIC_ERROR', 422);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe('Something went wrong.');
		expect(error.code).toBe('GENERIC_ERROR');
		expect(error.statusCode).toBe(422);
	});
});

describe('NotFoundError', () => {
	it('builds a 404 with the resource name in the message', () => {
		const error = new NotFoundError('Product');

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('NOT_FOUND');
		expect(error.statusCode).toBe(404);
		expect(error.message).toBe('Product not found.');
	});
});

describe('InsufficientStockError', () => {
	it('builds a 422 for insufficient stock', () => {
		const error = new InsufficientStockError();

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('INSUFFICIENT_STOCK');
		expect(error.statusCode).toBe(422);
		expect(error.message).toBe('Requested quantity exceeds available stock.');
	});
});

describe('DuplicateSkuError', () => {
	it('builds a 409 with the duplicated SKU in the message', () => {
		const error = new DuplicateSkuError('SKU-001');

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('DUPLICATE_SKU');
		expect(error.statusCode).toBe(409);
		expect(error.message).toBe('SKU "SKU-001" already exists.');
	});
});

describe('InactiveProductError', () => {
	it('builds a 422 for inactive product', () => {
		const error = new InactiveProductError();

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('INACTIVE_PRODUCT');
		expect(error.statusCode).toBe(422);
		expect(error.message).toBe('Product is inactive and cannot receive new reservations.');
	});
});

describe('InactiveWarehouseError', () => {
	it('builds a 422 for inactive warehouse', () => {
		const error = new InactiveWarehouseError();

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('INACTIVE_WAREHOUSE');
		expect(error.statusCode).toBe(422);
		expect(error.message).toBe('Warehouse is inactive and cannot receive new reservations.');
	});
});

describe('ReservationAlreadyCancelledError', () => {
	it('builds a 422 for an already cancelled reservation', () => {
		const error = new ReservationAlreadyCancelledError();

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('RESERVATION_ALREADY_CANCELLED');
		expect(error.statusCode).toBe(422);
		expect(error.message).toBe('Reservation is already cancelled.');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/unit/domain/errors.test.ts`
Expected: FAIL — cannot find module `../../../src/domain/errors/DomainError` (none of the files exist yet).

- [ ] **Step 3: Implement `src/domain/errors/DomainError.ts`**

```ts
export class DomainError extends Error {
	readonly code: string;
	readonly statusCode: number;

	constructor(message: string, code: string, statusCode: number) {
		super(message);
		this.name = new.target.name;
		this.code = code;
		this.statusCode = statusCode;
	}
}
```

- [ ] **Step 4: Implement the 6 subclasses**

```ts
// src/domain/errors/NotFoundError.ts
import { DomainError } from './DomainError';

export class NotFoundError extends DomainError {
	constructor(resource: string) {
		super(`${resource} not found.`, 'NOT_FOUND', 404);
	}
}
```

```ts
// src/domain/errors/InsufficientStockError.ts
import { DomainError } from './DomainError';

export class InsufficientStockError extends DomainError {
	constructor() {
		super('Requested quantity exceeds available stock.', 'INSUFFICIENT_STOCK', 422);
	}
}
```

```ts
// src/domain/errors/DuplicateSkuError.ts
import { DomainError } from './DomainError';

export class DuplicateSkuError extends DomainError {
	constructor(sku: string) {
		super(`SKU "${sku}" already exists.`, 'DUPLICATE_SKU', 409);
	}
}
```

```ts
// src/domain/errors/InactiveProductError.ts
import { DomainError } from './DomainError';

export class InactiveProductError extends DomainError {
	constructor() {
		super('Product is inactive and cannot receive new reservations.', 'INACTIVE_PRODUCT', 422);
	}
}
```

```ts
// src/domain/errors/InactiveWarehouseError.ts
import { DomainError } from './DomainError';

export class InactiveWarehouseError extends DomainError {
	constructor() {
		super('Warehouse is inactive and cannot receive new reservations.', 'INACTIVE_WAREHOUSE', 422);
	}
}
```

```ts
// src/domain/errors/ReservationAlreadyCancelledError.ts
import { DomainError } from './DomainError';

export class ReservationAlreadyCancelledError extends DomainError {
	constructor() {
		super('Reservation is already cancelled.', 'RESERVATION_ALREADY_CANCELLED', 422);
	}
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test -- tests/unit/domain/errors.test.ts`
Expected: PASS — 7 tests passed.

- [ ] **Step 6: Commit**

```bash
git add src/domain/errors tests/unit/domain/errors.test.ts
git commit -m "feat: add typed domain errors"
```

---

### Task 3: Repository Interfaces

**Files:**
- Create: `src/domain/repositories/IProductRepository.ts`
- Create: `src/domain/repositories/IWarehouseRepository.ts`
- Create: `src/domain/repositories/IInventoryRepository.ts`
- Create: `src/domain/repositories/IReservationRepository.ts`

These are abstract contracts with no implementation — nothing to unit test (no class implements them yet; that happens in plan 2 with the Prisma-backed classes). The verification step is, again, that the project type-checks. **The exact method names and input types below are the ones plans 2–8 must reuse — do not rename them later.**

- [ ] **Step 1: Create `src/domain/repositories/IProductRepository.ts`**

```ts
import type { Product } from '../entities/Product';

export type CreateProductInput = {
	sku: string;
	name: string;
	description?: string | null;
	isActive?: boolean;
};

export type UpdateProductInput = Partial<{
	name: string;
	description: string | null;
	isActive: boolean;
}>;

export interface IProductRepository {
	findById(id: string): Promise<Product | null>;
	findBySku(sku: string): Promise<Product | null>;
	findAll(): Promise<Product[]>;
	countActive(): Promise<number>;
	create(data: CreateProductInput): Promise<Product>;
	update(id: string, data: UpdateProductInput): Promise<Product>;
}
```

- [ ] **Step 2: Create `src/domain/repositories/IWarehouseRepository.ts`**

```ts
import type { Warehouse } from '../entities/Warehouse';

export type CreateWarehouseInput = {
	name: string;
	location: string;
	isActive?: boolean;
};

export interface IWarehouseRepository {
	findById(id: string): Promise<Warehouse | null>;
	findAll(): Promise<Warehouse[]>;
	create(data: CreateWarehouseInput): Promise<Warehouse>;
}
```

- [ ] **Step 3: Create `src/domain/repositories/IInventoryRepository.ts`**

```ts
import type { Inventory } from '../entities/Inventory';

export interface IInventoryRepository {
	findByProductAndWarehouse(productId: string, warehouseId: string): Promise<Inventory | null>;
	findAll(): Promise<Inventory[]>;
	update(id: string, quantity: number): Promise<Inventory>;
	decrementQuantity(id: string, amount: number): Promise<Inventory>;
	incrementQuantity(id: string, amount: number): Promise<Inventory>;
	sumQuantity(): Promise<number>;
}
```

- [ ] **Step 4: Create `src/domain/repositories/IReservationRepository.ts`**

```ts
import type { Reservation, ReservationStatus } from '../entities/Reservation';

export type CreateReservationInput = {
	productId: string;
	warehouseId: string;
	quantity: number;
};

export interface IReservationRepository {
	findById(id: string): Promise<Reservation | null>;
	findAll(): Promise<Reservation[]>;
	create(data: CreateReservationInput): Promise<Reservation>;
	updateStatus(id: string, status: ReservationStatus): Promise<Reservation>;
	countActive(): Promise<number>;
}
```

- [ ] **Step 5: Verify the project still type-checks**

Run: `bunx tsc -p tsconfig.json`
Expected: exits with code 0, no output.

- [ ] **Step 6: Commit**

```bash
git add src/domain/repositories
git commit -m "feat: add repository interfaces"
```

---

## Self-Review

**Spec coverage:**
- PRD §3.1–§3.4 entity fields → Task 1, one-to-one field mapping. ✅
- PRD §7.1 `domain/entities`, `domain/errors`, `domain/repositories` file lists → matched exactly (including the deliberate absence of a `User` entity file). ✅
- PRD §9.1 unit test list referencing `NotFoundError`, `InsufficientStockError`, `InactiveProductError`, `InactiveWarehouseError`, `ReservationAlreadyCancelledError`, and generic `DomainError` (AdjustInventory negative-quantity case) → all covered by Task 2's design (named subclasses + concrete base). ✅
- `DuplicateSkuError` (used by CreateProduct, PRD §9.1) → covered. ✅
- Repository methods cover every operation the PRD's use-case list (§7.1) and route list (§5) will need: product CRUD + active count (dashboard), warehouse create/list (no update, per §4.2), inventory lookup/update/inc/dec/sum (dashboard), reservation create/status update/active count (dashboard). No speculative methods beyond what's traceable to a PRD requirement. ✅

**Placeholder scan:** No TBD/TODO, no "add appropriate error handling", every step has complete code. ✅

**Type consistency:** `ReservationStatus` defined once in `Reservation.ts`, re-exported via `import type` in `IReservationRepository.ts` — no redefinition. Error class constructors all delegate to `DomainError`'s 3-arg constructor consistently. ✅

---

## Execution Handoff

Plan complete and saved to `backend/docs/tasks/01-domain-foundations.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
