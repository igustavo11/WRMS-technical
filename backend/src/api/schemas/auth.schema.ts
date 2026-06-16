import { z } from 'zod';

export const loginBodySchema = z.object({
	email: z.email().describe('Registered user email'),
	password: z.string().min(1).describe('User password'),
});

export const loginResponseSchema = z.object({
	token: z.string().describe('JWT access token'),
	user: z.object({
		id: z.string(),
		email: z.string(),
		role: z.enum(['Admin', 'Operator']),
	}),
});
