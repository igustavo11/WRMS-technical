# Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/auth/login` — the first vertical slice end-to-end (route → use case → repository → JWT), proving the plan 2 skeleton works with a real business route — and set up OpenAPI/Swagger documentation for the whole API, generated from the same Zod schemas used for request/response validation.

**Architecture:** Same layering as every other feature: `domain/repositories/IUserRepository.ts` (contract) → `infrastructure/repositories/PrismaUserRepository.ts` (Prisma implementation) → `application/use-cases/auth/Login.ts` (business logic: find user, compare password hash, sign JWT) → `api/routes/auth.routes.ts` (Zod-validated route, with request/response schemas feeding Swagger) → `api/routes/index.ts` (aggregator, registered under the `/api` prefix in `src/app.ts`). `Login` throws the concrete `DomainError` directly for invalid credentials (401) — no dedicated subclass, same pattern as plan 2's `authenticate`/`authorize`. `app.ts` also registers `@fastify/swagger` + `@fastify/swagger-ui`, using `@fastify/type-provider-zod`'s `jsonSchemaTransform` to turn the same Zod schemas into the OpenAPI spec.

**Tech Stack:** `bcryptjs` (password comparison — chosen over `Bun.password` and `bcrypt`, see Notes), `jsonwebtoken` (already wired via `JwtService`, plan 2), `@fastify/swagger` 9.x + `@fastify/swagger-ui` 6.x (both depend on `fastify-plugin@^5`, confirmed compatible with this project's Fastify 5), Zod, Fastify.

---

## Notes for whoever picks this up

**Login architecture (decided before this round of design review):**

- **Login gets the full DDD treatment (use case + repository), even though PRD §7.1's file tree doesn't list `Login.ts`, `IUserRepository.ts`, or `PrismaUserRepository.ts`.** Deliberate choice to keep the same testable, layered pattern used everywhere else, matching `00-overview.md`'s description of this subsystem as "route → use case → repository → JWT".
- **`bcryptjs`, not `Bun.password` or `bcrypt`.** `Bun.password` is Bun-native and would be the obvious first choice per this project's "prefer Bun built-ins" convention, but Vitest test workers run under **Node**, not Bun (`typeof Bun` is `undefined` in `tests/` — see `backend/CLAUDE.md`). `auth.test.ts` exercises the real `Login` use case through HTTP under Vitest, so `Bun.password` would throw `Bun is not defined` during the test run. Native `bcrypt` avoids that specific problem but adds a compiled-binary cross-runtime risk between Bun (app) and Node (tests) for no real benefit at this app's scale. `bcryptjs` is pure JS — identical behavior under both runtimes, already installed (ships its own types, no `@types/bcryptjs` needed).
- **One generic `INVALID_CREDENTIALS` (401) message for both "email not found" and "wrong password".** Never reveal which one was wrong. Kept in English (`'Invalid email or password.'`) per the project convention even though the PRD's own example text is in Portuguese.
- **No dedicated `Login` unit test, and no dedicated test for `IUserRepository`/`PrismaUserRepository`.** PRD §9.1's unit test list doesn't include Login, and `findByEmail` has exactly one consumer — `auth.test.ts` (integration) already exercises every branch of both (valid creds, wrong password, unknown email, invalid body) through real HTTP + a real bcrypt hash. A mocked-repository unit test would duplicate that coverage.
- **`wrms_test` has no seeded users yet** (seeding is subsystem 9). `auth.test.ts` creates its own user fixture directly via Prisma (with a real `bcrypt.hash`) in `beforeAll`, deletes it in `afterAll` — same pattern plan 2 used for product/warehouse fixtures.
- `User.role`/`User.passwordHash` come back from Prisma typed as `role: string` (no native enum in SQL Server — same situation as `Reservation.status` in plan 2). `PrismaUserRepository.findByEmail` narrows with `as UserRecord | null` after `await`, same justified pattern as `PrismaReservationRepository`.
- `BCRYPT_ROUNDS` (env var, already in `.env`/`.env.test`) is not read by any code in this plan — `Login` only ever _compares_ a password against an existing hash. Hashing with `BCRYPT_ROUNDS` from env first happens in subsystem 9 (seed data).

**Routing and Swagger (decided in a grilling session with the project owner — every item below was an explicit yes/no, not a unilateral call):**

- **Route aggregator (`src/api/routes/index.ts`) exists from this plan onward.** Without it, `app.ts` would accumulate one import + one `app.register()` call per future subsystem (4–8), mixing infra wiring with the growing list of business routes. Instead, `app.ts` registers exactly one thing — `app.register(routes, { prefix: '/api' })` — forever. `auth.routes.ts` defines its path as just `/auth/login` (no `/api`); the aggregator re-exports it via `app.register(authRoutes)` with no prefix of its own. Subsystems 4–8 each add one line to the aggregator and never touch `app.ts` again.
- **Swagger is set up now, in this plan, not retroactively in plan 2.** Plan 2's infra skeleton had no business routes, so there was nothing for Swagger to document yet; this is the first plan with a real route. `@fastify/type-provider-zod` (chosen back in plan 2) already ships `jsonSchemaTransform` specifically to feed `@fastify/swagger` from Zod schemas — that earlier choice was compatible with this on purpose.
- **One shared `errorResponseSchema` (`src/api/schemas/error.schema.ts`)**, registered as a named OpenAPI component via `z.globalRegistry.add(errorResponseSchema, { id: 'ErrorResponse' })` + `transformObject: jsonSchemaTransformObject` on the swagger plugin. Every route's error responses reference this one schema instead of duplicating the same inline JSON schema in every endpoint's generated docs.
- **Each route only declares the status codes it can realistically return** — login: `200`, `400`, `401`. Never `403`/`404`/`409`/`422` (it has no `authorize` middleware, doesn't look up a resource by id, etc.), and never a per-route `500` (not part of any specific endpoint's business contract — documenting it on every route would just repeat the same entry 8+ times for no value).
- **Response schemas are not just documentation — Fastify's serializer actually enforces them**, including when the global `setErrorHandler` (not the route handler) is the one calling `reply.send()`. Confirmed via Fastify's own docs (`Reply.md`): a route's `response[N]` schema applies based on the matched route + the status code used when `send()` is called, regardless of which code path calls it. This is why `errorHandler.ts` can stay generic (one function for every route) while still producing per-route-documented, schema-validated error shapes.
- **`bearerAuth` security scheme is defined now** (`components.securitySchemes` in the swagger config), even though `POST /api/auth/login` itself is public and doesn't use it. `app.ts` is already being touched for the route aggregator and swagger setup in this plan; subsystems 4–8 (which need JWT) just add `security: [{ bearerAuth: [] }]` to their own route schema and never touch `app.ts`. No global default `security` requirement is set — each protected route opts in individually.
- **`errorHandler.ts` (already committed in plan 2) is modified again here** to handle `isResponseSerializationError` (from `@fastify/type-provider-zod`) — this only becomes _possible_ now that routes have `response` schemas for the first time. Per `@fastify/type-provider-zod`'s own README, this catches an endpoint accidentally returning something that doesn't match its declared response shape (our bug, not the client's). **The rich debug detail (`issues`/`method`/`url`) goes to `request.log.error` only — the response body sent to the client stays the standard 3-field `{error, message, statusCode}` envelope**, matching PRD §5.7's global error format exactly. Never leak internal schema validation details to API consumers.
- **Swagger UI is exposed in every environment, no `NODE_ENV` gating.** This is an assessment/take-home project, not a system with production customer data; gating it would be unrequested complexity. Documented here as a conscious choice, same spirit as the other trade-offs already in `README.md`.
- **The full tag taxonomy (`Auth`, `Products`, `Warehouses`, `Inventory`, `Reservations`, `Dashboard`) is predefined now** in the swagger plugin's `openapi.tags`, even though only `Auth` has a route yet. Subsystems 4–8 just add `tags: ['Products']` etc. to their own route schema.
- **Two new test cases verify the swagger/error-handling additions**, both in `tests/integration/app.test.ts` (the existing home for infra-level tests): one confirms `GET /documentation/json` returns a valid OpenAPI document; one deliberately mismatches a route's declared response schema to confirm `isResponseSerializationError` is caught and still returns the standard 3-field envelope (not the raw debug details).
- **Caught during implementation, not just planning:** the `ErrorResponse` component only appears in the generated OpenAPI document once some route actually references `errorResponseSchema` in its own `response` schema. In Task 3, no route does yet (swagger is registered before any business route exists), so the Task 3 swagger test only asserts the document is well-formed (`openapi` field, `info.title`). The `ErrorResponse`-component assertion moved to Task 4's `auth.test.ts`, since `POST /api/auth/login` is the first route that actually uses the shared schema.
- Verified directly against the installed packages (not from memory): `@fastify/swagger@9.7.0` and `@fastify/swagger-ui@6.0.0` both depend on `fastify-plugin@^5.0.0` (Fastify 5 compatible); `@fastify/swagger-ui` registers its JSON spec at `{routePrefix}/json` (confirmed by reading `node_modules/@fastify/swagger-ui/lib/routes.js`), so with `routePrefix: '/documentation'` the full path is `/documentation/json`.
- Formatting: tabs, single quotes (matches `biome.json`). `verbatimModuleSyntax` is `true` — type-only imports use `import type`.

---

### Task 1: User Repository

**Files:**

- Create: `src/domain/repositories/IUserRepository.ts`
- Create: `src/infrastructure/repositories/PrismaUserRepository.ts`

No test in this task — `findByEmail` has no consumer yet, so there is nothing to exercise. It gets verified end-to-end by Task 4's `auth.test.ts` (see Notes).

- [ ] **Step 1: Create `src/domain/repositories/IUserRepository.ts`**

```ts
export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: "Admin" | "Operator";
};

export interface IUserRepository {
  c;
  findByEmail(email: string): Promise<UserRecord | null>;
}
```

- [ ] **Step 2: Create `src/infrastructure/repositories/PrismaUserRepository.ts`**

```ts
import type {
  IUserRepository,
  UserRecord,
} from "../../domain/repositories/IUserRepository";
import { prisma } from "../database/prisma";

export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user as UserRecord | null;
  }
}
```

- [ ] **Step 3: Verify the project still type-checks**

Run: `bunx tsc -p tsconfig.json`
Expected: exits with code 0, no output.

- [ ] **Step 4: Commit**

```bash
git add src/domain/repositories/IUserRepository.ts src/infrastructure/repositories/PrismaUserRepository.ts
git commit -m "feat: add user repository"
```

---

### Task 2: Login Use Case

**Files:**

- Create: `src/application/use-cases/auth/Login.ts`

No test in this task either — verified end-to-end by Task 4's `auth.test.ts` once the route wires it up.

- [ ] **Step 1: Create `src/application/use-cases/auth/Login.ts`**

```ts
import bcrypt from "bcryptjs";
import { DomainError } from "../../../domain/errors/DomainError";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository";
import type { JwtService } from "../../../infrastructure/auth/JwtService";

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginOutput = {
  token: string;
  user: {
    id: string;
    email: string;
    role: "Admin" | "Operator";
  };
};

export class Login {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      throw new DomainError(
        "Invalid email or password.",
        "INVALID_CREDENTIALS",
        401,
      );
    }

    const passwordMatches = await bcrypt.compare(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new DomainError(
        "Invalid email or password.",
        "INVALID_CREDENTIALS",
        401,
      );
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `bunx tsc -p tsconfig.json`
Expected: exits with code 0, no output.

- [ ] **Step 3: Commit**

```bash
git add src/application/use-cases/auth/Login.ts
git commit -m "feat: add Login use case"
```

---

### Task 3: Shared Error Schema + Swagger Infrastructure

**Files:**

- Create: `src/api/schemas/error.schema.ts`
- Modify: `src/api/middlewares/errorHandler.ts`
- Modify: `src/app.ts`
- Modify: `tests/integration/app.test.ts`

- [ ] **Step 1: Write the failing test**

Add `z` import is already present in this file (from plan 2). Add this route inside `buildTestApp()`, after the existing routes:

```ts
app.get(
  "/throws-response-serialization-error",
  { schema: { response: { 200: z.object({ name: z.string() }) } } },
  async () => {
    return { name: 123 } as unknown as { name: string };
  },
);
```

Append this test inside the existing `describe('errorHandler', ...)` block:

```ts
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
```

Append this new `describe` block at the end of the file:

```ts
describe('swagger', () => {
	it('exposes a valid OpenAPI document', async () => {
		const app = buildApp();
		await app.ready();

		const response = await request(app.server).get('/documentation/json');

		expect(response.status).toBe(200);
		expect(response.body.openapi).toBeTypeOf('string');
		expect(response.body.info.title).toBe('WRMS API');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/integration/app.test.ts`
Expected: FAIL — `/documentation/json` returns 404 (swagger not registered yet), and the response-serialization route falls through to the existing generic 500 path without the new explicit handling (this part may already "pass" by coincidence — the important failure is the swagger test).

- [ ] **Step 3: Implement `src/api/schemas/error.schema.ts`**

```ts
import { z } from "zod";

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
});

z.globalRegistry.add(errorResponseSchema, { id: "ErrorResponse" });
```

- [ ] **Step 4: Modify `src/api/middlewares/errorHandler.ts`**

```ts
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "@fastify/type-provider-zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { DomainError } from "../../domain/errors/DomainError";

export function errorHandler(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof DomainError) {
    reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
      statusCode: error.statusCode,
    });
    return;
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    const message = error.validation.map((issue) => issue.message).join("; ");

    reply.status(400).send({
      error: "VALIDATION_ERROR",
      message,
      statusCode: 400,
    });
    return;
  }

  if (isResponseSerializationError(error)) {
    request.log.error({
      issues: error.cause.issues,
      method: error.method,
      url: error.url,
    });

    reply.status(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
      statusCode: 500,
    });
    return;
  }

  request.log.error(error);

  reply.status(500).send({
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
    statusCode: 500,
  });
}
```

- [ ] **Step 5: Modify `src/app.ts`**

```ts
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "@fastify/type-provider-zod";
import Fastify from "fastify";
import { errorHandler } from "./api/middlewares/errorHandler";

export function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "WRMS API",
        description: "Warehouse Reservation Management System API",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT ?? 3333}`,
          description: "Local server",
        },
      ],
      tags: [
        { name: "Auth", description: "Authentication" },
        { name: "Products", description: "Product management" },
        { name: "Warehouses", description: "Warehouse management" },
        { name: "Inventory", description: "Inventory management" },
        { name: "Reservations", description: "Reservation management" },
        { name: "Dashboard", description: "Dashboard metrics" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  app.register(fastifySwaggerUi, {
    routePrefix: "/documentation",
  });

  return app;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun run test -- tests/integration/app.test.ts`
Expected: PASS — 9 tests passed (the original 7 from plan 2 + the 2 new ones).

- [ ] **Step 7: Commit**

```bash
git add src/api/schemas/error.schema.ts src/api/middlewares/errorHandler.ts src/app.ts tests/integration/app.test.ts
git commit -m "feat: add Swagger documentation and response serialization error handling"
```

---

### Task 4: Auth Route

**Files:**

- Create: `src/api/schemas/auth.schema.ts`
- Create: `src/api/routes/auth.routes.ts`
- Create: `src/api/routes/index.ts` (route aggregator — see Notes)
- Modify: `src/app.ts`
- Test: `tests/integration/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/auth.test.ts
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/infrastructure/database/prisma";

const app = buildApp();
const email = `login-${randomUUID()}@wrms.com`;
const password = "Test@1234";
let userId: string;

beforeAll(async () => {
  await app.ready();
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, role: "Admin" },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } });
});

describe("POST /api/auth/login", () => {
  it("returns 200 and a token for valid credentials", async () => {
    const response = await request(app.server)
      .post("/api/auth/login")
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTypeOf("string");
    expect(response.body.user).toEqual({ id: userId, email, role: "Admin" });
  });

  it("returns 401 for the wrong password", async () => {
    const response = await request(app.server)
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 for a non-existent email", async () => {
    const response = await request(app.server)
      .post("/api/auth/login")
      .send({ email: "does-not-exist@wrms.com", password });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("INVALID_CREDENTIALS");
  });

  it("returns 400 when email is missing", async () => {
    const response = await request(app.server)
      .post("/api/auth/login")
      .send({ password });

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- tests/integration/auth.test.ts`
Expected: FAIL — `POST /api/auth/login` returns 404 (no route registered yet).

- [ ] **Step 3: Implement `src/api/schemas/auth.schema.ts`**

```ts
import { z } from "zod";

export const loginBodySchema = z.object({
  email: z.string().email().describe("Registered user email"),
  password: z.string().min(1).describe("User password"),
});

export const loginResponseSchema = z.object({
  token: z.string().describe("JWT access token"),
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.enum(["Admin", "Operator"]),
  }),
});
```

- [ ] **Step 4: Implement `src/api/routes/auth.routes.ts`**

```ts
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { Login } from "../../application/use-cases/auth/Login";
import { jwtService } from "../../infrastructure/auth/JwtService";
import { PrismaUserRepository } from "../../infrastructure/repositories/PrismaUserRepository";
import { errorResponseSchema } from "../schemas/error.schema";
import { loginBodySchema, loginResponseSchema } from "../schemas/auth.schema";

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const login = new Login(new PrismaUserRepository(), jwtService);

  app.post(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Authenticate and issue a JWT",
        body: loginBodySchema,
        response: {
          200: loginResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await login.execute(request.body);
      reply.status(200).send(result);
    },
  );
};
```

- [ ] **Step 5: Create `src/api/routes/index.ts` (route aggregator)**

This is the only file `app.ts` ever needs to import for business routes. Subsystems 4–8 each add one `await app.register(xRoutes);` line here — `app.ts` itself never changes again.

```ts
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { authRoutes } from "./auth.routes";

export const routes: FastifyPluginAsyncZod = async (app) => {
  await app.register(authRoutes);
};
```

- [ ] **Step 6: Modify `src/app.ts` to register the aggregator**

Add the import:

```ts
import { routes } from "./api/routes";
```

Add this line right before `return app;`:

```ts
app.register(routes, { prefix: "/api" });
```

- [ ] **Step 7: Run test to verify it passes**

Run: `bun run test -- tests/integration/auth.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 8: Run the full test suite to check for regressions**

Run: `bun run test`
Expected: PASS — all tests across all files still pass.

- [ ] **Step 9: Commit**

```bash
git add src/api/schemas/auth.schema.ts src/api/routes/auth.routes.ts src/api/routes/index.ts src/app.ts tests/integration/auth.test.ts
git commit -m "feat: add POST /api/auth/login"
```

---

## Self-Review

**Spec coverage:**

- PRD §5.1 (`POST /api/auth/login`, public, request/response shape) → Task 4. ✅
- PRD §9.2 `auth.test.ts` (all 4 cases: valid login, wrong password, unknown email, invalid body) → Task 4's test, exact match, no more no less. ✅
- PRD §13 checklist "JWT Auth com roles" → completed end-to-end with this plan (plan 2 built `JwtService`, this plan builds the route that actually issues tokens). ✅
- PRD §3.5 "Nunca retornar passwordHash em nenhum endpoint" → `LoginOutput.user` only exposes `id`, `email`, `role`; `passwordHash` never leaves `Login.execute`, and is absent from `loginResponseSchema`. ✅
- `00-overview.md` subsystem 3 description ("first vertical slice end-to-end: route → use case → repository → JWT") → Tasks 1–2 and 4 implement exactly that chain. ✅
- User's explicit request to document the API with Swagger and proper per-route schemas → Task 3 (infra) + Task 4 (the route itself fully schema'd with tags/summary/response shapes). ✅

**Placeholder scan:** No TBD/TODO, no "add appropriate error handling" — every step has complete code. ✅

**Type consistency:** `UserRecord.role` and `LoginOutput.user.role` both `'Admin' | 'Operator'`, matching `AuthTokenPayload['role']` from plan 2's `JwtService` and `loginResponseSchema`'s `z.enum(['Admin', 'Operator'])` — same literal union everywhere, no redefinition drift. `IUserRepository.findByEmail` is the only method, used consistently by `Login` and tested by `auth.test.ts`. `errorResponseSchema` is defined once and reused by every route's error responses (just `auth.routes.ts` for now). ✅

---

## Execution Handoff

Plan complete and saved to `backend/docs/tasks/03-auth.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
