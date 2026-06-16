import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

const app = buildApp();
const email = `login-${randomUUID()}@wrms.com`;
const password = 'Test@1234';
let userId: string;

beforeAll(async () => {
	await app.ready();
	const passwordHash = await bcrypt.hash(password, 10);
	const user = await prisma.user.create({
		data: { email, passwordHash, role: 'Admin' },
	});
	userId = user.id;
});

afterAll(async () => {
	await prisma.user.delete({ where: { id: userId } });
});

describe('POST /api/auth/login', () => {
	it('returns 200 and a token for valid credentials', async () => {
		const response = await request(app.server).post('/api/auth/login').send({ email, password });

		expect(response.status).toBe(200);
		expect(response.body.token).toBeTypeOf('string');
		expect(response.body.user).toEqual({ id: userId, email, role: 'Admin' });
	});

	it('returns 401 for the wrong password', async () => {
		const response = await request(app.server).post('/api/auth/login').send({ email, password: 'wrong-password' });

		expect(response.status).toBe(401);
		expect(response.body.error).toBe('INVALID_CREDENTIALS');
	});

	it('returns 401 for a non-existent email', async () => {
		const response = await request(app.server)
			.post('/api/auth/login')
			.send({ email: 'does-not-exist@wrms.com', password });

		expect(response.status).toBe(401);
		expect(response.body.error).toBe('INVALID_CREDENTIALS');
	});

	it('returns 400 when email is missing', async () => {
		const response = await request(app.server).post('/api/auth/login').send({ password });

		expect(response.status).toBe(400);
	});
});

describe('swagger', () => {
	it('includes the shared ErrorResponse schema once a route references it', async () => {
		const response = await request(app.server).get('/documentation/json');

		expect(response.status).toBe(200);
		expect(response.body.components.schemas.ErrorResponse).toBeDefined();
	});
});
