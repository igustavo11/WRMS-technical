import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelReservation } from '../../src/application/use-cases/reservations/CancelReservation';
import { NotFoundError } from '../../src/domain/errors/NotFoundError';
import { ReservationAlreadyCancelledError } from '../../src/domain/errors/ReservationAlreadyCancelledError';
import type { Inventory } from '../../src/domain/entities/Inventory';
import type { Reservation } from '../../src/domain/entities/Reservation';
import type { IUnitOfWork, ReservationRepositories } from '../../src/domain/repositories/IUnitOfWork';

function buildInventory(overrides: Partial<Inventory> = {}): Inventory {
	return {
		id: 'inventory-1',
		productId: 'product-1',
		warehouseId: 'warehouse-1',
		quantity: 40,
		updatedAt: new Date(),
		...overrides,
	};
}

function buildReservation(overrides: Partial<Reservation> = {}): Reservation {
	return {
		id: 'reservation-1',
		productId: 'product-1',
		warehouseId: 'warehouse-1',
		quantity: 10,
		status: 'Pending',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function buildRepositories(): ReservationRepositories {
	return {
		productRepository: {
			findById: vi.fn(),
			findBySku: vi.fn(),
			findAll: vi.fn(),
			countActive: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		warehouseRepository: {
			findById: vi.fn(),
			findAll: vi.fn(),
			create: vi.fn(),
		},
		inventoryRepository: {
			findByProductAndWarehouse: vi.fn(),
			findAll: vi.fn(),
			update: vi.fn(),
			decrementQuantity: vi.fn(),
			incrementQuantity: vi.fn(),
			sumQuantity: vi.fn(),
		},
		reservationRepository: {
			findById: vi.fn(),
			findAll: vi.fn(),
			create: vi.fn(),
			updateStatus: vi.fn(),
			countActive: vi.fn(),
			countCancelled: vi.fn(),
			countCreatedToday: vi.fn(),
		},
	};
}

function buildUnitOfWork(repositories: ReservationRepositories): IUnitOfWork {
	return {
		run: vi.fn((fn) => fn(repositories)),
	};
}

describe('CancelReservation', () => {
	let repositories: ReservationRepositories;
	let cancelReservation: CancelReservation;

	beforeEach(() => {
		repositories = buildRepositories();
		cancelReservation = new CancelReservation(buildUnitOfWork(repositories));
	});

	it('cancels a Pending reservation and restores stock correctly', async () => {
		vi.mocked(repositories.reservationRepository.findById).mockResolvedValue(buildReservation({ status: 'Pending' }));
		vi.mocked(repositories.inventoryRepository.findByProductAndWarehouse).mockResolvedValue(buildInventory());
		vi.mocked(repositories.reservationRepository.updateStatus).mockResolvedValue(
			buildReservation({ status: 'Cancelled' }),
		);

		const result = await cancelReservation.execute('reservation-1');

		expect(result.status).toBe('Cancelled');
		expect(repositories.inventoryRepository.incrementQuantity).toHaveBeenCalledWith('inventory-1', 10);
	});

	it('cancels a Confirmed reservation and restores stock correctly', async () => {
		vi.mocked(repositories.reservationRepository.findById).mockResolvedValue(
			buildReservation({ status: 'Confirmed' }),
		);
		vi.mocked(repositories.inventoryRepository.findByProductAndWarehouse).mockResolvedValue(buildInventory());
		vi.mocked(repositories.reservationRepository.updateStatus).mockResolvedValue(
			buildReservation({ status: 'Cancelled' }),
		);

		const result = await cancelReservation.execute('reservation-1');

		expect(result.status).toBe('Cancelled');
		expect(repositories.inventoryRepository.incrementQuantity).toHaveBeenCalledWith('inventory-1', 10);
	});

	it('throws ReservationAlreadyCancelledError when the status is already Cancelled', async () => {
		vi.mocked(repositories.reservationRepository.findById).mockResolvedValue(
			buildReservation({ status: 'Cancelled' }),
		);

		await expect(cancelReservation.execute('reservation-1')).rejects.toThrow(ReservationAlreadyCancelledError);
	});

	it('throws NotFoundError when the reservation does not exist', async () => {
		vi.mocked(repositories.reservationRepository.findById).mockResolvedValue(null);

		await expect(cancelReservation.execute('reservation-1')).rejects.toThrow(NotFoundError);
	});
});
