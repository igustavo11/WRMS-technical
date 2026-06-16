import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { AdjustInventory } from '../../application/use-cases/inventory/AdjustInventory';
import { GetInventory } from '../../application/use-cases/inventory/GetInventory';
import { PrismaInventoryRepository } from '../../infrastructure/repositories/PrismaInventoryRepository';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { errorResponseSchema } from '../schemas/error.schema';
import {
	adjustInventoryBodySchema,
	inventoryResponseSchema,
} from '../schemas/inventory.schema';

export const inventoryRoutes: FastifyPluginAsyncZod = async (app) => {
	const inventoryRepository = new PrismaInventoryRepository();
	const getInventory = new GetInventory(inventoryRepository);
	const adjustInventory = new AdjustInventory(inventoryRepository);

	app.get(
		'/inventory',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Inventory'],
				summary: 'List all inventory records',
				security: [{ bearerAuth: [] }],
				response: {
					200: inventoryResponseSchema.array(),
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async () => {
			return getInventory.execute();
		},
	);

	app.put(
		'/inventory',
		{
			preHandler: [authenticate, authorize(['Admin'])],
			schema: {
				tags: ['Inventory'],
				summary: 'Adjust inventory quantity',
				security: [{ bearerAuth: [] }],
				body: adjustInventoryBodySchema,
				response: {
					200: inventoryResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					422: errorResponseSchema,
				},
			},
		},
		async (request) => {
			return adjustInventory.execute(request.body);
		},
	);
};
