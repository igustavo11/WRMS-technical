import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '~/features/auth/context/AuthContext';
import { NewWarehouseModal } from '~/features/warehouses/components/NewWarehouseModal';
import WarehousesPage from '~/features/warehouses/pages/WarehousesPage';
import type { Warehouse } from '~/features/warehouses/services/warehousesApi';

vi.mock('~/features/warehouses/hooks/useWarehouses', () => ({
	useWarehouses: vi.fn(),
}));
vi.mock('~/features/warehouses/hooks/useCreateWarehouse', () => ({
	useCreateWarehouse: vi.fn(),
}));
vi.mock('~/features/dashboard/hooks/useDashboard', () => ({
	useDashboard: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return { ...actual, useNavigate: () => mockNavigate };
});

import toast from 'react-hot-toast';
import { useDashboard } from '~/features/dashboard/hooks/useDashboard';
import { useCreateWarehouse } from '~/features/warehouses/hooks/useCreateWarehouse';
import { useWarehouses } from '~/features/warehouses/hooks/useWarehouses';

const mockWarehouses: Warehouse[] = [
	{
		id: '1',
		name: 'Armazem Central',
		location: 'Sao Paulo, SP',
		isActive: true,
		createdAt: '2026-06-16T10:00:00.000Z',
		updatedAt: '2026-06-16T10:00:00.000Z',
	},
	{
		id: '2',
		name: 'Armazem Sul',
		location: 'Curitiba, PR',
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
	vi.mocked(useCreateWarehouse).mockReturnValue(mockMutationReturn({}));
	vi.mocked(useDashboard).mockReturnValue(
		mockQueryReturn({
			data: {
				metrics: {},
				lowStockItems: [],
				recentReservations: [],
				warehouseMetrics: [],
			},
		}),
	);
});

describe('WarehousesPage', () => {
	it('renders loading skeletons', () => {
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: undefined, isLoading: true }),
		);

		const { container } = renderWithProviders(<WarehousesPage />);

		const skeletons = container.querySelectorAll('.animate-pulse');
		expect(skeletons.length).toBeGreaterThan(0);
		expect(screen.queryByText('Armazem Central')).not.toBeInTheDocument();
	});

	it('renders warehouse cards', () => {
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<WarehousesPage />);

		expect(screen.getByText('Armazem Central')).toBeInTheDocument();
		expect(screen.getByText('Armazem Sul')).toBeInTheDocument();
	});

	it('inactive card has opacity-70', () => {
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<WarehousesPage />);

		const inactiveCard = screen.getByText('Armazem Sul').closest('.opacity-70');
		expect(inactiveCard).toBeInTheDocument();
	});

	it('active card shows ATIVO badge', () => {
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<WarehousesPage />);

		expect(screen.getByText('ATIVO')).toBeInTheDocument();
	});

	it('inactive card shows INATIVO badge', () => {
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<WarehousesPage />);

		expect(screen.getByText('INATIVO')).toBeInTheDocument();
	});

	it('metrics from dashboard are displayed', () => {
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: [mockWarehouses[0]] }),
		);
		vi.mocked(useDashboard).mockReturnValue(
			mockQueryReturn({
				data: {
					metrics: {},
					lowStockItems: [],
					recentReservations: [],
					warehouseMetrics: [
						{
							warehouseName: 'Armazem Central',
							location: 'Sao Paulo, SP',
							totalProducts: 5,
							totalQuantity: 150,
							activeReservations: 2,
						},
					],
				},
			}),
		);

		renderWithProviders(<WarehousesPage />);

		expect(screen.getByText('5')).toBeInTheDocument();
		expect(screen.getByText('150')).toBeInTheDocument();
	});

	it('warehouse not in metrics shows zeros', () => {
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: [mockWarehouses[0]] }),
		);
		vi.mocked(useDashboard).mockReturnValue(
			mockQueryReturn({
				data: {
					metrics: {},
					lowStockItems: [],
					recentReservations: [],
					warehouseMetrics: [],
				},
			}),
		);

		renderWithProviders(<WarehousesPage />);

		const zeros = screen.getAllByText('0');
		expect(zeros.length).toBeGreaterThanOrEqual(2);
	});

	it('empty state renders', () => {
		vi.mocked(useWarehouses).mockReturnValue(mockQueryReturn({ data: [] }));

		renderWithProviders(<WarehousesPage />);

		expect(screen.getByText('Nenhum armazém cadastrado.')).toBeInTheDocument();
	});

	it('"Novo Armazém" opens modal', async () => {
		const user = userEvent.setup();
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<WarehousesPage />);

		await user.click(screen.getByRole('button', { name: '+ Novo Armazém' }));

		expect(screen.getByText('Novo Armazém')).toBeInTheDocument();
	});

	it('"Ver Inventário" navigates to /inventory', async () => {
		const user = userEvent.setup();
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: [mockWarehouses[0]] }),
		);

		renderWithProviders(<WarehousesPage />);

		await user.click(screen.getByRole('button', { name: /Ver Inventário/i }));

		expect(mockNavigate).toHaveBeenCalledWith('/inventory', {
			state: { warehouseFilter: '1' },
		});
	});
});

describe('NewWarehouseModal', () => {
	it('form validation — required fields', async () => {
		const user = userEvent.setup();
		vi.mocked(useCreateWarehouse).mockReturnValue(mockMutationReturn({}));

		renderWithProviders(<NewWarehouseModal open={true} onClose={vi.fn()} />);

		await user.click(screen.getByRole('button', { name: 'Salvar Armazém' }));

		expect(
			await screen.findByText('Nome do armazém é obrigatório'),
		).toBeInTheDocument();
		expect(
			await screen.findByText('Localização é obrigatória'),
		).toBeInTheDocument();
	});

	it('successful creation', async () => {
		const onClose = vi.fn();
		const user = userEvent.setup();
		vi.mocked(useCreateWarehouse).mockReturnValue(
			mockMutationReturn({
				mutateAsync: vi.fn().mockResolvedValue({}),
			}),
		);

		renderWithProviders(<NewWarehouseModal open={true} onClose={onClose} />);

		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'Armazem Teste');
		await user.type(inputs[1], 'Belo Horizonte, MG');
		await user.click(screen.getByRole('button', { name: 'Salvar Armazém' }));

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledOnce();
		});
		expect(toast.success).toHaveBeenCalledWith('Armazém criado com sucesso.');
	});

	it('Cancelar resets and closes', async () => {
		const onClose = vi.fn();
		const user = userEvent.setup();
		vi.mocked(useCreateWarehouse).mockReturnValue(mockMutationReturn({}));

		const { rerender } = render(
			<QueryClientProvider client={createQueryClient()}>
				<AuthProvider>
					<MemoryRouter>
						<NewWarehouseModal open={true} onClose={onClose} />
					</MemoryRouter>
				</AuthProvider>
			</QueryClientProvider>,
		);

		const inputs = screen.getAllByRole('textbox');
		await user.type(inputs[0], 'Test Warehouse');
		await user.type(inputs[1], 'Test Location');

		await user.click(screen.getByRole('button', { name: 'Cancelar' }));

		expect(onClose).toHaveBeenCalledOnce();

		rerender(
			<QueryClientProvider client={createQueryClient()}>
				<AuthProvider>
					<MemoryRouter>
						<NewWarehouseModal open={true} onClose={onClose} />
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
});
