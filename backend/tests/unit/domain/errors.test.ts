import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../src/domain/errors/DomainError';
import { DuplicateSkuError } from '../../../src/domain/errors/DuplicateSkuError';
import { InactiveProductError } from '../../../src/domain/errors/InactiveProductError';
import { InactiveWarehouseError } from '../../../src/domain/errors/InactiveWarehouseError';
import { InsufficientStockError } from '../../../src/domain/errors/InsufficientStockError';
import { NotFoundError } from '../../../src/domain/errors/NotFoundError';
import { ReservationAlreadyCancelledError } from '../../../src/domain/errors/ReservationAlreadyCancelledError';

describe('DomainError', () => {
	it('carries message, code and statusCode', () => {
		const error = new DomainError('Something went wrong.', 'GENERIC_ERROR', 422);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe('Something went wrong.');
		expect(error.code).toBe('GENERIC_ERROR');
		expect(error.statusCode).toBe(422);
	});
});

describe('NotFoundError', () => {
	it('builds a 404 with the resource name in the message', () => {
		const error = new NotFoundError('Product');

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('NOT_FOUND');
		expect(error.statusCode).toBe(404);
		expect(error.message).toBe('Product not found.');
	});
});

describe('InsufficientStockError', () => {
	it('builds a 422 for insufficient stock', () => {
		const error = new InsufficientStockError();

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('INSUFFICIENT_STOCK');
		expect(error.statusCode).toBe(422);
		expect(error.message).toBe('Requested quantity exceeds available stock.');
	});
});

describe('DuplicateSkuError', () => {
	it('builds a 409 with the duplicated SKU in the message', () => {
		const error = new DuplicateSkuError('SKU-001');

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('DUPLICATE_SKU');
		expect(error.statusCode).toBe(409);
		expect(error.message).toBe('SKU "SKU-001" already exists.');
	});
});

describe('InactiveProductError', () => {
	it('builds a 422 for inactive product', () => {
		const error = new InactiveProductError();

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('INACTIVE_PRODUCT');
		expect(error.statusCode).toBe(422);
		expect(error.message).toBe('Product is inactive and cannot receive new reservations.');
	});
});

describe('InactiveWarehouseError', () => {
	it('builds a 422 for inactive warehouse', () => {
		const error = new InactiveWarehouseError();

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('INACTIVE_WAREHOUSE');
		expect(error.statusCode).toBe(422);
		expect(error.message).toBe('Warehouse is inactive and cannot receive new reservations.');
	});
});

describe('ReservationAlreadyCancelledError', () => {
	it('builds a 422 for an already cancelled reservation', () => {
		const error = new ReservationAlreadyCancelledError();

		expect(error).toBeInstanceOf(DomainError);
		expect(error.code).toBe('RESERVATION_ALREADY_CANCELLED');
		expect(error.statusCode).toBe(422);
		expect(error.message).toBe('Reservation is already cancelled.');
	});
});
