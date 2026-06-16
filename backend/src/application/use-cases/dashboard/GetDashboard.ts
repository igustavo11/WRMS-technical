import type { DashboardResponse } from '../../../api/schemas/dashboard.schema';
import type { Inventory } from '../../../domain/entities/Inventory';
import type { Product } from '../../../domain/entities/Product';
import type { Reservation } from '../../../domain/entities/Reservation';
import type { Warehouse } from '../../../domain/entities/Warehouse';
import type { IInventoryRepository } from '../../../domain/repositories/IInventoryRepository';
import type { IProductRepository } from '../../../domain/repositories/IProductRepository';
import type { IReservationRepository } from '../../../domain/repositories/IReservationRepository';
import type { IWarehouseRepository } from '../../../domain/repositories/IWarehouseRepository';

const LOW_STOCK_THRESHOLD = 10;
const RECENT_RESERVATIONS_LIMIT = 5;

export class GetDashboard {
	constructor(
		private readonly productRepository: IProductRepository,
		private readonly warehouseRepository: IWarehouseRepository,
		private readonly inventoryRepository: IInventoryRepository,
		private readonly reservationRepository: IReservationRepository,
	) {}

	async execute(): Promise<DashboardResponse> {
		const [
			totalProducts,
			allWarehouses,
			totalInventory,
			activeReservations,
			cancelledReservations,
			reservationsCreatedToday,
			allInventory,
			allProducts,
			allReservations,
		] = await Promise.all([
			this.productRepository.countActive(),
			this.warehouseRepository.findAll(),
			this.inventoryRepository.sumQuantity(),
			this.reservationRepository.countActive(),
			this.reservationRepository.countCancelled(),
			this.reservationRepository.countCreatedToday(),
			this.inventoryRepository.findAll(),
			this.productRepository.findAll(),
			this.reservationRepository.findAll(),
		]);

		const productMap = this.indexById(allProducts);
		const warehouseMap = this.indexById(allWarehouses);

		return {
			metrics: {
				totalProducts,
				totalWarehouses: allWarehouses.length,
				totalInventory,
				activeReservations,
				cancelledReservations,
				reservationsCreatedToday,
			},
			lowStockItems: this.buildLowStockItems(
				allInventory,
				productMap,
				warehouseMap,
			),
			recentReservations: this.buildRecentReservations(
				allReservations,
				productMap,
				warehouseMap,
			),
			warehouseMetrics: this.buildWarehouseMetrics(
				allWarehouses,
				allInventory,
				allReservations,
			),
		};
	}

	private indexById<T extends { id: string }>(items: T[]): Map<string, T> {
		const map = new Map<string, T>();
		for (const item of items) {
			map.set(item.id, item);
		}
		return map;
	}

	private buildLowStockItems(
		allInventory: Inventory[],
		productMap: Map<string, Product>,
		warehouseMap: Map<string, Warehouse>,
	) {
		return allInventory
			.filter((inv) => inv.quantity < LOW_STOCK_THRESHOLD)
			.map((inv) => {
				const product = productMap.get(inv.productId);
				const warehouse = warehouseMap.get(inv.warehouseId);
				return {
					productName: product?.name ?? 'Unknown',
					productSku: product?.sku ?? 'Unknown',
					warehouseName: warehouse?.name ?? 'Unknown',
					quantity: inv.quantity,
					threshold: LOW_STOCK_THRESHOLD,
				};
			});
	}

	private buildRecentReservations(
		reservations: Reservation[],
		productMap: Map<string, Product>,
		warehouseMap: Map<string, Warehouse>,
	) {
		return [...reservations]
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
			.slice(0, RECENT_RESERVATIONS_LIMIT)
			.map((res) => {
				const product = productMap.get(res.productId);
				const warehouse = warehouseMap.get(res.warehouseId);
				return {
					id: res.id,
					productName: product?.name ?? 'Unknown',
					warehouseName: warehouse?.name ?? 'Unknown',
					quantity: res.quantity,
					status: res.status,
					createdAt: res.createdAt,
				};
			});
	}

	private buildWarehouseMetrics(
		warehouses: Warehouse[],
		allInventory: Inventory[],
		reservations: Reservation[],
	) {
		const invByWarehouse = new Map<string, Inventory[]>();
		for (const inv of allInventory) {
			const list = invByWarehouse.get(inv.warehouseId) ?? [];
			list.push(inv);
			invByWarehouse.set(inv.warehouseId, list);
		}

		const resByWarehouse = new Map<string, Reservation[]>();
		for (const res of reservations) {
			if (res.status === 'Cancelled') continue;
			const list = resByWarehouse.get(res.warehouseId) ?? [];
			list.push(res);
			resByWarehouse.set(res.warehouseId, list);
		}

		return warehouses.map((wh) => {
			const invs = invByWarehouse.get(wh.id) ?? [];
			const activeRes = resByWarehouse.get(wh.id) ?? [];

			const uniqueProducts = new Set(invs.map((i) => i.productId));
			const totalQty = invs.reduce((sum, i) => sum + i.quantity, 0);

			return {
				warehouseName: wh.name,
				location: wh.location,
				totalProducts: uniqueProducts.size,
				totalQuantity: totalQty,
				activeReservations: activeRes.length,
			};
		});
	}
}
