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
			countCancelled: vi.fn(),
			countCreatedToday: vi.fn(),
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
