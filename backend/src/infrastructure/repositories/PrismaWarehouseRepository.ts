import type { Warehouse } from '../../domain/entities/Warehouse';
import type {
	CreateWarehouseInput,
	IWarehouseRepository,
} from '../../domain/repositories/IWarehouseRepository';
import { type PrismaClientOrTransaction, prisma } from '../database/prisma';

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
