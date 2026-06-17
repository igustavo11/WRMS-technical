import { z } from 'zod';

export const createWarehouseSchema = z.object({
	name: z.string().min(1, 'Warehouse name is required'),
	location: z.string().min(1, 'Location is required'),
	isActive: z.boolean(),
});

export type CreateWarehouseFormValues = z.infer<typeof createWarehouseSchema>;
