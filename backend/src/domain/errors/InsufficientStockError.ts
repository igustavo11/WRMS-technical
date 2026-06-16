import { DomainError } from './DomainError';

export class InsufficientStockError extends DomainError {
	constructor() {
		super(
			'Requested quantity exceeds available stock.',
			'INSUFFICIENT_STOCK',
			422,
		);
	}
}
