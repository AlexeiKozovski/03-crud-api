import 'dotenv/config';
import cluster from 'node:cluster';
import { createServer, request } from 'node:http';
import { availableParallelism } from 'node:os';
import { buildApp } from './app.js';
import { handleProductStoreIpcMessage, IpcProductStore } from './store/ipc-product-store.js';
import { MemoryProductStore } from './store/product-store.js';

const basePort = Number.parseInt(process.env.PORT ?? '4000', 10);
if (Number.isNaN(basePort) || basePort < 1) {
  throw new Error('PORT must be a positive integer');
}

function startBalancer(workerPorts: number[], listenPort: number) {
  let roundRobin = 0;
  return createServer((clientReq, clientRes) => {
    const targetPort = workerPorts[roundRobin++ % workerPorts.length];
    const proxyReq = request(
      {
        hostname: '127.0.0.1',
        port: targetPort,
        path: clientReq.url ?? '/',
        method: clientReq.method,
        headers: { ...clientReq.headers, host: `127.0.0.1:${targetPort}` },
      },
      (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(clientRes);
      },
    );
    proxyReq.on('error', () => {
      if (!clientRes.headersSent) {
        clientRes.statusCode = 502;
      }
      clientRes.end('The load balancer could not reach a worker.');
    });
    clientReq.pipe(proxyReq);
  }).listen(listenPort, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(
      `Load balancer listening on http://0.0.0.0:${listenPort} (workers: ${workerPorts.join(', ')})`,
    );
  });
}

async function runWorker() {
  const workerPort = Number.parseInt(process.env.WORKER_PORT ?? '0', 10);
  if (Number.isNaN(workerPort) || workerPort < 1) {
    throw new Error('WORKER_PORT must be set for cluster workers');
  }
  const store = new IpcProductStore();
  const app = buildApp(store);
  await app.listen({ port: workerPort, host: '127.0.0.1' });
  process.send?.({ type: 'worker-ready' });
}

if (cluster.isPrimary) {
  const workerCount = Math.max(1, availableParallelism() - 1);
  const store = new MemoryProductStore();
  const workerPorts = Array.from({ length: workerCount }, (_, i) => basePort + i + 1);

  let readyWorkers = 0;
  let balancerStarted = false;

  cluster.on('message', (worker, message) => {
    if (message && typeof message === 'object' && (message as { type?: string }).type === 'worker-ready') {
      readyWorkers += 1;
      if (readyWorkers === workerCount && !balancerStarted) {
        balancerStarted = true;
        startBalancer(workerPorts, basePort);
      }
      return;
    }
    handleProductStoreIpcMessage(store, worker, message);
  });

  for (let i = 0; i < workerCount; i++) {
    const workerPort = workerPorts[i]!;
    cluster.fork({
      env: {
        ...process.env,
        WORKER_PORT: String(workerPort),
      },
    });
  }
} else {
  await runWorker();
}
