export type ReservationStatus = 'Pending' | 'Confirmed' | 'Cancelled';

export type Reservation = {
	id: string;
	productId: string;
	warehouseId: string;
	quantity: number;
	status: ReservationStatus;
	createdAt: Date;
	updatedAt: Date;
};
