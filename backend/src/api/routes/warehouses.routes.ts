import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { CreateWarehouse } from '../../application/use-cases/warehouses/CreateWarehouse';
import { GetWarehouses } from '../../application/use-cases/warehouses/GetWarehouses';
import { PrismaWarehouseRepository } from '../../infrastructure/repositories/PrismaWarehouseRepository';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { errorResponseSchema } from '../schemas/error.schema';
import {
	createWarehouseBodySchema,
	warehouseResponseSchema,
} from '../schemas/warehouse.schema';

export const warehousesRoutes: FastifyPluginAsyncZod = async (app) => {
	const warehouseRepository = new PrismaWarehouseRepository();
	const createWarehouse = new CreateWarehouse(warehouseRepository);
	const getWarehouses = new GetWarehouses(warehouseRepository);

	app.get(
		'/warehouses',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Warehouses'],
				summary: 'List all warehouses',
				security: [{ bearerAuth: [] }],
				response: {
					200: warehouseResponseSchema.array(),
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async () => {
			return getWarehouses.execute();
		},
	);

	app.post(
		'/warehouses',
		{
			preHandler: [authenticate, authorize(['Admin'])],
			schema: {
				tags: ['Warehouses'],
				summary: 'Create a warehouse',
				security: [{ bearerAuth: [] }],
				body: createWarehouseBodySchema,
				response: {
					201: warehouseResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await createWarehouse.execute(request.body);
			reply.status(201).send(result);
		},
	);
};
