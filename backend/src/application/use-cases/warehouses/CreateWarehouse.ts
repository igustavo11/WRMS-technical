import type { Warehouse } from '../../../domain/entities/Warehouse';
import type {
	CreateWarehouseInput,
	IWarehouseRepository,
} from '../../../domain/repositories/IWarehouseRepository';

export class CreateWarehouse {
	constructor(private readonly warehouseRepository: IWarehouseRepository) {}

	async execute(input: CreateWarehouseInput): Promise<Warehouse> {
		return this.warehouseRepository.create(input);
	}
}
