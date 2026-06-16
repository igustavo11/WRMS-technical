import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { GetDashboard } from '../../application/use-cases/dashboard/GetDashboard';
import { PrismaInventoryRepository } from '../../infrastructure/repositories/PrismaInventoryRepository';
import { PrismaProductRepository } from '../../infrastructure/repositories/PrismaProductRepository';
import { PrismaReservationRepository } from '../../infrastructure/repositories/PrismaReservationRepository';
import { PrismaWarehouseRepository } from '../../infrastructure/repositories/PrismaWarehouseRepository';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { dashboardResponseSchema } from '../schemas/dashboard.schema';
import { errorResponseSchema } from '../schemas/error.schema';

export const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
	const productRepository = new PrismaProductRepository();
	const warehouseRepository = new PrismaWarehouseRepository();
	const inventoryRepository = new PrismaInventoryRepository();
	const reservationRepository = new PrismaReservationRepository();
	const getDashboard = new GetDashboard(
		productRepository,
		warehouseRepository,
		inventoryRepository,
		reservationRepository,
	);

	app.get(
		'/dashboard',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Dashboard'],
				summary: 'Get dashboard metrics',
				security: [{ bearerAuth: [] }],
				response: {
					200: dashboardResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async () => {
			return getDashboard.execute();
		},
	);
};
