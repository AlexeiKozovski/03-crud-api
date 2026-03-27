import { z } from 'zod';

export const productCreateSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().min(1, 'description is required'),
  price: z.number().positive('price must be a positive number'),
  category: z.string().min(1, 'category is required'),
  inStock: z.boolean(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema;
