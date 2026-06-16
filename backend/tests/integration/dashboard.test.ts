import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';
import { prisma } from '../../src/infrastructure/database/prisma';

const app = buildApp();

const adminToken = jwtService.sign({
	sub: randomUUID(),
	email: 'admin@wrms.com',
	role: 'Admin',
});

const operatorToken = jwtService.sign({
	sub: randomUUID(),
	email: 'operator@wrms.com',
	role: 'Operator',
});

let mainProductId: string;
let mainWarehouseId: string;
let mainInventoryId: string;
let lowStockProductId: string;
let secondWarehouseId: string;
let lowStockInventoryId: string;

beforeAll(async () => {
	await app.ready();

	const product = await prisma.product.create({
		data: { sku: `DASH-SKU-${randomUUID()}`, name: 'Main Product' },
	});

	const lowStockProduct = await prisma.product.create({
		data: {
			sku: `DASH-LOW-${randomUUID()}`,
			name: 'Low Stock Product',
		},
	});

	const inactiveProduct = await prisma.product.create({
		data: {
			sku: `DASH-INACTIVE-${randomUUID()}`,
			name: 'Inactive Product',
			isActive: false,
		},
	});

	const warehouse = await prisma.warehouse.create({
		data: { name: 'Main Warehouse', location: 'Sao Paulo, SP' },
	});

	const secondWarehouse = await prisma.warehouse.create({
		data: { name: 'Secondary Warehouse', location: 'Curitiba, PR' },
	});

	const inventory = await prisma.inventory.create({
		data: { productId: product.id, warehouseId: warehouse.id, quantity: 100 },
	});

	const secondInventory = await prisma.inventory.create({
		data: {
			productId: lowStockProduct.id,
			warehouseId: warehouse.id,
			quantity: 3,
		},
	});

	await prisma.reservation.create({
		data: {
			productId: product.id,
			warehouseId: warehouse.id,
			quantity: 10,
			status: 'Pending',
		},
	});

	await prisma.reservation.create({
		data: {
			productId: product.id,
			warehouseId: warehouse.id,
			quantity: 5,
			status: 'Confirmed',
		},
	});

	await prisma.reservation.create({
		data: {
			productId: product.id,
			warehouseId: warehouse.id,
			quantity: 3,
			status: 'Cancelled',
		},
	});

	mainProductId = product.id;
	lowStockProductId = lowStockProduct.id;
	mainWarehouseId = warehouse.id;
	secondWarehouseId = secondWarehouse.id;
	mainInventoryId = inventory.id;
	lowStockInventoryId = secondInventory.id;
});

afterAll(async () => {
	await prisma.reservation.deleteMany({
		where: { productId: { in: [mainProductId, lowStockProductId] } },
	});
	await prisma.inventory.deleteMany({
		where: { id: { in: [mainInventoryId, lowStockInventoryId] } },
	});
	await prisma.product.deleteMany({
		where: { id: { in: [mainProductId, lowStockProductId] } },
	});
	await prisma.product.deleteMany({
		where: { name: 'Inactive Product' },
	});
	await prisma.warehouse.deleteMany({
		where: { id: { in: [mainWarehouseId, secondWarehouseId] } },
	});
});

describe('GET /api/dashboard', () => {
	it('returns 401 without a token', async () => {
		const response = await request(app.server).get('/api/dashboard');

		expect(response.status).toBe(401);
	});

	it('returns 200 with full dashboard for Admin', async () => {
		const response = await request(app.server)
			.get('/api/dashboard')
			.set('Authorization', `Bearer ${adminToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty('metrics');
		expect(response.body).toHaveProperty('lowStockItems');
		expect(response.body).toHaveProperty('recentReservations');
		expect(response.body).toHaveProperty('warehouseMetrics');
	});

	it('returns 200 with full dashboard for Operator', async () => {
		const response = await request(app.server)
			.get('/api/dashboard')
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty('metrics');
	});

	describe('metrics', () => {
		it('returns correct totalProducts count (active only)', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.body.metrics.totalProducts).toBe(2);
		});

		it('returns correct totalWarehouses count', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.body.metrics.totalWarehouses).toBe(2);
		});

		it('returns correct totalInventory sum', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.body.metrics.totalInventory).toBe(103);
		});

		it('returns correct activeReservations count (Pending + Confirmed)', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.body.metrics.activeReservations).toBe(2);
		});

		it('returns correct cancelledReservations count', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.body.metrics.cancelledReservations).toBe(1);
		});

		it('returns reservationsCreatedToday count', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.body.metrics.reservationsCreatedToday).toBeGreaterThanOrEqual(
				3,
			);
		});
	});

	describe('lowStockItems', () => {
		it('returns items with quantity below threshold', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(Array.isArray(response.body.lowStockItems)).toBe(true);
			expect(response.body.lowStockItems.length).toBeGreaterThanOrEqual(1);

			const lowStockItem = response.body.lowStockItems.find(
				(item: { productName: string }) =>
					item.productName === 'Low Stock Product',
			);
			expect(lowStockItem).toBeDefined();
			expect(lowStockItem.quantity).toBe(3);
			expect(lowStockItem.threshold).toBe(10);
		});

		it('includes product and warehouse names', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			const item = response.body.lowStockItems[0];
			expect(item).toHaveProperty('productName');
			expect(item).toHaveProperty('productSku');
			expect(item).toHaveProperty('warehouseName');
			expect(item).toHaveProperty('quantity');
			expect(item).toHaveProperty('threshold');
		});
	});

	describe('recentReservations', () => {
		it('returns up to 5 recent reservations ordered by createdAt desc', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(Array.isArray(response.body.recentReservations)).toBe(true);
			expect(response.body.recentReservations.length).toBe(3);

			const dates = response.body.recentReservations.map(
				(r: { createdAt: string }) => new Date(r.createdAt).getTime(),
			);
			for (let i = 1; i < dates.length; i++) {
				expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
			}
		});

		it('includes product name, warehouse name, and status', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			const reservation = response.body.recentReservations[0];
			expect(reservation).toHaveProperty('id');
			expect(reservation).toHaveProperty('productName');
			expect(reservation).toHaveProperty('warehouseName');
			expect(reservation).toHaveProperty('status');
			expect(reservation).toHaveProperty('quantity');
			expect(reservation).toHaveProperty('createdAt');
		});
	});

	describe('warehouseMetrics', () => {
		it('returns metrics for each warehouse', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(Array.isArray(response.body.warehouseMetrics)).toBe(true);
			expect(response.body.warehouseMetrics.length).toBe(2);
		});

		it('includes correct warehouse data shape', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			const mainWh = response.body.warehouseMetrics.find(
				(w: { warehouseName: string }) => w.warehouseName === 'Main Warehouse',
			);

			expect(mainWh).toBeDefined();
			expect(mainWh).toHaveProperty('location', 'Sao Paulo, SP');
			expect(mainWh).toHaveProperty('totalProducts');
			expect(mainWh).toHaveProperty('totalQuantity');
			expect(mainWh).toHaveProperty('activeReservations');
		});

		it('aggregates correct values per warehouse', async () => {
			const response = await request(app.server)
				.get('/api/dashboard')
				.set('Authorization', `Bearer ${adminToken}`);

			const mainWh = response.body.warehouseMetrics.find(
				(w: { warehouseName: string }) => w.warehouseName === 'Main Warehouse',
			);

			expect(mainWh.totalProducts).toBe(2);
			expect(mainWh.totalQuantity).toBe(103);
			expect(mainWh.activeReservations).toBe(2);

			const secondaryWh = response.body.warehouseMetrics.find(
				(w: { warehouseName: string }) =>
					w.warehouseName === 'Secondary Warehouse',
			);

			expect(secondaryWh.totalProducts).toBe(0);
			expect(secondaryWh.totalQuantity).toBe(0);
			expect(secondaryWh.activeReservations).toBe(0);
		});
	});
});
