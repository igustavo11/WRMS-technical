import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { jwtService } from '../../src/infrastructure/auth/JwtService';
import { prisma } from '../../src/infrastructure/database/prisma';

const app = buildApp();
const adminToken = jwtService.sign({ sub: randomUUID(), email: 'admin@wrms.com', role: 'Admin' });
const operatorToken = jwtService.sign({ sub: randomUUID(), email: 'operator@wrms.com', role: 'Operator' });
let createdId: string | undefined;

beforeAll(async () => {
	await app.ready();
});

afterAll(async () => {
	if (createdId) {
		await prisma.warehouse.delete({ where: { id: createdId } });
	}
});

describe('warehouses', () => {
	it('creates a warehouse as Admin and lists it', async () => {
		const name = `Warehouse-${randomUUID()}`;

		const createResponse = await request(app.server)
			.post('/api/warehouses')
			.set('Authorization', `Bearer ${adminToken}`)
			.send({ name, location: 'SP' });

		expect(createResponse.status).toBe(201);
		createdId = createResponse.body.id;

		const listResponse = await request(app.server)
			.get('/api/warehouses')
			.set('Authorization', `Bearer ${adminToken}`);

		expect(listResponse.status).toBe(200);
		expect(listResponse.body.some((warehouse: { id: string }) => warehouse.id === createdId)).toBe(true);
	});

	it('allows an Operator to list warehouses (deliberate PRD exception)', async () => {
		const response = await request(app.server)
			.get('/api/warehouses')
			.set('Authorization', `Bearer ${operatorToken}`);

		expect(response.status).toBe(200);
	});
});
