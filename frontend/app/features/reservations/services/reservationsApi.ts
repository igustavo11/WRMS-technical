import { apiClient } from '~/shared/api/client';

export type Reservation = {
	id: string;
	productId: string;
	warehouseId: string;
	quantity: number;
	status: 'Pending' | 'Confirmed' | 'Cancelled';
	createdAt: string;
	updatedAt: string;
};

export type CreateReservationDto = {
	productId: string;
	warehouseId: string;
	quantity: number;
};

export const getReservations = (): Promise<Reservation[]> =>
	apiClient.get('/reservations').then((r) => r.data);

export const createReservation = (
	dto: CreateReservationDto,
): Promise<Reservation> =>
	apiClient.post('/reservations', dto).then((r) => r.data);

export const cancelReservation = (id: string): Promise<void> =>
	apiClient.put(`/reservations/${id}/cancel`).then((r) => r.data);
