import 'dotenv/config';
import { buildApp } from './app.js';
import { MemoryProductStore } from './store/product-store.js';

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
if (Number.isNaN(port) || port < 1) {
  throw new Error('PORT must be a positive integer');
}

const store = new MemoryProductStore();
const app = buildApp(store);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
