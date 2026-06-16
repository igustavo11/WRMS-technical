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
