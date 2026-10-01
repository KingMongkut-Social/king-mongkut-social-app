import { describe, expect, it } from 'vitest';
import { postSchema, profileSchema } from '../src/validation/schemas';

describe('profileSchema', () => {
  const valid = {
    name: ' Student Name ',
    username: 'Student.Name',
    bio: ' Computer engineering student ',
    faculty: ' วิศวกรรมศาสตร์ ',
    department: ' คอมพิวเตอร์ ',
    academicYear: 2,
  };

  it('normalizes every required first-login profile field', () => {
    expect(profileSchema.parse(valid)).toEqual({
      name: 'Student Name',
      username: 'student.name',
      bio: 'Computer engineering student',
      faculty: 'วิศวกรรมศาสตร์',
      department: 'คอมพิวเตอร์',
      academicYear: 2,
    });
  });

  it('rejects missing, blank, invalid and oversized required fields', () => {
    for (const input of [
      { ...valid, name: ' ' },
      { ...valid, username: 'bad space' },
      { ...valid, bio: ' ' },
      { ...valid, faculty: ' ' },
      { ...valid, department: ' ' },
      { ...valid, academicYear: 0 },
      { ...valid, academicYear: 9 },
      { ...valid, faculty: 'A'.repeat(151) },
      { ...valid, university: 'KMITL' },
      { faculty: 'Engineering', department: 'Computer' },
    ]) expect(profileSchema.safeParse(input).success).toBe(false);
  });
});

describe('postSchema', () => {
  it('trims title and content', () => {
    const parsed = postSchema.parse({
      title: '  Hello  ',
      content: '  World  ',
      status: 'draft',
    });
    expect(parsed).toEqual({ title: 'Hello', content: 'World', status: 'draft', tags: [] });
  });
});
