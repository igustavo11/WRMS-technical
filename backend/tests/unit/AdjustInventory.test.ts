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
