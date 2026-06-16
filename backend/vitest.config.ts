import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.test", override: true });

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		globalSetup: ["./tests/setup/global-setup.ts"],
	},
});
