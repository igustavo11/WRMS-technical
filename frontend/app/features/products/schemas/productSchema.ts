import type { TFunction } from 'i18next';
import { z } from 'zod';

export type CreateProductFormValues = {
	sku: string;
	name: string;
	description: string;
	isActive: boolean;
};

export function createProductSchema(t: TFunction) {
	return z.object({
		sku: z.string().min(1, t('products.validation.skuRequired')),
		name: z.string().min(1, t('products.validation.nameRequired')),
		description: z.string(),
		isActive: z.boolean(),
	});
}
