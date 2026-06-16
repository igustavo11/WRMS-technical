import type { Reservation, ReservationStatus } from '../entities/Reservation';

export type CreateReservationInput = {
	productId: string;
	warehouseId: string;
	quantity: number;
};

export interface IReservationRepository {
	findById(id: string): Promise<Reservation | null>;
	findAll(): Promise<Reservation[]>;
	create(data: CreateReservationInput): Promise<Reservation>;
	updateStatus(id: string, status: ReservationStatus): Promise<Reservation>;
	countActive(): Promise<number>;
	countCancelled(): Promise<number>;
	countCreatedToday(): Promise<number>;
}
