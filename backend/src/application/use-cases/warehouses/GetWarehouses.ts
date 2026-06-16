import type { Warehouse } from '../../../domain/entities/Warehouse';
import type { IWarehouseRepository } from '../../../domain/repositories/IWarehouseRepository';

export class GetWarehouses {
	constructor(private readonly warehouseRepository: IWarehouseRepository) {}

	async execute(): Promise<Warehouse[]> {
		return this.warehouseRepository.findAll();
	}
}
