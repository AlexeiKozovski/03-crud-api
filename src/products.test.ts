import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { MemoryProductStore } from './store/product-store.js';

function makeValidBody() {
  return {
    name: 'Test',
    description: 'Desc',
    price: 9.99,
    category: 'electronics',
    inStock: true,
  };
}

describe('Product catalog API', () => {
  it('returns an empty array for GET /api/products', async () => {
    const app = buildApp(new MemoryProductStore());
    const res = await app.inject({ method: 'GET', url: '/api/products' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
    await app.close();
  });

  it('runs full CRUD flow: create, read, update, delete, then 404', async () => {
    const app = buildApp(new MemoryProductStore());

    const listBefore = await app.inject({ method: 'GET', url: '/api/products' });
    expect(listBefore.statusCode).toBe(200);
    expect(JSON.parse(listBefore.body)).toEqual([]);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: makeValidBody(),
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body) as { id: string };
    expect(created.id).toBeTruthy();
    expect(created).toMatchObject(makeValidBody());

    const getRes = await app.inject({ method: 'GET', url: `/api/products/${created.id}` });
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body)).toMatchObject(created);

    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/products/${created.id}`,
      payload: { ...makeValidBody(), name: 'Updated', price: 12.5 },
    });
    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.body);
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Updated');
    expect(updated.price).toBe(12.5);

    const delRes = await app.inject({ method: 'DELETE', url: `/api/products/${created.id}` });
    expect(delRes.statusCode).toBe(204);

    const getDeleted = await app.inject({ method: 'GET', url: `/api/products/${created.id}` });
    expect(getDeleted.statusCode).toBe(404);

    await app.close();
  });

  it('rejects invalid product id with 400 on GET', async () => {
    const app = buildApp(new MemoryProductStore());
    const res = await app.inject({ method: 'GET', url: '/api/products/not-a-uuid' });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { message: string };
    expect(body.message).toContain('UUID');
    await app.close();
  });

  it('rejects POST when price is not positive', async () => {
    const app = buildApp(new MemoryProductStore());
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { ...makeValidBody(), price: 0 },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('responds 404 with a friendly message for unknown routes', async () => {
    const app = buildApp(new MemoryProductStore());
    const res = await app.inject({ method: 'GET', url: '/some-non/existing/resource' });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body) as { message: string };
    expect(body.message.length).toBeGreaterThan(0);
    await app.close();
  });

  it('returns 404 for GET when UUID is valid but missing', async () => {
    const app = buildApp(new MemoryProductStore());
    const id = randomUUID();
    const res = await app.inject({ method: 'GET', url: `/api/products/${id}` });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
