import { z } from 'zod';

export const createReservationBodySchema = z.object({
	productId: z.uuid(),
	warehouseId: z.uuid(),
	quantity: z.number().int().min(1).describe('Quantity to reserve (minimum 1)'),
});

export const reservationIdParamsSchema = z.object({
	id: z.uuid(),
});

export const reservationResponseSchema = z.object({
	id: z.string(),
	productId: z.string(),
	warehouseId: z.string(),
	quantity: z.number(),
	status: z.enum(['Pending', 'Confirmed', 'Cancelled']),
	createdAt: z.date(),
	updatedAt: z.date(),
});
