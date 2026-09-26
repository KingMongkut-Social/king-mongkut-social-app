import { describe, expect, it } from 'vitest';
import { postSchema, profileSchema } from '../src/validation/schemas';

describe('profileSchema', () => {
  it('trims faculty and department', () => {
    expect(profileSchema.parse({ faculty: ' วิศวกรรมศาสตร์ ', department: ' คอมพิวเตอร์ ' }))
      .toEqual({ faculty: 'วิศวกรรมศาสตร์', department: 'คอมพิวเตอร์' });
  });

  it('rejects blank, missing and oversized fields and identity edits', () => {
    for (const input of [
      { faculty: ' ', department: 'Computer' },
      { faculty: 'Engineering' },
      { faculty: 'A'.repeat(151), department: 'Computer' },
      { faculty: 'Engineering', department: 'A'.repeat(151) },
      { faculty: 'Engineering', department: 'Computer', university: 'KMITL' },
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
