import { z } from 'zod';

export const createReservationSchema = z.object({
	productId: z.string().min(1, 'Selecione um produto'),
	warehouseId: z.string().min(1, 'Selecione um armazém'),
	quantity: z
		.number({ message: 'Quantidade mínima é 1' })
		.int('Quantidade deve ser um número inteiro')
		.min(1, 'Quantidade mínima é 1'),
});

export type CreateReservationFormValues = z.infer<
	typeof createReservationSchema
>;
