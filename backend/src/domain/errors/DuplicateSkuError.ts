import { DomainError } from './DomainError';

export class DuplicateSkuError extends DomainError {
	constructor(sku: string) {
		super(`SKU "${sku}" already exists.`, 'DUPLICATE_SKU', 409);
	}
}
