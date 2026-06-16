import {
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

	return app;
}
