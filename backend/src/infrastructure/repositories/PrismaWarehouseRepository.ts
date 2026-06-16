import type { Warehouse } from '../../domain/entities/Warehouse';
import type {
	CreateWarehouseInput,
	IWarehouseRepository,
} from '../../domain/repositories/IWarehouseRepository';
import { prisma } from '../database/prisma';

export class PrismaWarehouseRepository implements IWarehouseRepository {
	async findById(id: string): Promise<Warehouse | null> {
		return prisma.warehouse.findUnique({ where: { id } });
	}

	async findAll(): Promise<Warehouse[]> {
		return prisma.warehouse.findMany();
	}

	async create(data: CreateWarehouseInput): Promise<Warehouse> {
		return prisma.warehouse.create({ data });
	}
}
