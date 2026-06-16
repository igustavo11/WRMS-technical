import type { Reservation } from '../../../domain/entities/Reservation';
import { DomainError } from '../../../domain/errors/DomainError';
import { InactiveProductError } from '../../../domain/errors/InactiveProductError';
import { InactiveWarehouseError } from '../../../domain/errors/InactiveWarehouseError';
import { InsufficientStockError } from '../../../domain/errors/InsufficientStockError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import type { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';

export type CreateReservationInput = {
	productId: string;
	warehouseId: string;
	quantity: number;
};

export class CreateReservation {
	constructor(private readonly unitOfWork: IUnitOfWork) {}

	async execute(input: CreateReservationInput): Promise<Reservation> {
		if (input.quantity <= 0) {
			throw new DomainError(
				'Reservation quantity must be greater than zero.',
				'VALIDATION_ERROR',
				400,
			);
		}

		return this.unitOfWork.run(
			async ({
				productRepository,
				warehouseRepository,
				inventoryRepository,
				reservationRepository,
			}) => {
				const product = await productRepository.findById(input.productId);

				if (!product) {
					throw new NotFoundError('Product');
				}

				if (!product.isActive) {
					throw new InactiveProductError();
				}

				const warehouse = await warehouseRepository.findById(input.warehouseId);

				if (!warehouse) {
					throw new NotFoundError('Warehouse');
				}

				if (!warehouse.isActive) {
					throw new InactiveWarehouseError();
				}

				const inventory = await inventoryRepository.findByProductAndWarehouse(
					input.productId,
					input.warehouseId,
				);

				if (!inventory || inventory.quantity < input.quantity) {
					throw new InsufficientStockError();
				}

				await inventoryRepository.decrementQuantity(
					inventory.id,
					input.quantity,
				);

				return reservationRepository.create(input);
			},
		);
	}
}
