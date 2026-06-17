import { buildApp } from './app';
import { prisma } from './infrastructure/database/prisma';

const MAX_RETRIES = 10;
const INITIAL_DELAY_MS = 2000;

async function connectWithRetry(): Promise<void> {
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			console.log(`[db] Connection attempt ${attempt}/${MAX_RETRIES}...`);
			await prisma.$connect();
			console.log('[db] Connected to database successfully.');
			return;
		} catch (error) {
			const isLastAttempt = attempt === MAX_RETRIES;
			if (isLastAttempt) {
				throw error;
			}

			const delayMs = INITIAL_DELAY_MS * 2 ** (attempt - 1);
			console.warn(
				`[db] Connection attempt ${attempt} failed: ${(error as Error).message}. ` +
					`Retrying in ${delayMs / 1000}s...`,
			);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
}

const app = buildApp();
const port = Number(process.env.PORT ?? 3333);

try {
	await connectWithRetry();
} catch (error) {
	console.error('[db] Could not connect to the database after maximum retries:', error);
	process.exit(1);
}

app.listen({ port, host: '0.0.0.0' }, (error, address) => {
	if (error) {
		app.log.error(error);
		process.exit(1);
	}

	app.log.info(`Server listening at ${address}`);
});
