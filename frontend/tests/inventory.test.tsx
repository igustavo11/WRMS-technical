import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '~/features/auth/context/AuthContext';
import { AdjustInventoryModal } from '~/features/inventory/components/AdjustInventoryModal';
import { InventoryAdmin } from '~/features/inventory/components/InventoryAdmin';
import { InventoryOperator } from '~/features/inventory/components/InventoryOperator';
import { getStockStatus } from '~/features/inventory/utils/stockStatus';

vi.mock('~/features/inventory/hooks/useInventory', () => ({
	useInventory: vi.fn(),
	useProducts: vi.fn(),
	useWarehouses: vi.fn(),
	useAdjustInventory: vi.fn(),
}));

import {
	useAdjustInventory,
	useInventory,
	useProducts,
	useWarehouses,
} from '~/features/inventory/hooks/useInventory';

const mockInventory = [
	{
		id: '1',
		productId: 'p1',
		warehouseId: 'w1',
		quantity: 100,
		updatedAt: '2026-06-16T10:00:00.000Z',
	},
	{
		id: '2',
		productId: 'p2',
		warehouseId: 'w2',
		quantity: 5,
		updatedAt: '2026-06-16T11:00:00.000Z',
	},
];

const mockProducts = [
	{
		id: 'p1',
		sku: 'SKU-001',
		name: 'Produto A',
		description: null,
		isActive: true,
		createdAt: '',
		updatedAt: '',
	},
	{
		id: 'p2',
		sku: 'SKU-002',
		name: 'Produto B',
		description: null,
		isActive: true,
		createdAt: '',
		updatedAt: '',
	},
];

const mockWarehouses = [
	{
		id: 'w1',
		name: 'Armazém Central',
		location: 'SP',
		isActive: true,
		createdAt: '',
		updatedAt: '',
	},
	{
		id: 'w2',
		name: 'Armazém Sul',
		location: 'PR',
		isActive: true,
		createdAt: '',
		updatedAt: '',
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

// biome-ignore lint/suspicious/noExplicitAny: mock return values for multiple query types
function mockQueryReturn(overrides: Record<string, unknown>): any {
	return {
		data: undefined,
		isLoading: false,
		isError: false,
		error: null,
		isStale: false,
		isFetching: false,
		isFetched: false,
		isFetchedAfterMount: false,
		isPlaceholderData: false,
		isRefetching: false,
		isPaused: false,
		status: 'success' as const,
		fetchStatus: 'idle' as const,
		refetch: vi.fn(),
		...overrides,
	};
}

// biome-ignore lint/suspicious/noExplicitAny: mock return values
function mockMutationReturn(overrides: Record<string, unknown>): any {
	return {
		mutate: vi.fn(),
		mutateAsync: vi.fn(),
		isPending: false,
		isIdle: true,
		isPaused: false,
		isSuccess: false,
		isError: false,
		context: null,
		data: undefined,
		error: null,
		failureCount: 0,
		failureReason: null,
		status: 'idle' as const,
		submittedAt: undefined,
		reset: vi.fn(),
		variables: undefined,
		...overrides,
	};
}

beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
});

describe('getStockStatus', () => {
	it('returns Crítico for quantity < 10', () => {
		expect(getStockStatus(0)).toBe('Crítico');
		expect(getStockStatus(5)).toBe('Crítico');
		expect(getStockStatus(9)).toBe('Crítico');
	});

	it('returns Atenção for quantity 10-49', () => {
		expect(getStockStatus(10)).toBe('Atenção');
		expect(getStockStatus(25)).toBe('Atenção');
		expect(getStockStatus(49)).toBe('Atenção');
	});

	it('returns Normal for quantity >= 50', () => {
		expect(getStockStatus(50)).toBe('Normal');
		expect(getStockStatus(100)).toBe('Normal');
		expect(getStockStatus(999)).toBe('Normal');
	});
});

describe('InventoryAdmin', () => {
	it('shows enriched product and warehouse names in the table', () => {
		vi.mocked(useInventory).mockReturnValue(
			mockQueryReturn({ data: mockInventory }),
		);
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<InventoryAdmin />);

		expect(screen.getAllByText('Produto A').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('SKU-001').length).toBeGreaterThanOrEqual(1);
		expect(
			screen.getAllByText('Armazém Central').length,
		).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Produto B').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Armazém Sul').length).toBeGreaterThanOrEqual(1);
	});

	it('shows Ajustar buttons for each row', () => {
		vi.mocked(useInventory).mockReturnValue(
			mockQueryReturn({ data: mockInventory }),
		);
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<InventoryAdmin />);
	});

	it('shows Ajustar buttons for each row', () => {
		vi.mocked(useInventory).mockReturnValue(
			mockQueryReturn({ data: mockInventory }),
		);
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<InventoryAdmin />);

		expect(
			screen.getByText('Não foi possível carregar o inventário.'),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Tentar novamente' }),
		).toBeInTheDocument();
	});
});

describe('InventoryOperator', () => {
	it('shows stock status badges', () => {
		vi.mocked(useInventory).mockReturnValue(
			mockQueryReturn({ data: mockInventory }),
		);
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<InventoryOperator />);

		const badges = screen.getAllByText(/Normal|Crítico|Atenção/i);
		expect(badges).toHaveLength(4);
	});

	it('shows Criar Reserva link', () => {
		vi.mocked(useInventory).mockReturnValue(
			mockQueryReturn({ data: mockInventory }),
		);
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<InventoryOperator />);

		const link = screen.getByRole('link', { name: /criar reserva/i });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/reservations');
	});

	it('shows info banner about read-only', () => {
		vi.mocked(useInventory).mockReturnValue(
			mockQueryReturn({ data: mockInventory }),
		);
		vi.mocked(useProducts).mockReturnValue(
			mockQueryReturn({ data: mockProducts }),
		);
		vi.mocked(useWarehouses).mockReturnValue(
			mockQueryReturn({ data: mockWarehouses }),
		);

		renderWithProviders(<InventoryOperator />);

		expect(
			screen.getByText(
				'Visualização apenas. Para ajustes contacte o administrador.',
			),
		).toBeInTheDocument();
	});
});

describe('AdjustInventoryModal', () => {
	const mockItem = {
		id: '1',
		productId: 'p1',
		warehouseId: 'w1',
		quantity: 100,
		productName: 'Produto A',
		productSku: 'SKU-001',
		warehouseName: 'Armazém Central',
	};

	it('renders item details', () => {
		vi.mocked(useAdjustInventory).mockReturnValue(mockMutationReturn({}));

		renderWithProviders(
			<AdjustInventoryModal item={mockItem} onClose={vi.fn()} />,
		);

		expect(screen.getByText('Ajustar Inventário')).toBeInTheDocument();
		expect(screen.getByText('Produto A')).toBeInTheDocument();
		expect(screen.getByText('SKU-001')).toBeInTheDocument();
		expect(screen.getByText('Armazém Central')).toBeInTheDocument();
		expect(screen.getByText('100')).toBeInTheDocument();
	});

	it('closes on Cancel button click', async () => {
		const onClose = vi.fn();
		vi.mocked(useAdjustInventory).mockReturnValue(mockMutationReturn({}));

		const user = userEvent.setup();
		renderWithProviders(
			<AdjustInventoryModal item={mockItem} onClose={onClose} />,
		);

		await user.click(screen.getByRole('button', { name: 'Cancelar' }));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('closes on Escape key', async () => {
		const onClose = vi.fn();
		vi.mocked(useAdjustInventory).mockReturnValue(mockMutationReturn({}));

		const user = userEvent.setup();
		renderWithProviders(
			<AdjustInventoryModal item={mockItem} onClose={onClose} />,
		);

		const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
		await cancelButton.focus();
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalledOnce();
	});
});
