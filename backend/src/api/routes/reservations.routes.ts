import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { CancelReservation } from '../../application/use-cases/reservations/CancelReservation';
import { CreateReservation } from '../../application/use-cases/reservations/CreateReservation';
import { GetReservations } from '../../application/use-cases/reservations/GetReservations';
import { unitOfWork } from '../../infrastructure/database/PrismaUnitOfWork';
import { PrismaReservationRepository } from '../../infrastructure/repositories/PrismaReservationRepository';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { errorResponseSchema } from '../schemas/error.schema';
import {
	createReservationBodySchema,
	reservationIdParamsSchema,
	reservationResponseSchema,
} from '../schemas/reservation.schema';

export const reservationsRoutes: FastifyPluginAsyncZod = async (app) => {
	const reservationRepository = new PrismaReservationRepository();
	const createReservation = new CreateReservation(unitOfWork);
	const cancelReservation = new CancelReservation(unitOfWork);
	const getReservations = new GetReservations(reservationRepository);

	app.get(
		'/reservations',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Reservations'],
				summary: 'List full reservation history',
				security: [{ bearerAuth: [] }],
				response: {
					200: reservationResponseSchema.array(),
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async () => {
			return getReservations.execute();
		},
	);

	app.post(
		'/reservations',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Reservations'],
				summary: 'Create a reservation',
				security: [{ bearerAuth: [] }],
				body: createReservationBodySchema,
				response: {
					201: reservationResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					422: errorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await createReservation.execute(request.body);
			reply.status(201).send(result);
		},
	);

	app.put(
		'/reservations/:id/cancel',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Reservations'],
				summary: 'Cancel a reservation',
				security: [{ bearerAuth: [] }],
				params: reservationIdParamsSchema,
				response: {
					200: reservationResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					422: errorResponseSchema,
				},
			},
		},
		async (request) => {
			return cancelReservation.execute(request.params.id);
		},
	);
};
