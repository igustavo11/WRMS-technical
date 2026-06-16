import type { Product } from '../../domain/entities/Product';
import type {
	CreateProductInput,
	IProductRepository,
	UpdateProductInput,
} from '../../domain/repositories/IProductRepository';
import { type PrismaClientOrTransaction, prisma } from '../database/prisma';

export class PrismaProductRepository implements IProductRepository {
	constructor(private readonly client: PrismaClientOrTransaction = prisma) {}

	async findById(id: string): Promise<Product | null> {
		return this.client.product.findUnique({ where: { id } });
	}

	async findBySku(sku: string): Promise<Product | null> {
		return this.client.product.findUnique({ where: { sku } });
	}

	async findAll(): Promise<Product[]> {
		return this.client.product.findMany();
	}

	async countActive(): Promise<number> {
		return this.client.product.count({ where: { isActive: true } });
	}

	async create(data: CreateProductInput): Promise<Product> {
		return this.client.product.create({ data });
	}

	async update(id: string, data: UpdateProductInput): Promise<Product> {
		return this.client.product.update({ where: { id }, data });
	}
}
