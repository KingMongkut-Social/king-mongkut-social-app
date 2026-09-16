import { z } from 'zod';

export const universityEnum = z.enum(['KMITL', 'KMUTNB', 'KMUTT'], {
  message: 'Please select a valid university (KMITL, KMUTNB, KMUTT)',
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Please enter a valid email address').transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128)
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/\d/, 'Password must include a number'),
  university: universityEnum,
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Password is required').max(128),
});

export const postSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  content: z.string().trim().min(1, 'Content is required').max(20_000),
  status: z.enum(['draft', 'published']).default('draft'),
  coverImage: z.string().url().nullable().optional(),
  tags: z.array(z.string().trim()).default([]),
});

// กำหนด Type ด้วย TypeScript โดยตรง เลี่ยงปัญหา generic output ของ z.infer
export type University = 'KMITL' | 'KMUTNB' | 'KMUTT';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  university: University;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PostInput {
  title: string;
  content: string;
  status: 'draft' | 'published';
  coverImage?: string | null;
  tags: string[];
}