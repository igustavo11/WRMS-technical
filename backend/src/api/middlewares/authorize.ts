import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../../domain/errors/DomainError';
import type { AuthTokenPayload } from '../../infrastructure/auth/JwtService';

export function authorize(allowedRoles: AuthTokenPayload['role'][]) {
	return async function authorizeHandler(
		request: FastifyRequest,
		_reply: FastifyReply,
	): Promise<void> {
		const role = request.user?.role;

		if (!role || !allowedRoles.includes(role)) {
			throw new DomainError('Insufficient permissions.', 'FORBIDDEN', 403);
		}
	};
}
