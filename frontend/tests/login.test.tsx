import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '~/features/auth/context/AuthContext';
import { LoginPage } from '~/features/auth/pages/LoginPage';
import * as authApi from '~/features/auth/services/authApi';

vi.mock('~/features/auth/services/authApi', () => ({
	loginRequest: vi.fn(),
}));

function renderLoginPage() {
	const queryClient = new QueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<MemoryRouter>
					<LoginPage />
				</MemoryRouter>
			</AuthProvider>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
});

describe('LoginPage', () => {
	it('shows validation errors when submitting empty fields', async () => {
		const user = userEvent.setup();
		renderLoginPage();

		await user.click(screen.getByRole('button', { name: /entrar/i }));

		expect(
			await screen.findByText('Informe um e-mail válido'),
		).toBeInTheDocument();
		expect(await screen.findByText('Informe sua senha')).toBeInTheDocument();
	});

	it('calls the login API with the entered credentials', async () => {
		vi.mocked(authApi.loginRequest).mockResolvedValue({
			token: 'fake-token',
			user: { id: '1', email: 'operador@wtec.com', role: 'Operator' },
		});
		const user = userEvent.setup();
		renderLoginPage();

		await user.type(
			screen.getByLabelText('E-mail de acesso'),
			'operador@wtec.com',
		);
		await user.type(screen.getByLabelText('Senha'), '123456');
		await user.click(screen.getByRole('button', { name: /entrar/i }));

		await waitFor(() => {
			expect(authApi.loginRequest).toHaveBeenCalledWith({
				email: 'operador@wtec.com',
				password: '123456',
			});
		});
	});
});
