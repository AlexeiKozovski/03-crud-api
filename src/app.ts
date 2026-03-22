import Fastify from 'fastify';
import { registerProductRoutes } from './routes/products.js';
import { ProductNotFoundError } from './store/product-store.js';
import type { ProductStore } from './store/product-store.js';

export function buildApp(store: ProductStore) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      message: 'The requested endpoint does not exist.',
    });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ProductNotFoundError) {
      return reply.status(404).send({ message: error.message });
    }
    request.log.error(error);
    if (reply.sent) {
      return;
    }
    return reply.status(500).send({
      message: 'Something went wrong while handling your request. Please try again later.',
    });
  });

  void app.register(
    async (instance) => {
      await registerProductRoutes(instance, store);
    },
    { prefix: '/api' },
  );

  return app;
}
