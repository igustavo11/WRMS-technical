import type { Inventory } from '../../../domain/entities/Inventory';
import type { IInventoryRepository } from '../../../domain/repositories/IInventoryRepository';

export class GetInventory {
	constructor(private readonly inventoryRepository: IInventoryRepository) {}

	async execute(): Promise<Inventory[]> {
		return this.inventoryRepository.findAll();
	}
}
