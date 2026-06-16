import type { Product } from '../../../domain/entities/Product';
import type { IProductRepository } from '../../../domain/repositories/IProductRepository';

export class GetProducts {
	constructor(private readonly productRepository: IProductRepository) {}

	async execute(): Promise<Product[]> {
		return this.productRepository.findAll();
	}
}
