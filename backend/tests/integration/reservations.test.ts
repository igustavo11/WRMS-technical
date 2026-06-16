import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';
import { prisma } from '../../src/infrastructure/database/prisma';

const app = buildApp();
const operatorToken = jwtService.sign({ sub: randomUUID(), email: 'operator@wrms.com', role: 'Operator' });

let productId: string;
let warehouseId: string;
let inventoryId: string;
let reservationToCancelId: string;

beforeAll(async () => {
	await app.ready();

	const product = await prisma.product.create({ data: { sku: `SKU-${randomUUID()}`, name: 'Reservation Product' } });
	const warehouse = await prisma.warehouse.create({ data: { name: `Warehouse-${randomUUID()}`, location: 'SP' } });
	const inventory = await prisma.inventory.create({
		data: { productId: product.id, warehouseId: warehouse.id, quantity: 20 },
	});

	productId = product.id;
	warehouseId = warehouse.id;
	inventoryId = inventory.id;
});

afterAll(async () => {
	await prisma.reservation.deleteMany({ where: { productId } });
	await prisma.inventory.delete({ where: { id: inventoryId } });
	await prisma.product.delete({ where: { id: productId } });
	await prisma.warehouse.delete({ where: { id: warehouseId } });
});

describe('POST /api/reservations', () => {
	it('returns 401 without a token', async () => {
		const response = await request(app.server).post('/api/reservations').send({ productId, warehouseId, quantity: 1 });

		expect(response.status).toBe(401);
	});

	it('returns 201 with a valid Operator token', async () => {
		const response = await request(app.server)
			.post('/api/reservations')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ productId, warehouseId, quantity: 5 });

		expect(response.status).toBe(201);
		expect(response.body.status).toBe('Pending');
		reservationToCancelId = response.body.id;
	});

	it('returns 422 for insufficient stock', async () => {
		const response = await request(app.server)
			.post('/api/reservations')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ productId, warehouseId, quantity: 1000 });

		expect(response.status).toBe(422);
	});

	it('returns 404 for a non-existent product', async () => {
		const response = await request(app.server)
			.post('/api/reservations')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ productId: randomUUID(), warehouseId, quantity: 1 });

		expect(response.status).toBe(404);
	});

	it('returns 400 when quantity is 0', async () => {
		const response = await request(app.server)
			.post('/api/reservations')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ productId, warehouseId, quantity: 0 });

		expect(response.status).toBe(400);
	});
});

describe('PUT /api/reservations/:id/cancel', () => {
	it('cancels a reservation and restores inventory', async () => {
		const before = await prisma.inventory.findUniqueOrThrow({ where: { id: inventoryId } });

		const response = await request(app.server)
			.put(`/api/reservations/${reservationToCancelId}/cancel`)
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(200);
		expect(response.body.status).toBe('Cancelled');

		const after = await prisma.inventory.findUniqueOrThrow({ where: { id: inventoryId } });
		expect(after.quantity).toBe(before.quantity + 5);
	});

	it('returns 422 when the reservation is already cancelled', async () => {
		const response = await request(app.server)
			.put(`/api/reservations/${reservationToCancelId}/cancel`)
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(422);
	});

	it('returns 404 for a non-existent reservation', async () => {
		const response = await request(app.server)
			.put(`/api/reservations/${randomUUID()}/cancel`)
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(404);
	});
});

describe('GET /api/reservations', () => {
	it('returns 200 and a list with a valid token', async () => {
		const response = await request(app.server)
			.get('/api/reservations')
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
	});
});
