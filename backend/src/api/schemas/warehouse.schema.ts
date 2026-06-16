import { z } from 'zod';

export const createWarehouseBodySchema = z.object({
	name: z.string().min(1).describe('Warehouse name'),
	location: z.string().min(1).describe('Warehouse location'),
	isActive: z.boolean().optional().describe('Whether the warehouse is active'),
});

export const warehouseResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	location: z.string(),
	isActive: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});
