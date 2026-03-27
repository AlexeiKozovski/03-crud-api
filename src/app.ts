import Fastify, { type FastifyError } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registerProductRoutes } from './routes/products.js';
import { ProductNotFoundError } from './store/product-store.js';
import type { ProductStore } from './store/product-store.js';

export function buildApp(store: ProductStore) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  void app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Product Catalog API',
        version: '1.0.0',
      },
    },
  });

  void app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
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
    const fastifyError = error as FastifyError;
    if (fastifyError.validation?.length) {
      return reply.status(400).send({
        message: 'Request body or parameters did not match the expected format.',
      });
    }
    if (fastifyError.statusCode === 400) {
      return reply.status(400).send({ message: fastifyError.message });
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
