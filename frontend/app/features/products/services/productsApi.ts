import { apiClient } from '~/shared/api/client';

export type Product = {
	id: string;
	sku: string;
	name: string;
	description: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export type CreateProductDto = {
	sku: string;
	name: string;
	description?: string;
	isActive?: boolean;
};

export const getProducts = (): Promise<Product[]> =>
	apiClient.get('/products').then((r) => r.data);

export const createProduct = (dto: CreateProductDto): Promise<Product> =>
	apiClient.post('/products', dto).then((r) => r.data);

export type UpdateProductDto = {
	name?: string;
	description?: string | null;
	isActive?: boolean;
};

export const updateProduct = (
	id: string,
	dto: UpdateProductDto,
): Promise<Product> =>
	apiClient.put(`/products/${id}`, dto).then((r) => r.data);
