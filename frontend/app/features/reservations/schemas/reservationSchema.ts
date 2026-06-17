import type { TFunction } from 'i18next';
import { z } from 'zod';

export type CreateReservationFormValues = {
	productId: string;
	warehouseId: string;
	quantity: number;
};

export function createReservationSchema(t: TFunction) {
	return z.object({
		productId: z.string().min(1, t('reservations.validation.selectProduct')),
		warehouseId: z
			.string()
			.min(1, t('reservations.validation.selectWarehouse')),
		quantity: z
			.number({ message: t('reservations.validation.quantityMin') })
			.int(t('reservations.validation.quantityInteger'))
			.min(1, t('reservations.validation.quantityMin')),
	});
}
