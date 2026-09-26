import { z } from 'zod';

export const universityEnum = z.enum(['KMITL', 'KMUTNB', 'KMUTT'], {
  message: 'Please select a valid university (KMITL, KMUTNB, KMUTT)',
});

export const profileSchema = z.strictObject({
  faculty: z.string().trim().min(1, 'กรุณากรอกคณะ').max(150, 'คณะต้องไม่เกิน 150 ตัวอักษร'),
  department: z.string().trim().min(1, 'กรุณากรอกภาควิชา').max(150, 'ภาควิชาต้องไม่เกิน 150 ตัวอักษร'),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const postSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  content: z.string().trim().min(1, 'Content is required').max(20_000),
  status: z.enum(['draft', 'published']).default('draft'),
  coverImage: z.string().url().nullable().optional(),
  tags: z.array(z.string().trim()).default([]),
});

// กำหนด Type ด้วย TypeScript โดยตรง เลี่ยงปัญหา generic output ของ z.infer
export type University = 'KMITL' | 'KMUTNB' | 'KMUTT';

export interface PostInput {
  title: string;
  content: string;
  status: 'draft' | 'published';
  coverImage?: string | null;
  tags: string[];
}