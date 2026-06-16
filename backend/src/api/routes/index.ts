import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { authRoutes } from './auth.routes';
import { dashboardRoutes } from './dashboard.routes';
import { inventoryRoutes } from './inventory.routes';
import { productsRoutes } from './products.routes';
import { reservationsRoutes } from './reservations.routes';
import { warehousesRoutes } from './warehouses.routes';

export const routes: FastifyPluginAsyncZod = async (app) => {
	await app.register(authRoutes);
	await app.register(productsRoutes);
	await app.register(warehousesRoutes);
	await app.register(inventoryRoutes);
	await app.register(reservationsRoutes);
	await app.register(dashboardRoutes);
};
