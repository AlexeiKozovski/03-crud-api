import { randomUUID } from 'node:crypto';
import type { Product, ProductCreateBody, ProductUpdateBody } from '../types/product.js';

export interface ProductStore {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | undefined>;
  create(body: ProductCreateBody): Promise<Product>;
  update(id: string, body: ProductUpdateBody): Promise<Product>;
  delete(id: string): Promise<boolean>;
}

export class MemoryProductStore implements ProductStore {
  private readonly products = new Map<string, Product>();

  async findAll(): Promise<Product[]> {
    return [...this.products.values()];
  }

  async findById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async create(body: ProductCreateBody): Promise<Product> {
    const product: Product = { id: randomUUID(), ...body };
    this.products.set(product.id, product);
    return product;
  }

  async update(id: string, body: ProductUpdateBody): Promise<Product> {
    const existing = this.products.get(id);
    if (!existing) {
      throw new ProductNotFoundError(id);
    }
    const updated: Product = { id, ...body };
    this.products.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.products.delete(id);
  }
}

export class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Product with id ${id} was not found`);
    this.name = 'ProductNotFoundError';
  }
}
