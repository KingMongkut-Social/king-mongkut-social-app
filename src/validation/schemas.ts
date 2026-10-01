import { z } from 'zod';

export const universityEnum = z.enum(['KMITL', 'KMUTNB', 'KMUTT'], {
  message: 'Please select a valid university (KMITL, KMUTNB, KMUTT)',
});

export const profileSchema = z.strictObject({
  name: z.string().trim().min(2, 'กรุณากรอกชื่อที่แสดงอย่างน้อย 2 ตัวอักษร').max(80, 'ชื่อที่แสดงต้องไม่เกิน 80 ตัวอักษร'),
  username: z.string().trim().toLowerCase().regex(
    /^[a-z0-9_][a-z0-9._]{1,28}[a-z0-9_]$/,
    'Username ต้องมี 3–30 ตัว ใช้ a–z, 0–9, _ หรือ .',
  ),
  bio: z.string().trim().min(1, 'กรุณากรอก Bio').max(500, 'Bio ต้องไม่เกิน 500 ตัวอักษร'),
  faculty: z.string().trim().min(1, 'กรุณากรอกคณะ').max(150, 'คณะต้องไม่เกิน 150 ตัวอักษร'),
  department: z.string().trim().min(1, 'กรุณากรอกภาควิชา').max(150, 'ภาควิชาต้องไม่เกิน 150 ตัวอักษร'),
  academicYear: z.number().int().min(1, 'กรุณาเลือกชั้นปี').max(8, 'ชั้นปีต้องอยู่ระหว่าง 1–8'),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const postSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  content: z.string().trim().max(20_000),
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
