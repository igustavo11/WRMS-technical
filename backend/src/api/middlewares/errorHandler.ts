import {
	hasZodFastifySchemaValidationErrors,
	isResponseSerializationError,
} from '@fastify/type-provider-zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../../domain/errors/DomainError';

export function errorHandler(
	error: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
): void {
	if (error instanceof DomainError) {
		reply.status(error.statusCode).send({
			error: error.code,
			message: error.message,
			statusCode: error.statusCode,
		});
		return;
	}

	if (hasZodFastifySchemaValidationErrors(error)) {
		const message = error.validation.map((issue) => issue.message).join('; ');

		reply.status(400).send({
			error: 'VALIDATION_ERROR',
			message,
			statusCode: 400,
		});
		return;
	}

	if (isResponseSerializationError(error)) {
		request.log.error({
			issues: error.cause.issues,
			method: error.method,
			url: error.url,
		});

		reply.status(500).send({
			error: 'INTERNAL_SERVER_ERROR',
			message: 'An unexpected error occurred.',
			statusCode: 500,
		});
		return;
	}

	request.log.error(error);

	reply.status(500).send({
		error: 'INTERNAL_SERVER_ERROR',
		message: 'An unexpected error occurred.',
		statusCode: 500,
	});
}
