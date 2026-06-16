import bcrypt from 'bcryptjs';
import { DomainError } from '../../../domain/errors/DomainError';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { JwtService } from '../../../infrastructure/auth/JwtService';

export type LoginInput = {
	email: string;
	password: string;
};

export type LoginOutput = {
	token: string;
	user: {
		id: string;
		email: string;
		role: 'Admin' | 'Operator';
	};
};

export class Login {
	constructor(
		private readonly userRepository: IUserRepository,
		private readonly jwtService: JwtService,
	) {}

	async execute(input: LoginInput): Promise<LoginOutput> {
		const user = await this.userRepository.findByEmail(input.email);

		if (!user) {
			throw new DomainError(
				'Invalid email or password.',
				'INVALID_CREDENTIALS',
				401,
			);
		}

		const passwordMatches = await bcrypt.compare(
			input.password,
			user.passwordHash,
		);

		if (!passwordMatches) {
			throw new DomainError(
				'Invalid email or password.',
				'INVALID_CREDENTIALS',
				401,
			);
		}

		const token = this.jwtService.sign({
			sub: user.id,
			email: user.email,
			role: user.role,
		});

		return {
			token,
			user: { id: user.id, email: user.email, role: user.role },
		};
	}
}
