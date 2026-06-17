import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';

const app = buildApp();
const operatorToken = jwtService.sign({ sub: randomUUID(), email: 'operator@wrms.com', role: 'Operator' });

beforeAll(async () => {
	await app.ready();
});

describe('authorization', () => {
	it('returns 403 for POST /api/products with an Operator token', async () => {
		const response = await request(app.server)
			.post('/api/products')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ sku: 'SKU-999', name: 'Should not be created' });

		expect(response.status).toBe(403);
	});

	it('returns 403 for PUT /api/products/:id with an Operator token', async () => {
		const response = await request(app.server)
			.put(`/api/products/${randomUUID()}`)
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ name: 'Should not update' });

		expect(response.status).toBe(403);
	});

	it('returns 200 for GET /api/products with an Operator token (read access by design)', async () => {
		const response = await request(app.server)
			.get('/api/products')
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(200);
	});

	it('returns 403 for POST /api/warehouses with an Operator token', async () => {
		const response = await request(app.server)
			.post('/api/warehouses')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ name: 'Should not be created', location: 'SP' });

		expect(response.status).toBe(403);
	});

	it('returns 403 for PUT /api/inventory with an Operator token', async () => {
		const response = await request(app.server)
			.put('/api/inventory')
			.set('Authorization', `Bearer ${operatorToken}`)
			.send({ productId: randomUUID(), warehouseId: randomUUID(), quantity: 10 });

		expect(response.status).toBe(403);
	});

	it('returns 401 for any route without a token', async () => {
		const response = await request(app.server).get('/api/products');

		expect(response.status).toBe(401);
	});
});
