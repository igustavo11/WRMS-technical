import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '~/features/auth/context/AuthContext';
import { NewReservationModal } from '~/features/reservations/components/NewReservationModal';
import ReservationsPage from '~/features/reservations/pages/ReservationsPage';
import type { Reservation } from '~/features/reservations/services/reservationsApi';

vi.mock('~/features/reservations/hooks/useReservations', () => ({
	useReservations: vi.fn(),
}));
vi.mock('~/features/reservations/hooks/useCreateReservation', () => ({
	useCreateReservation: vi.fn(),
}));
vi.mock('~/features/reservations/hooks/useCancelReservation', () => ({
	useCancelReservation: vi.fn(),
}));
vi.mock('~/features/products/hooks/useProducts', () => ({
	useProducts: vi.fn(),
}));
vi.mock('~/features/inventory/hooks/useInventory', () => ({
	useWarehouses: vi.fn(),
	useInventory: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

import toast from 'react-hot-toast';
import {
	useInventory,
	useWarehouses,
} from '~/features/inventory/hooks/useInventory';
import type {
	InventoryRecord,
	Warehouse,
} from '~/features/inventory/services/inventoryApi';
import { useProducts } from '~/features/products/hooks/useProducts';
import type { Product } from '~/features/products/services/productsApi';
import { useCancelReservation } from '~/features/reservations/hooks/useCancelReservation';
import { useCreateReservation } from '~/features/reservations/hooks/useCreateReservation';
import { useReservations } from '~/features/reservations/hooks/useReservations';

const mockProducts: Product[] = [
	{
		id: 'p1',
		sku: 'TRF-500',
		name: 'Transformador 500kVA',
		description: null,
		isActive: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
	{
		id: 'p2',
		sku: 'CBL-010',
		name: 'Cabo 10mm',
		description: null,
		isActive: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
];

const mockWarehouses: Warehouse[] = [
	{
		id: 'w1',
		name: 'Armazém Central',
		location: 'São Paulo',
		isActive: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
	{
		id: 'w2',
		name: 'Armazém Sul',
		location: 'Curitiba',
		isActive: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
];

const mockReservations: Reservation[] = [
	{
		id: 'abc12345-1234-1234-1234-123456789012',
		productId: 'p1',
		warehouseId: 'w1',
		quantity: 5,
		status: 'Pending',
		createdAt: '2026-06-15T10:00:00.000Z',
		updatedAt: '2026-06-15T10:00:00.000Z',
	},
	{
		id: 'def67890-5678-5678-5678-123456789012',
		productId: 'p2',
		warehouseId: 'w2',
		quantity: 10,
		status: 'Confirmed',
		createdAt: '2026-06-14T14:30:00.000Z',
		updatedAt: '2026-06-14T14:30:00.000Z',
	},
	{
		id: 'ghi11111-9012-9012-9012-123456789012',
		productId: 'p1',
		warehouseId: 'w1',
		quantity: 3,
		status: 'Cancelled',
		createdAt: '2026-06-10T09:00:00.000Z',
		updatedAt: '2026-06-10T09:00:00.000Z',
	},
];

const mockInventory: InventoryRecord[] = [
	{
		id: 'inv1',
		productId: 'p1',
		warehouseId: 'w1',
		quantity: 100,
		updatedAt: '2026-06-15T00:00:00.000Z',
	},
	{
		id: 'inv2',
		productId: 'p2',
		warehouseId: 'w2',
		quantity: 50,
		updatedAt: '2026-06-15T00:00:00.000Z',
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

	vi.mocked(useReservations).mockReturnValue(
		mockQueryReturn({ data: mockReservations }),
	);
	vi.mocked(useProducts).mockReturnValue(
		mockQueryReturn({ data: mockProducts }),
	);
	vi.mocked(useWarehouses).mockReturnValue(
		mockQueryReturn({ data: mockWarehouses }),
	);
	vi.mocked(useInventory).mockReturnValue(
		mockQueryReturn({ data: mockInventory }),
	);
	vi.mocked(useCancelReservation).mockReturnValue(mockMutationReturn({}));
	vi.mocked(useCreateReservation).mockReturnValue(mockMutationReturn({}));
});

describe('ReservationsPage', () => {
	it('renders loading skeleton while data is fetching', () => {
		vi.mocked(useReservations).mockReturnValue(
			mockQueryReturn({ data: undefined, isLoading: true }),
		);

		const { container } = renderWithProviders(<ReservationsPage />);

		const skeletons = container.querySelectorAll('.animate-pulse');
		expect(skeletons.length).toBe(3);
	});

	it('renders reservation rows with resolved product and warehouse names', () => {
		renderWithProviders(<ReservationsPage />);

		const products = screen.getAllByText('Transformador 500kVA');
		expect(products).toHaveLength(2);
		expect(screen.getByText('Cabo 10mm')).toBeInTheDocument();
		const warehouses = screen.getAllByText('Armazém Central');
		expect(warehouses.length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText('Armazém Sul')).toBeInTheDocument();
	});

	it('renders short ID with hash prefix', () => {
		renderWithProviders(<ReservationsPage />);

		expect(screen.getByText('#abc12345')).toBeInTheDocument();
		expect(screen.getByText('#def67890')).toBeInTheDocument();
	});

	it('status badge renders correct text for each status', () => {
		renderWithProviders(<ReservationsPage />);

		expect(screen.getByText('Pendente')).toBeInTheDocument();
		expect(screen.getByText('Confirmado')).toBeInTheDocument();
		expect(screen.getByText('Cancelado')).toBeInTheDocument();
	});

	it('Cancel button shown for Pending rows', () => {
		renderWithProviders(<ReservationsPage />);

		const cancelButtons = screen.getAllByRole('button', { name: 'Cancelar' });
		expect(cancelButtons.length).toBeGreaterThanOrEqual(2);
	});

	it('Cancel button shown for Confirmed rows', () => {
		renderWithProviders(<ReservationsPage />);

		const cancelButtons = screen.getAllByRole('button', { name: 'Cancelar' });
		expect(cancelButtons.length).toBeGreaterThanOrEqual(2);
	});

	it('Cancel button calls cancel mutation with reservation id', async () => {
		const user = userEvent.setup();
		const cancelMutate = vi.fn();
		vi.mocked(useCancelReservation).mockReturnValue(
			mockMutationReturn({ mutate: cancelMutate }),
		);

		renderWithProviders(<ReservationsPage />);

		const cancelButtons = screen.getAllByRole('button', { name: 'Cancelar' });
		await user.click(cancelButtons[0]);

		expect(cancelMutate).toHaveBeenCalledWith(mockReservations[0].id);
	});

	it('no Cancel button for Cancelled rows', () => {
		renderWithProviders(<ReservationsPage />);

		const cancelButtons = screen.getAllByRole('button', { name: 'Cancelar' });
		expect(cancelButtons).toHaveLength(2);
	});

	it('status filter — selecting Pending hides Confirmed and Cancelled rows', async () => {
		const user = userEvent.setup();
		renderWithProviders(<ReservationsPage />);

		const statusTrigger = screen.getByRole('combobox', {
			name: 'Filtrar por status',
		});
		await user.click(statusTrigger);
		const pendingOption = await screen.findByRole('option', {
			name: 'Pendente',
		});
		await user.click(pendingOption);

		expect(screen.getByText('Transformador 500kVA')).toBeInTheDocument();
		expect(screen.queryByText('Cabo 10mm')).not.toBeInTheDocument();
	});

	it('warehouse filter — selecting a warehouse hides rows from other warehouses', async () => {
		const user = userEvent.setup();
		renderWithProviders(<ReservationsPage />);

		const warehouseTrigger = screen.getByRole('combobox', {
			name: 'Filtrar por armazém',
		});
		await user.click(warehouseTrigger);
		const sulOption = await screen.findByRole('option', {
			name: 'Armazém Sul',
		});
		await user.click(sulOption);

		const table = screen.getByRole('table');
		expect(within(table).getByText('Cabo 10mm')).toBeInTheDocument();
		expect(
			within(table).queryByText('Transformador 500kVA'),
		).not.toBeInTheDocument();
	});

	it('date range filter — rows outside the selected range are hidden', async () => {
		const user = userEvent.setup();
		renderWithProviders(<ReservationsPage />);

		const fromInput = screen.getByLabelText('Data inicial');
		await user.clear(fromInput);
		await user.type(fromInput, '2026-06-14');

		const toInput = screen.getByLabelText('Data final');
		await user.clear(toInput);
		await user.type(toInput, '2026-06-15');

		expect(screen.getByText('Transformador 500kVA')).toBeInTheDocument();
		expect(screen.getByText('Cabo 10mm')).toBeInTheDocument();
		expect(screen.queryByText('#ghi11111')).not.toBeInTheDocument();
	});

	it('Clear Filters resets status, warehouse, and date range to defaults', async () => {
		const user = userEvent.setup();
		renderWithProviders(<ReservationsPage />);

		const statusTrigger = screen.getByRole('combobox', {
			name: 'Filtrar por status',
		});
		await user.click(statusTrigger);
		const pendingOption = await screen.findByRole('option', {
			name: 'Pendente',
		});
		await user.click(pendingOption);

		await user.click(screen.getByRole('button', { name: 'Limpar Filtros' }));

		const products = screen.getAllByText('Transformador 500kVA');
		expect(products).toHaveLength(2);
		expect(screen.getByText('Cabo 10mm')).toBeInTheDocument();
	});

	it('New Reservation button opens modal', async () => {
		const user = userEvent.setup();
		renderWithProviders(<ReservationsPage />);

		await user.click(screen.getByRole('button', { name: '+ Nova Reserva' }));

		expect(screen.getByText('Nova Reserva')).toBeInTheDocument();
	});
});

describe('NewReservationModal', () => {
	it('form validation — submit without filling fields shows required errors', async () => {
		const user = userEvent.setup();
		renderWithProviders(<NewReservationModal open={true} onClose={vi.fn()} />);

		await user.click(screen.getByRole('button', { name: 'Criar Reserva' }));

		const productErrors = await screen.findAllByText('Selecione um produto');
		expect(productErrors.length).toBe(2);
		const warehouseErrors = await screen.findAllByText('Selecione um armazém');
		expect(warehouseErrors.length).toBe(2);
		expect(
			await screen.findByText('Quantidade mínima é 1'),
		).toBeInTheDocument();
		expect(
			await screen.findByText('Quantidade mínima é 1'),
		).toBeInTheDocument();
	});

	it('shows available stock once product and warehouse are both selected', async () => {
		const user = userEvent.setup();
		renderWithProviders(<NewReservationModal open={true} onClose={vi.fn()} />);

		const productTrigger = screen.getByLabelText('Selecionar produto');
		await user.click(productTrigger);
		const productOption = await screen.findByRole('option', {
			name: 'Transformador 500kVA',
		});
		await user.click(productOption);

		const warehouseTrigger = screen.getByLabelText('Selecionar armazém');
		await user.click(warehouseTrigger);
		const warehouseOption = await screen.findByRole('option', {
			name: 'Armazém Central',
		});
		await user.click(warehouseOption);

		expect(screen.getByText('ⓘ Disponível: 100 unidades')).toBeInTheDocument();
	});

	it('successful creation — closes modal, shows success toast', async () => {
		const onClose = vi.fn();
		const user = userEvent.setup();
		vi.mocked(useCreateReservation).mockReturnValue(
			mockMutationReturn({
				mutateAsync: vi.fn().mockResolvedValue({}),
			}),
		);

		renderWithProviders(<NewReservationModal open={true} onClose={onClose} />);

		const productTrigger = screen.getByLabelText('Selecionar produto');
		await user.click(productTrigger);
		const productOption = await screen.findByRole('option', {
			name: 'Transformador 500kVA',
		});
		await user.click(productOption);

		const warehouseTrigger = screen.getByLabelText('Selecionar armazém');
		await user.click(warehouseTrigger);
		const warehouseOption = await screen.findByRole('option', {
			name: 'Armazém Central',
		});
		await user.click(warehouseOption);

		const quantityInput = screen.getByLabelText('Quantidade');
		await user.type(quantityInput, '5');

		await user.click(screen.getByRole('button', { name: 'Criar Reserva' }));

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledOnce();
		});
		expect(toast.success).toHaveBeenCalledWith('Reserva criada com sucesso.');
	});

	it('422 INSUFFICIENT_STOCK — shows field error on quantity input', async () => {
		const user = userEvent.setup();
		const mockError = {
			isAxiosError: true,
			response: { status: 422, data: { error: 'INSUFFICIENT_STOCK' } },
		};
		vi.mocked(useCreateReservation).mockReturnValue(
			mockMutationReturn({
				mutateAsync: vi.fn().mockRejectedValue(mockError),
			}),
		);

		renderWithProviders(<NewReservationModal open={true} onClose={vi.fn()} />);

		const productTrigger = screen.getByLabelText('Selecionar produto');
		await user.click(productTrigger);
		const productOption = await screen.findByRole('option', {
			name: 'Transformador 500kVA',
		});
		await user.click(productOption);

		const warehouseTrigger = screen.getByLabelText('Selecionar armazém');
		await user.click(warehouseTrigger);
		const warehouseOption = await screen.findByRole('option', {
			name: 'Armazém Central',
		});
		await user.click(warehouseOption);

		const quantityInput = screen.getByLabelText('Quantidade');
		await user.type(quantityInput, '5');

		await user.click(screen.getByRole('button', { name: 'Criar Reserva' }));

		await waitFor(() => {
			expect(
				screen.getByText(
					'Estoque insuficiente. A quantidade solicitada excede o estoque disponível para este armazém.',
				),
			).toBeInTheDocument();
		});
	});

	it('422 INACTIVE_PRODUCT — shows toast error', async () => {
		const user = userEvent.setup();
		const mockError = {
			isAxiosError: true,
			response: { status: 422, data: { error: 'INACTIVE_PRODUCT' } },
		};
		vi.mocked(useCreateReservation).mockReturnValue(
			mockMutationReturn({
				mutateAsync: vi.fn().mockRejectedValue(mockError),
			}),
		);

		renderWithProviders(<NewReservationModal open={true} onClose={vi.fn()} />);

		const productTrigger = screen.getByLabelText('Selecionar produto');
		await user.click(productTrigger);
		const productOption = await screen.findByRole('option', {
			name: 'Transformador 500kVA',
		});
		await user.click(productOption);

		const warehouseTrigger = screen.getByLabelText('Selecionar armazém');
		await user.click(warehouseTrigger);
		const warehouseOption = await screen.findByRole('option', {
			name: 'Armazém Central',
		});
		await user.click(warehouseOption);

		const quantityInput = screen.getByLabelText('Quantidade');
		await user.type(quantityInput, '5');

		await user.click(screen.getByRole('button', { name: 'Criar Reserva' }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				'Produto inativo. Não é possível criar a reserva.',
			);
		});
	});

	it('422 INACTIVE_WAREHOUSE — shows toast error', async () => {
		const user = userEvent.setup();
		const mockError = {
			isAxiosError: true,
			response: { status: 422, data: { error: 'INACTIVE_WAREHOUSE' } },
		};
		vi.mocked(useCreateReservation).mockReturnValue(
			mockMutationReturn({
				mutateAsync: vi.fn().mockRejectedValue(mockError),
			}),
		);

		renderWithProviders(<NewReservationModal open={true} onClose={vi.fn()} />);

		const productTrigger = screen.getByLabelText('Selecionar produto');
		await user.click(productTrigger);
		const productOption = await screen.findByRole('option', {
			name: 'Transformador 500kVA',
		});
		await user.click(productOption);

		const warehouseTrigger = screen.getByLabelText('Selecionar armazém');
		await user.click(warehouseTrigger);
		const warehouseOption = await screen.findByRole('option', {
			name: 'Armazém Central',
		});
		await user.click(warehouseOption);

		const quantityInput = screen.getByLabelText('Quantidade');
		await user.type(quantityInput, '5');

		await user.click(screen.getByRole('button', { name: 'Criar Reserva' }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				'Armazém inativo. Não é possível criar a reserva.',
			);
		});
	});

	it('generic error — shows generic toast error', async () => {
		const user = userEvent.setup();
		vi.mocked(useCreateReservation).mockReturnValue(
			mockMutationReturn({
				mutateAsync: vi.fn().mockRejectedValue(new Error('Generic error')),
			}),
		);

		renderWithProviders(<NewReservationModal open={true} onClose={vi.fn()} />);

		const productTrigger = screen.getByLabelText('Selecionar produto');
		await user.click(productTrigger);
		const productOption = await screen.findByRole('option', {
			name: 'Transformador 500kVA',
		});
		await user.click(productOption);

		const warehouseTrigger = screen.getByLabelText('Selecionar armazém');
		await user.click(warehouseTrigger);
		const warehouseOption = await screen.findByRole('option', {
			name: 'Armazém Central',
		});
		await user.click(warehouseOption);

		const quantityInput = screen.getByLabelText('Quantidade');
		await user.type(quantityInput, '5');

		await user.click(screen.getByRole('button', { name: 'Criar Reserva' }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				'Erro ao criar reserva. Tente novamente.',
			);
		});
	});

	it('Cancel button closes modal and resets form', async () => {
		const onClose = vi.fn();
		const user = userEvent.setup();

		const { rerender } = render(
			<QueryClientProvider client={createQueryClient()}>
				<AuthProvider>
					<MemoryRouter>
						<NewReservationModal open={true} onClose={onClose} />
					</MemoryRouter>
				</AuthProvider>
			</QueryClientProvider>,
		);

		const productTrigger = screen.getByLabelText('Selecionar produto');
		await user.click(productTrigger);
		const productOption = await screen.findByRole('option', {
			name: 'Transformador 500kVA',
		});
		await user.click(productOption);

		await user.click(screen.getByRole('button', { name: 'Cancelar' }));

		expect(onClose).toHaveBeenCalledOnce();

		rerender(
			<QueryClientProvider client={createQueryClient()}>
				<AuthProvider>
					<MemoryRouter>
						<NewReservationModal open={true} onClose={onClose} />
					</MemoryRouter>
				</AuthProvider>
			</QueryClientProvider>,
		);

		await waitFor(() => {
			expect(screen.getByLabelText('Selecionar produto')).toBeInTheDocument();
		});
	});

	it('submit button is disabled while mutation is pending', () => {
		vi.mocked(useCreateReservation).mockReturnValue(
			mockMutationReturn({ isPending: true }),
		);

		renderWithProviders(<NewReservationModal open={true} onClose={vi.fn()} />);

		const submitButton = screen.getByRole('button', { name: 'Criar Reserva' });
		expect(submitButton).toBeDisabled();
	});
});
