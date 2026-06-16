import { useMutation } from '@tanstack/react-query';
import { type LoginInput, loginRequest } from '../services/authApi';
import { useAuth } from './useAuth';

export function useLogin() {
	const { login } = useAuth();

	return useMutation({
		mutationFn: (input: LoginInput) => loginRequest(input),
		onSuccess: (result) => {
			login(result.token, result.user);
		},
	});
}
