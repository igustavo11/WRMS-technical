import type { IInventoryRepository } from './IInventoryRepository';
import type { IProductRepository } from './IProductRepository';
import type { IReservationRepository } from './IReservationRepository';
import type { IWarehouseRepository } from './IWarehouseRepository';

export type ReservationRepositories = {
	productRepository: IProductRepository;
	warehouseRepository: IWarehouseRepository;
	inventoryRepository: IInventoryRepository;
	reservationRepository: IReservationRepository;
};

export interface IUnitOfWork {
	run<T>(fn: (repositories: ReservationRepositories) => Promise<T>): Promise<T>;
}
