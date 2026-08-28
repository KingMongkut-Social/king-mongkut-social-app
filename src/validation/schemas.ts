import { z } from 'zod';

const password = z.string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters')
  .regex(/[a-z]/, 'Add at least one lowercase letter')
  .regex(/[A-Z]/, 'Add at least one uppercase letter')
  .regex(/\d/, 'Add at least one number');

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password').max(128),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.email('Enter a valid email address'),
  password,
});

export const postSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150, 'Title must be 150 characters or fewer'),
  content: z.string().trim().min(1, 'Content is required').max(20_000, 'Content must be 20,000 characters or fewer'),
  status: z.enum(['draft', 'published']),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type PostForm = z.infer<typeof postSchema>;
