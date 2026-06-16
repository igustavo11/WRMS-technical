import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildApp } from "../../src/app";
import { authenticate } from "../../src/api/middlewares/authenticate";
import { authorize } from "../../src/api/middlewares/authorize";
import { NotFoundError } from "../../src/domain/errors/NotFoundError";
import { jwtService } from "../../src/infrastructure/auth/JwtService";

function buildTestApp() {
	const app = buildApp();

	app.get("/throws-domain-error", async () => {
		throw new NotFoundError("Product");
	});

	app.get("/throws-unknown-error", async () => {
		throw new Error("boom");
	});

	app.post(
		"/validated",
		{ schema: { body: z.object({ name: z.string() }) } },
		async (httpRequest) => {
			return httpRequest.body;
		},
	);

	app.get(
		"/admin-only",
		{ preHandler: [authenticate, authorize(["Admin"])] },
		async (httpRequest) => {
			return { user: httpRequest.user };
		},
	);

	app.get(
		"/throws-response-serialization-error",
		{ schema: { response: { 200: z.object({ name: z.string() }) } } },
		async () => {
			return { name: 123 } as unknown as { name: string };
		},
	);

	return app;
}

describe("errorHandler", () => {
	it("maps a DomainError to its statusCode and code", async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server).get("/throws-domain-error");

		expect(response.status).toBe(404);
		expect(response.body).toEqual({
			error: "NOT_FOUND",
			message: "Product not found.",
			statusCode: 404,
		});
	});

	it("maps a Zod validation failure to 400", async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server).post("/validated").send({});

		expect(response.status).toBe(400);
		expect(response.body.statusCode).toBe(400);
	});

	it("maps an unknown error to 500", async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server).get("/throws-unknown-error");

		expect(response.status).toBe(500);
		expect(response.body).toEqual({
			error: "INTERNAL_SERVER_ERROR",
			message: "An unexpected error occurred.",
			statusCode: 500,
		});
	});

	it("maps a response serialization mismatch to 500 without leaking schema details", async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server).get(
			"/throws-response-serialization-error",
		);

		expect(response.status).toBe(500);
		expect(response.body).toEqual({
			error: "INTERNAL_SERVER_ERROR",
			message: "An unexpected error occurred.",
			statusCode: 500,
		});
	});
});

describe("authenticate", () => {
	it("returns 401 when the Authorization header is missing", async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server).get("/admin-only");

		expect(response.status).toBe(401);
	});

	it("returns 401 when the token is invalid", async () => {
		const app = buildTestApp();
		await app.ready();

		const response = await request(app.server)
			.get("/admin-only")
			.set("Authorization", "Bearer not-a-real-token");

		expect(response.status).toBe(401);
	});
});

describe("authorize", () => {
	it("returns 403 when the role is not allowed", async () => {
		const app = buildTestApp();
		await app.ready();
		const token = jwtService.sign({
			sub: "user-1",
			email: "operator@wrms.com",
			role: "Operator",
		});

		const response = await request(app.server)
			.get("/admin-only")
			.set("Authorization", `Bearer ${token}`);

		expect(response.status).toBe(403);
	});

	it("returns 200 when the role is allowed", async () => {
		const app = buildTestApp();
		await app.ready();
		const token = jwtService.sign({
			sub: "user-1",
			email: "admin@wrms.com",
			role: "Admin",
		});

		const response = await request(app.server)
			.get("/admin-only")
			.set("Authorization", `Bearer ${token}`);

		expect(response.status).toBe(200);
	});
});

describe("swagger", () => {
	it("exposes a valid OpenAPI document", async () => {
		const app = buildApp();
		await app.ready();

		const response = await request(app.server).get("/documentation/json");

		expect(response.status).toBe(200);
		expect(response.body.openapi).toBeTypeOf("string");
		expect(response.body.info.title).toBe("WRMS API");
	});
});
