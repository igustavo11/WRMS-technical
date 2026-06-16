import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';
import { prisma } from '../../src/infrastructure/database/prisma';

const app = buildApp();
const adminToken = jwtService.sign({ sub: randomUUID(), email: 'admin@wrms.com', role: 'Admin' });
let createdId: string | undefined;

beforeAll(async () => {
	await app.ready();
});

afterAll(async () => {
	if (createdId) {
		await prisma.product.delete({ where: { id: createdId } });
	}
});

describe('products', () => {
	it('creates a product, lists it, fetches it by id and updates it', async () => {
		const sku = `SKU-${randomUUID()}`;

		const createResponse = await request(app.server)
			.post('/api/products')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ sku, name: 'Integration Product' });

		expect(createResponse.status).toBe(201);
		createdId = createResponse.body.id;

		const listResponse = await request(app.server)
			.get('/api/products')
			.set('Authorization', `Bearer ${adminToken}`);

		expect(listResponse.status).toBe(200);
		expect(listResponse.body.some((product: { id: string }) => product.id === createdId)).toBe(true);

		const getResponse = await request(app.server)
			.get(`/api/products/${createdId}`)
			.set('Authorization', `Bearer ${adminToken}`);

		expect(getResponse.status).toBe(200);
		expect(getResponse.body.sku).toBe(sku);

		const updateResponse = await request(app.server)
			.put(`/api/products/${createdId}`)
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ isActive: false });

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body.isActive).toBe(false);
	});

	it('returns 409 when creating a product with a duplicate SKU', async () => {
		const sku = `SKU-${randomUUID()}`;

		const firstResponse = await request(app.server)
			.post('/api/products')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ sku, name: 'First' });
		const firstId = firstResponse.body.id;

		const duplicateResponse = await request(app.server)
			.post('/api/products')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ sku, name: 'Duplicate' });

		expect(duplicateResponse.status).toBe(409);

		await prisma.product.delete({ where: { id: firstId } });
	});

	it('returns 404 when fetching a non-existent product', async () => {
		const response = await request(app.server)
			.get(`/api/products/${randomUUID()}`)
			.set('Authorization', `Bearer ${adminToken}`);

		expect(response.status).toBe(404);
	});
});
