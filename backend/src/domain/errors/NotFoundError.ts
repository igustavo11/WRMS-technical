import { DomainError } from './DomainError';

export class NotFoundError extends DomainError {
	constructor(resource: string) {
		super(`${resource} not found.`, 'NOT_FOUND', 404);
	}
}
