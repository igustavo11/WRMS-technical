import type {
	IUserRepository,
	UserRecord,
} from '../../domain/repositories/IUserRepository';
import { prisma } from '../database/prisma';

export class PrismaUserRepository implements IUserRepository {
	async findByEmail(email: string): Promise<UserRecord | null> {
		const user = await prisma.user.findUnique({ where: { email } });
		return user as UserRecord | null;
	}
}
