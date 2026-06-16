import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import {
	jsonSchemaTransform,
	jsonSchemaTransformObject,
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from '@fastify/type-provider-zod';
import Fastify from 'fastify';
import { errorHandler } from './api/middlewares/errorHandler';

export function buildApp() {
	const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);
	app.setErrorHandler(errorHandler);

	app.register(fastifySwagger, {
		openapi: {
			info: {
				title: 'WRMS API',
				description: 'Warehouse Reservation Management System API',
				version: '1.0.0',
			},
			servers: [
				{
					url: `http://localhost:${process.env.PORT ?? 3333}`,
					description: 'Local server',
				},
			],
			tags: [
				{ name: 'Auth', description: 'Authentication' },
				{ name: 'Products', description: 'Product management' },
				{ name: 'Warehouses', description: 'Warehouse management' },
				{ name: 'Inventory', description: 'Inventory management' },
				{ name: 'Reservations', description: 'Reservation management' },
				{ name: 'Dashboard', description: 'Dashboard metrics' },
			],
			components: {
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
						bearerFormat: 'JWT',
					},
				},
			},
		},
		transform: jsonSchemaTransform,
		transformObject: jsonSchemaTransformObject,
	});

	app.register(fastifySwaggerUi, {
		routePrefix: '/documentation',
	});

	return app;
}
