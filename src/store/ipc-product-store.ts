import type { Product, ProductCreateBody, ProductUpdateBody } from '../types/product.js';
import { ProductNotFoundError, type ProductStore } from './product-store.js';

type IpcRequest = {
  type: 'product-store';
  requestId: number;
  method: 'findAll' | 'findById' | 'create' | 'update' | 'delete';
  args: unknown[];
};

type IpcResponse =
  | { type: 'product-store-response'; requestId: number; ok: true; result: unknown }
  | {
      type: 'product-store-response';
      requestId: number;
      ok: false;
      error: 'not_found' | 'internal';
      productId?: string;
      message?: string;
    };

let requestSeq = 0;

export class IpcProductStore implements ProductStore {
  private readonly pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();

  constructor() {
    process.on('message', (msg: unknown) => {
      if (!msg || typeof msg !== 'object') return;
      const m = msg as IpcResponse;
      if (m.type !== 'product-store-response') return;
      const p = this.pending.get(m.requestId);
      if (!p) return;
      this.pending.delete(m.requestId);
      if (m.ok) {
        p.resolve(m.result);
      } else if (m.error === 'not_found') {
        const fail = m as Extract<IpcResponse, { ok: false }>;
        p.reject(new ProductNotFoundError(String(fail.productId ?? '')));
      } else {
        p.reject(new Error(m.message ?? 'Store operation failed'));
      }
    });
  }

  private request(method: IpcRequest['method'], ...args: unknown[]): Promise<unknown> {
    if (!process.send) {
      return Promise.reject(new Error('IPC is not available in this process'));
    }
    const requestId = requestSeq++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      process.send!({ type: 'product-store', requestId, method, args } satisfies IpcRequest);
    });
  }

  findAll(): Promise<Product[]> {
    return this.request('findAll') as Promise<Product[]>;
  }

  findById(id: string): Promise<Product | undefined> {
    return this.request('findById', id) as Promise<Product | undefined>;
  }

  create(body: ProductCreateBody): Promise<Product> {
    return this.request('create', body) as Promise<Product>;
  }

  update(id: string, body: ProductUpdateBody): Promise<Product> {
    return this.request('update', id, body) as Promise<Product>;
  }

  delete(id: string): Promise<boolean> {
    return this.request('delete', id) as Promise<boolean>;
  }
}

export function handleProductStoreIpcMessage(
  store: import('./product-store.js').MemoryProductStore,
  worker: import('node:cluster').Worker,
  msg: unknown,
): void {
  if (!msg || typeof msg !== 'object') return;
  const m = msg as IpcRequest;
  if (m.type !== 'product-store') return;

  void (async () => {
    try {
      let result: unknown;
      switch (m.method) {
        case 'findAll':
          result = await store.findAll();
          break;
        case 'findById':
          result = await store.findById(m.args[0] as string);
          break;
        case 'create':
          result = await store.create(m.args[0] as ProductCreateBody);
          break;
        case 'update':
          result = await store.update(m.args[0] as string, m.args[1] as ProductUpdateBody);
          break;
        case 'delete':
          result = await store.delete(m.args[0] as string);
          break;
        default:
          worker.send({
            type: 'product-store-response',
            requestId: m.requestId,
            ok: false,
            error: 'internal',
            message: 'Unknown store method',
          } satisfies IpcResponse);
          return;
      }
      worker.send({
        type: 'product-store-response',
        requestId: m.requestId,
        ok: true,
        result,
      } satisfies IpcResponse);
    } catch (e) {
      if (e instanceof ProductNotFoundError) {
        const productId = (m.args[0] as string) ?? '';
        worker.send({
          type: 'product-store-response',
          requestId: m.requestId,
          ok: false,
          error: 'not_found',
          productId,
        } satisfies IpcResponse);
      } else {
        const message = e instanceof Error ? e.message : 'Internal store error';
        worker.send({
          type: 'product-store-response',
          requestId: m.requestId,
          ok: false,
          error: 'internal',
          message,
        } satisfies IpcResponse);
      }
    }
  })();
}
