import { Prisma } from '@prisma/client';
import type {
	IUnitOfWork,
	ReservationRepositories,
} from '../../domain/repositories/IUnitOfWork';
import { PrismaInventoryRepository } from '../repositories/PrismaInventoryRepository';
import { PrismaProductRepository } from '../repositories/PrismaProductRepository';
import { PrismaReservationRepository } from '../repositories/PrismaReservationRepository';
import { PrismaWarehouseRepository } from '../repositories/PrismaWarehouseRepository';
import { prisma } from './prisma';

const MAX_ATTEMPTS = 3;

export class PrismaUnitOfWork implements IUnitOfWork {
	async run<T>(
		fn: (repositories: ReservationRepositories) => Promise<T>,
	): Promise<T> {
		let lastError: unknown;

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				return await prisma.$transaction(
					(tx) =>
						fn({
							productRepository: new PrismaProductRepository(tx),
							warehouseRepository: new PrismaWarehouseRepository(tx),
							inventoryRepository: new PrismaInventoryRepository(tx),
							reservationRepository: new PrismaReservationRepository(tx),
						}),
					{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
				);
			} catch (error) {
				lastError = error;

				const isWriteConflict =
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === 'P2034';

				if (!isWriteConflict) {
					throw error;
				}
			}
		}

		throw lastError;
	}
}

export const unitOfWork = new PrismaUnitOfWork();
