import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateProduct } from '../../src/application/use-cases/products/CreateProduct';
import { DomainError } from '../../src/domain/errors/DomainError';
import { DuplicateSkuError } from '../../src/domain/errors/DuplicateSkuError';
import type { Product } from '../../src/domain/entities/Product';
import type { IProductRepository } from '../../src/domain/repositories/IProductRepository';

function buildProduct(overrides: Partial<Product> = {}): Product {
	return {
		id: 'product-1',
		sku: 'SKU-001',
		name: 'Product A',
		description: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function buildRepository(): IProductRepository {
	return {
		findById: vi.fn(),
		findBySku: vi.fn(),
		findAll: vi.fn(),
		countActive: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	};
}

describe('CreateProduct', () => {
	let repository: IProductRepository;
	let createProduct: CreateProduct;

	beforeEach(() => {
		repository = buildRepository();
		createProduct = new CreateProduct(repository);
	});

	it('creates a product with valid data', async () => {
		vi.mocked(repository.findBySku).mockResolvedValue(null);
		vi.mocked(repository.create).mockResolvedValue(buildProduct());

		const result = await createProduct.execute({ sku: 'SKU-001', name: 'Product A' });

		expect(result.sku).toBe('SKU-001');
		expect(repository.create).toHaveBeenCalledWith({ sku: 'SKU-001', name: 'Product A' });
	});

	it('throws DuplicateSkuError when the SKU already exists', async () => {
		vi.mocked(repository.findBySku).mockResolvedValue(buildProduct());

		await expect(createProduct.execute({ sku: 'SKU-001', name: 'Product A' })).rejects.toThrow(DuplicateSkuError);
	});

	it('throws a validation error when SKU is empty', async () => {
		await expect(createProduct.execute({ sku: '', name: 'Product A' })).rejects.toThrow(DomainError);
		expect(repository.findBySku).not.toHaveBeenCalled();
	});

	it('throws a validation error when name is empty', async () => {
		await expect(createProduct.execute({ sku: 'SKU-001', name: '' })).rejects.toThrow(DomainError);
		expect(repository.findBySku).not.toHaveBeenCalled();
	});
});
