import { z } from 'zod';

export const createProductSchema = z.object({
	sku: z.string().min(1, 'SKU é obrigatório'),
	name: z.string().min(1, 'Nome é obrigatório'),
	description: z.string().optional(),
	isActive: z.boolean(),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
