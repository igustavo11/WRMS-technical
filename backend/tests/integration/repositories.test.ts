import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/infrastructure/database/prisma';
import { PrismaInventoryRepository } from '../../src/infrastructure/repositories/PrismaInventoryRepository';
import { PrismaProductRepository } from '../../src/infrastructure/repositories/PrismaProductRepository';
import { PrismaReservationRepository } from '../../src/infrastructure/repositories/PrismaReservationRepository';
import { PrismaWarehouseRepository } from '../../src/infrastructure/repositories/PrismaWarehouseRepository';

describe('PrismaProductRepository', () => {
	const repository = new PrismaProductRepository();
	let createdId: string | undefined;

	afterEach(async () => {
		if (createdId) {
			await prisma.product.delete({ where: { id: createdId } });
			createdId = undefined;
		}
	});

	it('creates a product and finds it by id and by sku', async () => {
		const sku = `SKU-${randomUUID()}`;
		const created = await repository.create({ sku, name: 'Test Product' });
		createdId = created.id;

		const byId = await repository.findById(created.id);
		const bySku = await repository.findBySku(sku);

		expect(byId?.sku).toBe(sku);
		expect(bySku?.id).toBe(created.id);
	});
});

describe('PrismaWarehouseRepository', () => {
	const repository = new PrismaWarehouseRepository();
	let createdId: string | undefined;

	afterEach(async () => {
		if (createdId) {
			await prisma.warehouse.delete({ where: { id: createdId } });
			createdId = undefined;
		}
	});

	it('creates a warehouse and finds it by id', async () => {
		const created = await repository.create({ name: `Warehouse-${randomUUID()}`, location: 'SP' });
		createdId = created.id;

		const found = await repository.findById(created.id);

		expect(found?.id).toBe(created.id);
	});
});

describe('PrismaInventoryRepository', () => {
	const productRepository = new PrismaProductRepository();
	const warehouseRepository = new PrismaWarehouseRepository();
	const repository = new PrismaInventoryRepository();
	let productId: string | undefined;
	let warehouseId: string | undefined;
	let inventoryId: string | undefined;

	afterEach(async () => {
		if (inventoryId) {
			await prisma.inventory.delete({ where: { id: inventoryId } });
			inventoryId = undefined;
		}
		if (productId) {
			await prisma.product.delete({ where: { id: productId } });
			productId = undefined;
		}
		if (warehouseId) {
			await prisma.warehouse.delete({ where: { id: warehouseId } });
			warehouseId = undefined;
		}
	});

	it('increments and decrements quantity for a product/warehouse pair', async () => {
		const product = await productRepository.create({ sku: `SKU-${randomUUID()}`, name: 'Inventory Product' });
		const warehouse = await warehouseRepository.create({ name: `Warehouse-${randomUUID()}`, location: 'SP' });
		productId = product.id;
		warehouseId = warehouse.id;

		const created = await prisma.inventory.create({
			data: { productId: product.id, warehouseId: warehouse.id, quantity: 10 },
		});
		inventoryId = created.id;

		const incremented = await repository.incrementQuantity(created.id, 5);
		expect(incremented.quantity).toBe(15);

		const decremented = await repository.decrementQuantity(created.id, 3);
		expect(decremented.quantity).toBe(12);

		const found = await repository.findByProductAndWarehouse(product.id, warehouse.id);
		expect(found?.quantity).toBe(12);
	});
});

describe('PrismaReservationRepository', () => {
	const productRepository = new PrismaProductRepository();
	const warehouseRepository = new PrismaWarehouseRepository();
	const repository = new PrismaReservationRepository();
	let productId: string | undefined;
	let warehouseId: string | undefined;
	let reservationId: string | undefined;

	afterEach(async () => {
		if (reservationId) {
			await prisma.reservation.delete({ where: { id: reservationId } });
			reservationId = undefined;
		}
		if (productId) {
			await prisma.product.delete({ where: { id: productId } });
			productId = undefined;
		}
		if (warehouseId) {
			await prisma.warehouse.delete({ where: { id: warehouseId } });
			warehouseId = undefined;
		}
	});

	it('creates a reservation as Pending, counts it as active, then updates its status', async () => {
		const product = await productRepository.create({ sku: `SKU-${randomUUID()}`, name: 'Reservation Product' });
		const warehouse = await warehouseRepository.create({ name: `Warehouse-${randomUUID()}`, location: 'SP' });
		productId = product.id;
		warehouseId = warehouse.id;

		const countBefore = await repository.countActive();

		const created = await repository.create({ productId: product.id, warehouseId: warehouse.id, quantity: 2 });
		reservationId = created.id;
		expect(created.status).toBe('Pending');

		const countAfterCreate = await repository.countActive();
		expect(countAfterCreate).toBe(countBefore + 1);

		const cancelled = await repository.updateStatus(created.id, 'Cancelled');
		expect(cancelled.status).toBe('Cancelled');

		const countAfterCancel = await repository.countActive();
		expect(countAfterCancel).toBe(countBefore);
	});
});
