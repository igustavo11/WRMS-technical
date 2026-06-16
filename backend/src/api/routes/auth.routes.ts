import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { Login } from '../../application/use-cases/auth/Login';
import { jwtService } from '../../infrastructure/auth/JwtService';
import { PrismaUserRepository } from '../../infrastructure/repositories/PrismaUserRepository';
import { loginBodySchema, loginResponseSchema } from '../schemas/auth.schema';
import { errorResponseSchema } from '../schemas/error.schema';

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
	const login = new Login(new PrismaUserRepository(), jwtService);

	app.post(
		'/auth/login',
		{
			schema: {
				tags: ['Auth'],
				summary: 'Authenticate and issue a JWT',
				body: loginBodySchema,
				response: {
					200: loginResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await login.execute(request.body);
			reply.status(200).send(result);
		},
	);
};
