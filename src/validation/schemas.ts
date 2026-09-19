import { z } from 'zod';

export const universityEnum = z.enum(['KMITL', 'KMUTNB', 'KMUTT'], {
  message: 'Please select a valid university (KMITL, KMUTNB, KMUTT)',
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'ชื่อ-นามสกุลต้องมีความยาวอย่างน้อย 2 ตัวอักษร').max(80),
  email: z.string().email('กรุณากรอกอีเมลที่ถูกต้อง').transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(10, 'รหัสผ่านต้องมีความยาวอย่างน้อย 10 ตัวอักษร')
    .max(128)
    .regex(/[a-z]/, 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
    .regex(/[A-Z]/, 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
    .regex(/\d/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'),
  university: universityEnum,
  faculty: z.string().trim().optional(),
  department: z.string().trim().optional(),
});

export const registerFormSchema = registerSchema
  .extend({
    faculty: z.string().trim().min(1, 'กรุณาเลือกคณะวิชา'),
    department: z.string().trim().min(1, 'กรุณาเลือกภาควิชา'),
    confirmPassword: z.string().min(1, 'กรุณากรอกยืนยันรหัสผ่าน'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
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
  faculty?: string | undefined;
  department?: string | undefined;
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