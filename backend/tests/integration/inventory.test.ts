import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';
import { prisma } from '../../src/infrastructure/database/prisma';

const app = buildApp();
const adminToken = jwtService.sign({ sub: randomUUID(), email: 'admin@wrms.com', role: 'Admin' });
const operatorToken = jwtService.sign({ sub: randomUUID(), email: 'operator@wrms.com', role: 'Operator' });

let productId: string;
let warehouseId: string;
let inventoryId: string;

beforeAll(async () => {
	await app.ready();

	const product = await prisma.product.create({ data: { sku: `SKU-${randomUUID()}`, name: 'Inventory Product' } });
	const warehouse = await prisma.warehouse.create({ data: { name: `Warehouse-${randomUUID()}`, location: 'SP' } });
	const inventory = await prisma.inventory.create({
		data: { productId: product.id, warehouseId: warehouse.id, quantity: 50 },
	});

	productId = product.id;
	warehouseId = warehouse.id;
	inventoryId = inventory.id;
});

afterAll(async () => {
	await prisma.inventory.delete({ where: { id: inventoryId } });
	await prisma.product.delete({ where: { id: productId } });
	await prisma.warehouse.delete({ where: { id: warehouseId } });
});

describe('inventory', () => {
	it('allows an Operator to list inventory', async () => {
		const response = await request(app.server).get('/api/inventory').set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(200);
		expect(response.body.some((item: { id: string }) => item.id === inventoryId)).toBe(true);
	});

	it('adjusts inventory quantity as Admin', async () => {
		const response = await request(app.server)
			.put('/api/inventory')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ productId, warehouseId, quantity: 75 });

		expect(response.status).toBe(200);
		expect(response.body.quantity).toBe(75);
	});

	it('returns 422 when adjusting to a negative quantity', async () => {
		const response = await request(app.server)
			.put('/api/inventory')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ productId, warehouseId, quantity: -5 });

		expect(response.status).toBe(422);
	});

	it('returns 404 when adjusting a non-existent product/warehouse pair', async () => {
		const response = await request(app.server)
			.put('/api/inventory')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ productId: randomUUID(), warehouseId: randomUUID(), quantity: 10 });

		expect(response.status).toBe(404);
	});
});
