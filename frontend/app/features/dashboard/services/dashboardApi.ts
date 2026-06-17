import { apiClient } from '~/shared/api/client';

export type RecentReservation = {
	id: string;
	productName: string;
	warehouseName: string;
	quantity: number;
	status: 'Pending' | 'Confirmed' | 'Cancelled';
	createdAt: string;
};

export type DashboardMetrics = {
	totalProducts: number;
	totalWarehouses: number;
	totalInventory: number;
	activeReservations: number;
	cancelledReservations: number;
	reservationsCreatedToday: number;
};

export type DashboardResponse = {
	metrics: DashboardMetrics;
	lowStockItems: Array<{
		productName: string;
		productSku: string;
		warehouseName: string;
		quantity: number;
		threshold: number;
	}>;
	recentReservations: RecentReservation[];
	warehouseMetrics: Array<{
		warehouseName: string;
		location: string;
		totalProducts: number;
		totalQuantity: number;
		activeReservations: number;
	}>;
};

export async function getDashboard(): Promise<DashboardResponse> {
	const { data } = await apiClient.get<DashboardResponse>('/dashboard');
	return data;
}

export async function cancelReservation(id: string): Promise<void> {
	await apiClient.put(`/reservations/${id}/cancel`);
}
