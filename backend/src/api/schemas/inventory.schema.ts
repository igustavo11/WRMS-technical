import { z } from 'zod';

export const adjustInventoryBodySchema = z.object({
	productId: z.uuid(),
	warehouseId: z.uuid(),
	quantity: z
		.number()
		.int()
		.describe(
			'Absolute quantity to set. Negative values are rejected with 422, not 400.',
		),
});

export const inventoryResponseSchema = z.object({
	id: z.string(),
	productId: z.string(),
	warehouseId: z.string(),
	quantity: z.number(),
	updatedAt: z.date(),
});
