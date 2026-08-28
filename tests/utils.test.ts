import { describe, expect, it } from 'vitest';
import { excerpt } from '../src/core/utils/format';
import { paginationWindow } from '../src/core/utils/pagination';

describe('excerpt', () => {
  it('normalizes whitespace and truncates safely', () => {
    expect(excerpt('Hello\n\nworld', 20)).toBe('Hello world');
    expect(excerpt('1234567890', 5)).toBe('12345…');
  });
});

describe('paginationWindow', () => {
  it('stays inside valid bounds', () => {
    expect(paginationWindow(1, 10)).toEqual([1, 2, 3]);
    expect(paginationWindow(5, 10)).toEqual([3, 4, 5, 6, 7]);
    expect(paginationWindow(10, 10)).toEqual([8, 9, 10]);
  });
});
