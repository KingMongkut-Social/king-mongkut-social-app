// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../src/core/auth/auth-store';
import { mountPostSocial } from '../src/modules/posts/post-social';
import type { Post, PostComment, User } from '../src/types/api';

const mocks = vi.hoisted(() => ({
  like: vi.fn(), unlike: vi.fn(), bookmark: vi.fn(), unbookmark: vi.fn(),
  listComments: vi.fn(), addComment: vi.fn(), removeComment: vi.fn(),
}));

vi.mock('../src/modules/posts/posts-api', () => ({ postsApi: mocks }));

const user: User = {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Alice', email: 'alice@kmitl.ac.th', role: 'user',
  university: 'KMITL', faculty: 'Engineering', department: 'Computer', needsProfileCompletion: false,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const post: Post = {
  _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', user, title: 'Project', content: 'Hello', status: 'published',
  likeCount: 2, commentCount: 1, likedByMe: false, savedByMe: false,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const comment: PostComment = {
  _id: 'cccccccccccccccccccccccc', post: post._id, author: user, content: 'Great work', parentId: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  authStore.setAuthenticated(user, 'access-token');
  document.body.replaceChildren(Object.assign(document.createElement('div'), { id: 'toast-root' }));
  mocks.like.mockResolvedValue({ data: { post: { ...post, likeCount: 3, likedByMe: true } } });
  mocks.bookmark.mockResolvedValue({ data: { post: { ...post, savedByMe: true } } });
  mocks.listComments.mockResolvedValue({ data: { items: [comment], page: 1, limit: 50, total: 1, pages: 1 } });
  mocks.addComment.mockResolvedValue({ data: { comment: { ...comment, _id: 'dddddddddddddddddddddddd', content: 'Second comment' } } });
});

afterEach(() => {
  authStore.setAnonymous();
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe('post social controls', () => {
  it('uses the API for likes, saved posts, and comments and updates the displayed counts', async () => {
    const card = document.createElement('article');
    document.body.append(card);
    mountPostSocial(card, post, user._id, user.name);
    expect(card.querySelector('.post-social-summary__likes')?.textContent).toContain('2');
    expect(card.querySelector('.post-social-summary__comments')?.textContent).toContain('1');

    const buttons = [...card.querySelectorAll<HTMLButtonElement>('.post-reactions-footer button')];
    buttons[0]?.click();
    await vi.waitFor(() => expect(mocks.like).toHaveBeenCalledWith(post._id));
    await vi.waitFor(() => expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true'));
    expect(card.querySelector('.post-social-summary__likes')?.textContent).toContain('3');

    buttons[3]?.click();
    await vi.waitFor(() => expect(mocks.bookmark).toHaveBeenCalledWith(post._id));
    await vi.waitFor(() => expect(buttons[3]?.getAttribute('aria-pressed')).toBe('true'));

    buttons[1]?.click();
    await vi.waitFor(() => expect(mocks.listComments).toHaveBeenCalledWith(post._id, 1, 50));
    expect(card.querySelector('.comments-list')?.textContent).toContain('Great work');
    const input = card.querySelector<HTMLInputElement>('.comment-input-form input')!;
    input.value = 'Second comment';
    card.querySelector<HTMLFormElement>('.comment-input-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(mocks.addComment).toHaveBeenCalledWith(post._id, 'Second comment', undefined));
    await vi.waitFor(() => expect(card.querySelector('.comments-list')?.textContent).toContain('Second comment'));
    expect(card.querySelector('.post-social-summary__comments')?.textContent).toContain('2');
  });
});
