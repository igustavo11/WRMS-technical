import { z } from 'zod';

export const productIdParamsSchema = z.object({
	id: z.uuid(),
});

export const createProductBodySchema = z.object({
	sku: z.string().min(1).describe('Unique product SKU'),
	name: z.string().min(1).describe('Product name'),
	description: z.string().nullish().describe('Optional product description'),
	isActive: z.boolean().optional().describe('Whether the product is active'),
});

export const updateProductBodySchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().nullable().optional(),
	isActive: z.boolean().optional(),
});

export const productResponseSchema = z.object({
	id: z.string(),
	sku: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	isActive: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});
