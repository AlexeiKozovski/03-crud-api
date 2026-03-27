import type { FastifyInstance } from 'fastify';
import { validate as isUuid } from 'uuid';
import { z } from 'zod';
import { productCreateSchema, productUpdateSchema } from '../schemas/product.js';
import type { ProductStore } from '../store/product-store.js';

function firstZodIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Request body validation failed';
}

const invalidIdMessage = 'Invalid product id: value must be a valid UUID.';

export async function registerProductRoutes(app: FastifyInstance, store: ProductStore) {
  const productSchema = {
    type: 'object',
    required: ['id', 'name', 'description', 'price', 'category', 'inStock'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'number', exclusiveMinimum: 0 },
      category: { type: 'string' },
      inStock: { type: 'boolean' },
    },
    additionalProperties: false,
  } as const;

  const productCreateBodySchema = {
    type: 'object',
    required: ['name', 'description', 'price', 'category', 'inStock'],
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'number', exclusiveMinimum: 0 },
      category: { type: 'string' },
      inStock: { type: 'boolean' },
    },
    additionalProperties: false,
  } as const;

  const errorSchema = {
    type: 'object',
    required: ['message'],
    properties: {
      message: { type: 'string' },
    },
    additionalProperties: false,
  } as const;

  app.get(
    '/products',
    {
      schema: {
        tags: ['products'],
        summary: 'Get all products',
        response: {
          200: { type: 'array', items: productSchema },
        },
      },
    },
    async () => {
    return store.findAll();
    },
  );

  app.get<{ Params: { productId: string } }>(
    '/products/:productId',
    {
      schema: {
        tags: ['products'],
        summary: 'Get product by id',
        params: {
          type: 'object',
          required: ['productId'],
          properties: { productId: { type: 'string' } },
          additionalProperties: false,
        },
        response: {
          200: productSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
    const { productId } = request.params;
    if (!isUuid(productId)) {
      return reply.status(400).send({ message: invalidIdMessage });
    }
    const product = await store.findById(productId);
    if (!product) {
      return reply.status(404).send({ message: `No product was found for id ${productId}.` });
    }
    return product;
    },
  );

  app.post(
    '/products',
    {
      schema: {
        tags: ['products'],
        summary: 'Create a product',
        body: productCreateBodySchema,
        response: {
          201: productSchema,
          400: errorSchema,
        },
      },
    },
    async (request, reply) => {
    const parsed = productCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: firstZodIssueMessage(parsed.error) });
    }
    const product = await store.create(parsed.data);
    return reply.status(201).send(product);
    },
  );

  app.put<{ Params: { productId: string } }>(
    '/products/:productId',
    {
      schema: {
        tags: ['products'],
        summary: 'Update a product',
        params: {
          type: 'object',
          required: ['productId'],
          properties: { productId: { type: 'string' } },
          additionalProperties: false,
        },
        body: productCreateBodySchema,
        response: {
          200: productSchema,
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
    const { productId } = request.params;
    if (!isUuid(productId)) {
      return reply.status(400).send({ message: invalidIdMessage });
    }
    const parsed = productUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: firstZodIssueMessage(parsed.error) });
    }
    const product = await store.update(productId, parsed.data);
    return reply.status(200).send(product);
    },
  );

  app.delete<{ Params: { productId: string } }>(
    '/products/:productId',
    {
      schema: {
        tags: ['products'],
        summary: 'Delete a product',
        params: {
          type: 'object',
          required: ['productId'],
          properties: { productId: { type: 'string' } },
          additionalProperties: false,
        },
        response: {
          204: { type: 'null' },
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
    const { productId } = request.params;
    if (!isUuid(productId)) {
      return reply.status(400).send({ message: invalidIdMessage });
    }
    const removed = await store.delete(productId);
    if (!removed) {
      return reply.status(404).send({ message: `No product was found for id ${productId}.` });
    }
    return reply.status(204).send();
    },
  );
}
