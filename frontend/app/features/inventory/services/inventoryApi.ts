import { apiClient } from '~/shared/api/client';

export type InventoryRecord = {
	id: string;
	productId: string;
	warehouseId: string;
	quantity: number;
	updatedAt: string;
};

export type Product = {
	id: string;
	sku: string;
	name: string;
	description: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export type Warehouse = {
	id: string;
	name: string;
	location: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export type AdjustInventoryPayload = {
	productId: string;
	warehouseId: string;
	quantity: number;
};

export async function getInventory(): Promise<InventoryRecord[]> {
	const { data } = await apiClient.get<InventoryRecord[]>('/inventory');
	return data;
}

export async function getProducts(): Promise<Product[]> {
	const { data } = await apiClient.get<Product[]>('/products');
	return data;
}

export async function getWarehouses(): Promise<Warehouse[]> {
	const { data } = await apiClient.get<Warehouse[]>('/warehouses');
	return data;
}

export async function adjustInventory(
	payload: AdjustInventoryPayload,
): Promise<InventoryRecord> {
	const { data } = await apiClient.put<InventoryRecord>('/inventory', payload);
	return data;
}
