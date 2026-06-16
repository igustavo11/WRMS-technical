import type { Reservation } from '../../../domain/entities/Reservation';
import type { IReservationRepository } from '../../../domain/repositories/IReservationRepository';

export class GetReservations {
	constructor(private readonly reservationRepository: IReservationRepository) {}

	async execute(): Promise<Reservation[]> {
		return this.reservationRepository.findAll();
	}
}
