import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '~/features/auth/context/AuthContext';
import { NewProductModal } from '~/features/products/components/NewProductModal';
import ProductsPage from '~/features/products/pages/ProductsPage';
import type { Product } from '~/features/products/services/productsApi';

vi.mock('~/features/products/hooks/useProducts', () => ({
	useProducts: vi.fn(),
}));
vi.mock('~/features/products/hooks/useCreateProduct', () => ({
	useCreateProduct: vi.fn(),
}));
vi.mock('~/features/products/hooks/useUpdateProduct', () => ({
	useUpdateProduct: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

import toast from 'react-hot-toast';
import { useCreateProduct } from '~/features/products/hooks/useCreateProduct';
import { useProducts } from '~/features/products/hooks/useProducts';
import { useUpdateProduct } from '~/features/products/hooks/useUpdateProduct';

const mockProducts: Product[] = [
	{
		id: '1',
		sku: 'SKU-001',
		name: 'Produto Ativo',
		description: 'Descricao ativo',
		isActive: true,
		createdAt: '2026-06-16T10:00:00.000Z',
		updatedAt: '2026-06-16T10:00:00.000Z',
	},
	{
		id: '2',
		sku: 'SKU-002',
		name: 'Produto Inativo',
		description: null,
		isActive: false,
		createdAt: '2026-06-16T11:00:00.000Z',
		updatedAt: '2026-06-16T11:00:00.000Z',
	},
];

function createQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
}

function renderWithProviders(ui: React.ReactElement) {
	const queryClient = createQueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<MemoryRouter>{ui}</MemoryRouter>
			</AuthProvider>
		</QueryClientProvider>,
	);
}

// biome-ignore lint/suspicious/noExplicitAny: mock return values for query hooks
function mockQueryReturn(overrides: Record<string, unknown>): any {
	return {
		data: undefined,
		isLoading: false,
		isError: false,
		error: null,
		status: 'success' as const,
		...overrides,
	};
}

// biome-ignore lint/suspicious/noExplicitAny: mock return values for mutation hooks
function mockMutationReturn(overrides: Record<string, unknown>): any {
	return {
		mutate: vi.fn(),
		mutateAsync: vi.fn(),
		isPending: false,
		isIdle: true,
		isSuccess: false,
		isError: false,
		status: 'idle' as const,
		reset: vi.fn(),
		...overrides,
	};
}

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
	vi.mocked(useCreateProduct).mockReturnValue(mockMutationReturn({}));
	vi.mocked(useUpdateProduct).mockReturnValue(mockMutationReturn({}));
});

describe('ProductsPage', () => {
	it('renders loading skeleton', () => {
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: undefined, isLoading: true }),
		);

		const { container } = renderWithProviders(<ProductsPage />);

		const skeletons = container.querySelectorAll('.animate-pulse');
		expect(skeletons.length).toBe(3);
	});

	it('renders product rows', () => {
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);

		renderWithProviders(<ProductsPage />);

		expect(screen.getByText('SKU-001')).toBeInTheDocument();
		expect(screen.getByText('SKU-002')).toBeInTheDocument();
	});

	it('inactive row has opacity-60', () => {
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);

		const { container } = renderWithProviders(<ProductsPage />);

		const rows = container.querySelectorAll('tr');
		const inactiveRow = rows[2];
		expect(inactiveRow.classList.contains('opacity-60')).toBe(true);
	});

	it('"Apenas ativos" toggle filters inactive', async () => {
		const user = userEvent.setup();
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);

		renderWithProviders(<ProductsPage />);

		expect(screen.getByText('SKU-002')).toBeInTheDocument();

		const switches = screen.getAllByRole('switch');
		await user.click(switches[0]);

		expect(screen.queryByText('SKU-002')).not.toBeInTheDocument();
	});

	it('search by SKU filters list', async () => {
		const user = userEvent.setup();
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);

		renderWithProviders(<ProductsPage />);

		const searchInput = screen.getByPlaceholderText(
			'Buscar por SKU ou Nome...',
		);
		await user.type(searchInput, 'SKU-001');

		expect(screen.getByText('SKU-001')).toBeInTheDocument();
		expect(screen.queryByText('SKU-002')).not.toBeInTheDocument();
	});

	it('search by name filters list', async () => {
		const user = userEvent.setup();
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);

		renderWithProviders(<ProductsPage />);

		const searchInput = screen.getByPlaceholderText(
			'Buscar por SKU ou Nome...',
		);
		await user.type(searchInput, 'Inativo');

		expect(screen.getByText('SKU-002')).toBeInTheDocument();
		expect(screen.queryByText('SKU-001')).not.toBeInTheDocument();
	});

	it('"Novo Produto" button opens modal', async () => {
		const user = userEvent.setup();
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);

		renderWithProviders(<ProductsPage />);

		await user.click(screen.getByRole('button', { name: '+ Novo Produto' }));

		expect(screen.getByText('Novo Produto')).toBeInTheDocument();
	});

	it('pencil button opens edit modal', async () => {
		const user = userEvent.setup();
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);

		renderWithProviders(<ProductsPage />);

		const editButtons = screen.getAllByRole('button', {
			name: 'Editar produto',
		});
		await user.click(editButtons[0]);

		expect(screen.getByText('Editar Produto')).toBeInTheDocument();
	});

	it('edit modal pre-fills existing values', async () => {
		const user = userEvent.setup();
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);

		renderWithProviders(<ProductsPage />);

		await user.click(
			screen.getAllByRole('button', { name: 'Editar produto' })[0],
		);

		const inputs = screen.getAllByRole('textbox');
		expect(inputs[0]).toHaveValue('SKU-001');
		expect(inputs[1]).toHaveValue('Produto Ativo');
	});
});

describe('NewProductModal', () => {
	it('SKU generator fills input', async () => {
		const user = userEvent.setup();
		vi.mocked(useCreateProduct).mockReturnValue(mockMutationReturn({}));
		vi.spyOn(crypto, 'randomUUID').mockReturnValue(
			'generated-sku-uuid' as `${string}-${string}-${string}-${string}-${string}`,
		);

		renderWithProviders(<NewProductModal open={true} onClose={vi.fn()} />);

		await user.click(screen.getByRole('button', { name: 'Gerar SKU' }));

		const skuInput = screen.getAllByRole('textbox')[0];
		expect(skuInput).toHaveValue('generated-sku-uuid');
	});

	it('form validation — required fields', async () => {
		const user = userEvent.setup();
		vi.mocked(useCreateProduct).mockReturnValue(mockMutationReturn({}));

		renderWithProviders(<NewProductModal open={true} onClose={vi.fn()} />);

		await user.click(screen.getByRole('button', { name: 'Criar Produto' }));

		expect(await screen.findByText('SKU é obrigatório')).toBeInTheDocument();
		expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
	});

	it('successful creation', async () => {
		const onClose = vi.fn();
		const user = userEvent.setup();
		vi.mocked(useCreateProduct).mockReturnValue(
			mockMutationReturn({
				mutateAsync: vi.fn().mockResolvedValue({}),
			}),
		);

		renderWithProviders(<NewProductModal open={true} onClose={onClose} />);

		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'test-sku');
		await user.type(inputs[1], 'Test Product');
		await user.click(screen.getByRole('button', { name: 'Criar Produto' }));

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledOnce();
		});
		expect(toast.success).toHaveBeenCalledWith('Produto criado com sucesso.');
	});

	it('409 error shows SKU field error', async () => {
		const user = userEvent.setup();
		const axiosError = {
			isAxiosError: true,
			response: { status: 409, data: { error: 'DUPLICATE_SKU' } },
		};
		vi.mocked(useCreateProduct).mockReturnValue(
			mockMutationReturn({
				mutateAsync: vi.fn().mockRejectedValue(axiosError),
			}),
		);

		renderWithProviders(<NewProductModal open={true} onClose={vi.fn()} />);

		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'existing-sku');
		await user.type(inputs[1], 'Test Product');
		await user.click(screen.getByRole('button', { name: 'Criar Produto' }));

		await waitFor(() => {
			expect(
				screen.getByText('SKU já cadastrado no sistema.'),
			).toBeInTheDocument();
		});
	});

	it('Cancelar resets form and closes', async () => {
		const onClose = vi.fn();
		const user = userEvent.setup();
		vi.mocked(useCreateProduct).mockReturnValue(mockMutationReturn({}));

		const { rerender } = render(
			<QueryClientProvider client={createQueryClient()}>
				<AuthProvider>
					<MemoryRouter>
						<NewProductModal open={true} onClose={onClose} />
					</MemoryRouter>
				</AuthProvider>
			</QueryClientProvider>,
		);

		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'some-sku');
		await user.type(inputs[1], 'Some Product');

		await user.click(screen.getByRole('button', { name: 'Cancelar' }));

		expect(onClose).toHaveBeenCalledOnce();

		rerender(
			<QueryClientProvider client={createQueryClient()}>
				<AuthProvider>
					<MemoryRouter>
						<NewProductModal open={true} onClose={onClose} />
					</MemoryRouter>
				</AuthProvider>
			</QueryClientProvider>,
		);

		await waitFor(() => {
			const reopenedInputs = screen.getAllByRole('textbox');
			expect(reopenedInputs[0]).toHaveValue('');
			expect(reopenedInputs[1]).toHaveValue('');
		});
	});

	it('edit mode shows "Editar Produto" title', () => {
		vi.mocked(useUpdateProduct).mockReturnValue(mockMutationReturn({}));

		renderWithProviders(
			<NewProductModal
				open={true}
				onClose={vi.fn()}
				editProduct={mockProducts[0]}
			/>,
		);

		expect(screen.getByText('Editar Produto')).toBeInTheDocument();
	});

	it('edit mode pre-fills product data', () => {
		vi.mocked(useUpdateProduct).mockReturnValue(mockMutationReturn({}));

		renderWithProviders(
			<NewProductModal
				open={true}
				onClose={vi.fn()}
				editProduct={mockProducts[0]}
			/>,
		);

		const inputs = screen.getAllByRole('textbox');
		expect(inputs[0]).toHaveValue('SKU-001');
		expect(inputs[1]).toHaveValue('Produto Ativo');
	});

	it('edit mode SKU is disabled', () => {
		vi.mocked(useUpdateProduct).mockReturnValue(mockMutationReturn({}));

		renderWithProviders(
			<NewProductModal
				open={true}
				onClose={vi.fn()}
				editProduct={mockProducts[0]}
			/>,
		);

		const inputs = screen.getAllByRole('textbox');
		expect(inputs[0]).toBeDisabled();
	});

	it('edit mode submit calls updateProduct', async () => {
		const onClose = vi.fn();
		const updateMutateAsync = vi.fn().mockResolvedValue({});
		const user = userEvent.setup();
		vi.mocked(useUpdateProduct).mockReturnValue(
			mockMutationReturn({
				mutateAsync: updateMutateAsync,
			}),
		);

		renderWithProviders(
			<NewProductModal
				open={true}
				onClose={onClose}
				editProduct={mockProducts[0]}
			/>,
		);

		const inputs = screen.getAllByRole('textbox');
		await user.clear(inputs[1]);
		await user.type(inputs[1], 'Updated Name');
		await user.click(screen.getByRole('button', { name: 'Salvar' }));

		await waitFor(() => {
			expect(updateMutateAsync).toHaveBeenCalledWith({
				id: '1',
				data: {
					name: 'Updated Name',
					description: 'Descricao ativo',
					isActive: true,
				},
			});
		});
		expect(onClose).toHaveBeenCalledOnce();
		expect(toast.success).toHaveBeenCalledWith(
			'Produto atualizado com sucesso.',
		);
	});

	it('edit mode submit with null description', async () => {
		const onClose = vi.fn();
		const updateMutateAsync = vi.fn().mockResolvedValue({});
		const user = userEvent.setup();
		vi.mocked(useUpdateProduct).mockReturnValue(
			mockMutationReturn({
				mutateAsync: updateMutateAsync,
			}),
		);

		renderWithProviders(
			<NewProductModal
				open={true}
				onClose={onClose}
				editProduct={mockProducts[1]}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'Salvar' }));

		await waitFor(() => {
			expect(updateMutateAsync).toHaveBeenCalledWith({
				id: '2',
				data: {
					name: 'Produto Inativo',
					description: null,
					isActive: false,
				},
			});
		});
	});

	it('edit mode error shows toast', async () => {
		const user = userEvent.setup();
		vi.mocked(useUpdateProduct).mockReturnValue(
			mockMutationReturn({
				mutateAsync: vi.fn().mockRejectedValue(new Error('fail')),
			}),
		);

		renderWithProviders(
			<NewProductModal
				open={true}
				onClose={vi.fn()}
				editProduct={mockProducts[0]}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'Salvar' }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				'Erro ao atualizar produto. Tente novamente.',
			);
		});
	});
});
