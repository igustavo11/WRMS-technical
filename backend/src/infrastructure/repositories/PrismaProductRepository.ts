import type { Product } from '../../domain/entities/Product';
import type {
	CreateProductInput,
	IProductRepository,
	UpdateProductInput,
} from '../../domain/repositories/IProductRepository';
import { prisma } from '../database/prisma';

export class PrismaProductRepository implements IProductRepository {
	async findById(id: string): Promise<Product | null> {
		return prisma.product.findUnique({ where: { id } });
	}

	async findBySku(sku: string): Promise<Product | null> {
		return prisma.product.findUnique({ where: { sku } });
	}

	async findAll(): Promise<Product[]> {
		return prisma.product.findMany();
	}

	async countActive(): Promise<number> {
		return prisma.product.count({ where: { isActive: true } });
	}

	async create(data: CreateProductInput): Promise<Product> {
		return prisma.product.create({ data });
	}

	async update(id: string, data: UpdateProductInput): Promise<Product> {
		return prisma.product.update({ where: { id }, data });
	}
}
