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
  app.get('/products', async () => {
    return store.findAll();
  });

  app.get<{ Params: { productId: string } }>('/products/:productId', async (request, reply) => {
    const { productId } = request.params;
    if (!isUuid(productId)) {
      return reply.status(400).send({ message: invalidIdMessage });
    }
    const product = await store.findById(productId);
    if (!product) {
      return reply.status(404).send({ message: `No product was found for id ${productId}.` });
    }
    return product;
  });

  app.post('/products', async (request, reply) => {
    const parsed = productCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: firstZodIssueMessage(parsed.error) });
    }
    const product = await store.create(parsed.data);
    return reply.status(201).send(product);
  });

  app.put<{ Params: { productId: string } }>('/products/:productId', async (request, reply) => {
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
  });

  app.delete<{ Params: { productId: string } }>('/products/:productId', async (request, reply) => {
    const { productId } = request.params;
    if (!isUuid(productId)) {
      return reply.status(400).send({ message: invalidIdMessage });
    }
    const removed = await store.delete(productId);
    if (!removed) {
      return reply.status(404).send({ message: `No product was found for id ${productId}.` });
    }
    return reply.status(204).send();
  });
}
