import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { authRoutes } from './auth.routes';

export const routes: FastifyPluginAsyncZod = async (app) => {
	await app.register(authRoutes);
};
