import type { TFunction } from 'i18next';
import { z } from 'zod';

export type CreateWarehouseFormValues = {
	name: string;
	location: string;
	isActive: boolean;
};

export function createWarehouseSchema(t: TFunction) {
	return z.object({
		name: z.string().min(1, t('warehouses.validation.nameRequired')),
		location: z.string().min(1, t('warehouses.validation.locationRequired')),
		isActive: z.boolean(),
	});
}
