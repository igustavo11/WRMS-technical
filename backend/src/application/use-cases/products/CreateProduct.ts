import type { Product } from '../../../domain/entities/Product';
import { DomainError } from '../../../domain/errors/DomainError';
import { DuplicateSkuError } from '../../../domain/errors/DuplicateSkuError';
import type {
	CreateProductInput,
	IProductRepository,
} from '../../../domain/repositories/IProductRepository';

export class CreateProduct {
	constructor(private readonly productRepository: IProductRepository) {}

	async execute(input: CreateProductInput): Promise<Product> {
		if (!input.sku.trim()) {
			throw new DomainError('SKU is required.', 'VALIDATION_ERROR', 400);
		}

		if (!input.name.trim()) {
			throw new DomainError('Name is required.', 'VALIDATION_ERROR', 400);
		}

		const existing = await this.productRepository.findBySku(input.sku);

		if (existing) {
			throw new DuplicateSkuError(input.sku);
		}

		return this.productRepository.create(input);
	}
}
