export type UserRecord = {
	id: string;
	email: string;
	passwordHash: string;
	role: 'Admin' | 'Operator';
};

export interface IUserRepository {
	findByEmail(email: string): Promise<UserRecord | null>;
}
