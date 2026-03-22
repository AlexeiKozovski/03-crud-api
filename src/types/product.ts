export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
};

export type ProductCreateBody = Omit<Product, 'id'>;

export type ProductUpdateBody = ProductCreateBody;
