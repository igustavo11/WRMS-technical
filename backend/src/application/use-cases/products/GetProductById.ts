import type { Product } from '../../../domain/entities/Product';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import type { IProductRepository } from '../../../domain/repositories/IProductRepository';

export class GetProductById {
	constructor(private readonly productRepository: IProductRepository) {}

	async execute(id: string): Promise<Product> {
		const product = await this.productRepository.findById(id);

		if (!product) {
			throw new NotFoundError('Product');
		}

		return product;
	}
}
