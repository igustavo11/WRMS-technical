import type { Inventory } from '../entities/Inventory';

export interface IInventoryRepository {
	findByProductAndWarehouse(
		productId: string,
		warehouseId: string,
	): Promise<Inventory | null>;
	findAll(): Promise<Inventory[]>;
	update(id: string, quantity: number): Promise<Inventory>;
	decrementQuantity(id: string, amount: number): Promise<Inventory>;
	incrementQuantity(id: string, amount: number): Promise<Inventory>;
	sumQuantity(): Promise<number>;
}
