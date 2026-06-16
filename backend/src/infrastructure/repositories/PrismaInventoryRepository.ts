import type { Inventory } from '../../domain/entities/Inventory';
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { type PrismaClientOrTransaction, prisma } from '../database/prisma';

export class PrismaInventoryRepository implements IInventoryRepository {
	constructor(private readonly client: PrismaClientOrTransaction = prisma) {}

	async findByProductAndWarehouse(
		productId: string,
		warehouseId: string,
	): Promise<Inventory | null> {
		return this.client.inventory.findUnique({
			where: { productId_warehouseId: { productId, warehouseId } },
		});
	}

	async findAll(): Promise<Inventory[]> {
		return this.client.inventory.findMany();
	}

	async update(id: string, quantity: number): Promise<Inventory> {
		return this.client.inventory.update({ where: { id }, data: { quantity } });
	}

	async decrementQuantity(id: string, amount: number): Promise<Inventory> {
		return this.client.inventory.update({
			where: { id },
			data: { quantity: { decrement: amount } },
		});
	}

	async incrementQuantity(id: string, amount: number): Promise<Inventory> {
		return this.client.inventory.update({
			where: { id },
			data: { quantity: { increment: amount } },
		});
	}

	async sumQuantity(): Promise<number> {
		const result = await this.client.inventory.aggregate({
			_sum: { quantity: true },
		});
		return result._sum.quantity ?? 0;
	}
}
