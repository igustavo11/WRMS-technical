import type { Product } from '../entities/Product';

export type CreateProductInput = {
	sku: string;
	name: string;
	description?: string | null;
	isActive?: boolean;
};

export type UpdateProductInput = Partial<{
	name: string;
	description: string | null;
	isActive: boolean;
}>;

export interface IProductRepository {
	findById(id: string): Promise<Product | null>;
	findBySku(sku: string): Promise<Product | null>;
	findAll(): Promise<Product[]>;
	countActive(): Promise<number>;
	create(data: CreateProductInput): Promise<Product>;
	update(id: string, data: UpdateProductInput): Promise<Product>;
}
