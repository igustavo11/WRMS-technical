import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { CreateProduct } from '../../application/use-cases/products/CreateProduct';
import { GetProductById } from '../../application/use-cases/products/GetProductById';
import { GetProducts } from '../../application/use-cases/products/GetProducts';
import { UpdateProduct } from '../../application/use-cases/products/UpdateProduct';
import { PrismaProductRepository } from '../../infrastructure/repositories/PrismaProductRepository';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { errorResponseSchema } from '../schemas/error.schema';
import {
	createProductBodySchema,
	productIdParamsSchema,
	productResponseSchema,
	updateProductBodySchema,
} from '../schemas/product.schema';

export const productsRoutes: FastifyPluginAsyncZod = async (app) => {
	const productRepository = new PrismaProductRepository();
	const createProduct = new CreateProduct(productRepository);
	const updateProduct = new UpdateProduct(productRepository);
	const getProducts = new GetProducts(productRepository);
	const getProductById = new GetProductById(productRepository);

	app.get(
		'/products',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Products'],
				summary: 'List all products',
				security: [{ bearerAuth: [] }],
				response: {
					200: productResponseSchema.array(),
					401: errorResponseSchema,
					403: errorResponseSchema,
				},
			},
		},
		async () => {
			return getProducts.execute();
		},
	);

	app.get(
		'/products/:id',
		{
			preHandler: [authenticate, authorize(['Admin', 'Operator'])],
			schema: {
				tags: ['Products'],
				summary: 'Get a product by id',
				security: [{ bearerAuth: [] }],
				params: productIdParamsSchema,
				response: {
					200: productResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
				},
			},
		},
		async (request) => {
			return getProductById.execute(request.params.id);
		},
	);

	app.post(
		'/products',
		{
			preHandler: [authenticate, authorize(['Admin'])],
			schema: {
				tags: ['Products'],
				summary: 'Create a product',
				security: [{ bearerAuth: [] }],
				body: createProductBodySchema,
				response: {
					201: productResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					409: errorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const result = await createProduct.execute(request.body);
			reply.status(201).send(result);
		},
	);

	app.put(
		'/products/:id',
		{
			preHandler: [authenticate, authorize(['Admin'])],
			schema: {
				tags: ['Products'],
				summary: 'Update a product',
				security: [{ bearerAuth: [] }],
				params: productIdParamsSchema,
				body: updateProductBodySchema,
				response: {
					200: productResponseSchema,
					400: errorResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
				},
			},
		},
		async (request) => {
			return updateProduct.execute(request.params.id, request.body);
		},
	);
};
