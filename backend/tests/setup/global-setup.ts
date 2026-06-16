import { execSync } from "node:child_process";
import dotenv from "dotenv";

export default function setup() {
	dotenv.config({ path: ".env" });
	dotenv.config({ path: ".env.test", override: true });

	execSync("bunx prisma db push", {
		stdio: "inherit",
		env: process.env,
	});
}
