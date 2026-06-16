import { DomainError } from './DomainError';

export class InactiveWarehouseError extends DomainError {
	constructor() {
		super(
			'Warehouse is inactive and cannot receive new reservations.',
			'INACTIVE_WAREHOUSE',
			422,
		);
	}
}
