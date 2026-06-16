import { buildApp } from './app';

const app = buildApp();
const port = Number(process.env.PORT ?? 3333);

app.listen({ port, host: '0.0.0.0' }, (error, address) => {
	if (error) {
		app.log.error(error);
		process.exit(1);
	}

	app.log.info(`Server listening at ${address}`);
});
