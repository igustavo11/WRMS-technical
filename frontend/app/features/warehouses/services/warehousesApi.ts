import { apiClient } from '~/shared/api/client';

export type Warehouse = {
	id: string;
	name: string;
	location: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export type CreateWarehouseDto = {
	name: string;
	location: string;
	isActive?: boolean;
};

export const getWarehouses = (): Promise<Warehouse[]> =>
	apiClient.get('/warehouses').then((r) => r.data);

export const createWarehouse = (dto: CreateWarehouseDto): Promise<Warehouse> =>
	apiClient.post('/warehouses', dto).then((r) => r.data);
