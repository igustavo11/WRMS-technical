import type { AuthUser } from '~/shared/api/authToken';
import { apiClient } from '~/shared/api/client';

export type LoginInput = {
	email: string;
	password: string;
};

export type LoginResult = {
	token: string;
	user: AuthUser;
};

export async function loginRequest(input: LoginInput): Promise<LoginResult> {
	const response = await apiClient.post<LoginResult>('/auth/login', input);
	return response.data;
}
