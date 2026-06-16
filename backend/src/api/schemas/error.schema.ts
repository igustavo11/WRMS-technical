import { z } from 'zod';

export const errorResponseSchema = z.object({
	error: z.string(),
	message: z.string(),
	statusCode: z.number(),
});

z.globalRegistry.add(errorResponseSchema, { id: 'ErrorResponse' });
