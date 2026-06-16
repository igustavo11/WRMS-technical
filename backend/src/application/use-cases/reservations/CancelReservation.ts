import type { Reservation } from '../../../domain/entities/Reservation';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { ReservationAlreadyCancelledError } from '../../../domain/errors/ReservationAlreadyCancelledError';
import type { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';

export class CancelReservation {
	constructor(private readonly unitOfWork: IUnitOfWork) {}

	async execute(id: string): Promise<Reservation> {
		return this.unitOfWork.run(
			async ({ inventoryRepository, reservationRepository }) => {
				const reservation = await reservationRepository.findById(id);

				if (!reservation) {
					throw new NotFoundError('Reservation');
				}

				if (reservation.status === 'Cancelled') {
					throw new ReservationAlreadyCancelledError();
				}

				const inventory = await inventoryRepository.findByProductAndWarehouse(
					reservation.productId,
					reservation.warehouseId,
				);

				if (inventory) {
					await inventoryRepository.incrementQuantity(
						inventory.id,
						reservation.quantity,
					);
				}

				return reservationRepository.updateStatus(id, 'Cancelled');
			},
		);
	}
}
