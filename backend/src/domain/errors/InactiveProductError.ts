import { DomainError } from './DomainError';

export class InactiveProductError extends DomainError {
	constructor() {
		super(
			'Product is inactive and cannot receive new reservations.',
			'INACTIVE_PRODUCT',
			422,
		);
	}
}
