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
		const inventory = await this.inventoryRepository.findByProductAndWarehouse(
			input.productId,
			input.warehouseId,
		);

		if (!inventory) {
			throw new NotFoundError('Inventory');
		}

		if (input.quantity < 0) {
			throw new DomainError(
				'Inventory quantity cannot be negative.',
				'NEGATIVE_QUANTITY',
				422,
			);
		}

		return this.inventoryRepository.update(inventory.id, input.quantity);
	}
}
