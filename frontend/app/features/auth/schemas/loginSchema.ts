import type { TFunction } from 'i18next';
import { z } from 'zod';

export type LoginFormValues = {
	email: string;
	password: string;
};

export function createLoginSchema(t: TFunction) {
	return z.object({
		email: z.email(t('auth.validation.emailInvalid')),
		password: z.string().min(1, t('auth.validation.passwordRequired')),
	});
}
