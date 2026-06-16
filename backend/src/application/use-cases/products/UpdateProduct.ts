import type { Product } from '../../../domain/entities/Product';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import type {
	IProductRepository,
	UpdateProductInput,
} from '../../../domain/repositories/IProductRepository';

export class UpdateProduct {
	constructor(private readonly productRepository: IProductRepository) {}

	async execute(id: string, data: UpdateProductInput): Promise<Product> {
		const existing = await this.productRepository.findById(id);

		if (!existing) {
			throw new NotFoundError('Product');
		}

		return this.productRepository.update(id, data);
	}
}
