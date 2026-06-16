import jwt, { type SignOptions } from 'jsonwebtoken';

export type AuthTokenPayload = {
	sub: string;
	email: string;
	role: 'Admin' | 'Operator';
};

export class JwtService {
	constructor(
		private readonly secret: string,
		private readonly expiresIn: string,
	) {}

	sign(payload: AuthTokenPayload): string {
		return jwt.sign(payload, this.secret, {
			expiresIn: this.expiresIn as SignOptions['expiresIn'],
		});
	}

	verify(token: string): AuthTokenPayload {
		return jwt.verify(token, this.secret) as AuthTokenPayload;
	}
}

export const jwtService = new JwtService(
	process.env.JWT_SECRET as string,
	process.env.JWT_EXPIRES_IN as string,
);
