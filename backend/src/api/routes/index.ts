import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { authRoutes } from './auth.routes';
import { productsRoutes } from './products.routes';

export const routes: FastifyPluginAsyncZod = async (app) => {
	await app.register(authRoutes);
	await app.register(productsRoutes);
};
