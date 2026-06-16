import { DomainError } from './DomainError';

export class ReservationAlreadyCancelledError extends DomainError {
	constructor() {
		super(
			'Reservation is already cancelled.',
			'RESERVATION_ALREADY_CANCELLED',
			422,
		);
	}
}
