import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../../domain/errors/DomainError';
import type { AuthTokenPayload } from '../../infrastructure/auth/JwtService';
import { jwtService } from '../../infrastructure/auth/JwtService';

declare module 'fastify' {
	interface FastifyRequest {
		user?: AuthTokenPayload;
	}
}

export async function authenticate(
	request: FastifyRequest,
	_reply: FastifyReply,
): Promise<void> {
	const authorization = request.headers.authorization;

	if (!authorization?.startsWith('Bearer ')) {
		throw new DomainError(
			'Missing or invalid authentication token.',
			'UNAUTHORIZED',
			401,
		);
	}

	const token = authorization.slice('Bearer '.length);

	try {
		request.user = jwtService.verify(token);
	} catch {
		throw new DomainError(
			'Missing or invalid authentication token.',
			'UNAUTHORIZED',
			401,
		);
	}
}
