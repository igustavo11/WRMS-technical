Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv in application code (`src/`).

## Tests

This project uses **Vitest + Supertest** (not `bun test`), per the PRD requirement. Run with `bun run test` / `bun run test:watch`.

Vitest's test workers run under Node, not Bun (`typeof Bun` is `undefined` inside test files) — Bun's automatic `.env`/`.env.test` loading does not reach them. `vitest.config.ts` and `tests/setup/global-setup.ts` load env vars explicitly via `dotenv` instead. Integration tests run against a separate `wrms_test` database (`.env.test`), kept in sync automatically by the Vitest global setup (`prisma db push`).

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
```
