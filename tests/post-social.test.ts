// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../src/core/auth/auth-store';
import { mountPostSocial } from '../src/modules/posts/post-social';
import type { Post, PostComment, User } from '../src/types/api';

const mocks = vi.hoisted(() => ({
  like: vi.fn(), unlike: vi.fn(), react: vi.fn(), unreact: vi.fn(),
  bookmark: vi.fn(), unbookmark: vi.fn(),
  listComments: vi.fn(), addComment: vi.fn(), removeComment: vi.fn(),
  report: vi.fn(),
}));

vi.mock('../src/modules/posts/posts-api', () => ({ postsApi: mocks }));
vi.mock('../src/modules/reports/reports-api', () => ({
  reportsApi: { create: mocks.report },
}));

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
  mocks.react.mockResolvedValue({
    data: {
      post: {
        ...post,
        likeCount: 3,
        likedByMe: true,
        myReaction: 'LIKE',
        reactionCounts: { LIKE: 3, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 },
      },
    },
  });
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

    const likeButton = card.querySelector<HTMLButtonElement>('.reaction-picker-wrap > .reaction-btn')!;
    likeButton.click();
    await vi.waitFor(() => expect(mocks.react).toHaveBeenCalledWith(post._id, 'LIKE'));
    await vi.waitFor(() => expect(likeButton.getAttribute('aria-pressed')).toBe('true'));
    expect(card.querySelector('.post-social-summary__likes')?.textContent).toContain('3');

    const footerButtons = [...card.querySelectorAll<HTMLButtonElement>('.post-reactions-footer > .reaction-btn')];
    const moreButton = footerButtons.find((button) => button.getAttribute('aria-label') === 'ตัวเลือกเพิ่มเติม')!;
    moreButton.click();
    const saveButton = [...card.querySelectorAll<HTMLButtonElement>('.post-social-menu__item')]
      .find((button) => button.textContent?.includes('บันทึกโพสต์'))!;
    saveButton.click();
    await vi.waitFor(() => expect(mocks.bookmark).toHaveBeenCalledWith(post._id));
    await vi.waitFor(() => expect(saveButton.getAttribute('aria-pressed')).toBe('true'));

    const commentButton = footerButtons.find((button) => button.textContent?.includes('ความคิดเห็น'))!;
    commentButton.click();
    await vi.waitFor(() => expect(mocks.listComments).toHaveBeenCalledWith(post._id, 1, 50));
    expect(card.querySelector('.comments-list')?.textContent).toContain('Great work');
    const input = card.querySelector<HTMLInputElement>('.comment-input-form input')!;
    input.value = 'Second comment';
    card.querySelector<HTMLFormElement>('.comment-input-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(mocks.addComment).toHaveBeenCalledWith(post._id, 'Second comment', undefined));
    await vi.waitFor(() => expect(card.querySelector('.comments-list')?.textContent).toContain('Second comment'));
    expect(card.querySelector('.post-social-summary__comments')?.textContent).toContain('2');
  });

  it('renders consistent styled action and comment controls', async () => {
    const card = document.createElement('article');
    document.body.append(card);
    mountPostSocial(card, post, user._id, user.name);

    const footer = card.querySelector('.post-reactions-footer')!;
    expect(footer.querySelectorAll('.reaction-btn')).toHaveLength(4);
    const reportButton = [...card.querySelectorAll<HTMLButtonElement>('.post-social-menu__item')]
      .find((button) => button.textContent?.includes('รายงานโพสต์'));
    expect(reportButton?.classList.contains('post-social-menu__item--danger')).toBe(true);
    expect(footer.textContent).not.toContain('รายงานโพสต์');

    const commentButton = [...footer.querySelectorAll<HTMLButtonElement>('.reaction-btn')]
      .find((button) => button.textContent?.includes('ความคิดเห็น'))!;
    commentButton.click();
    await vi.waitFor(() => expect(mocks.listComments).toHaveBeenCalled());

    const send = card.querySelector<HTMLButtonElement>('.btn-send-comment')!;
    expect(send.classList.contains('button')).toBe(true);
    expect(send.classList.contains('button--primary')).toBe(true);

    const reply = card.querySelector<HTMLButtonElement>('.btn-reply-comment')!;
    expect(reply.classList.contains('button--ghost')).toBe(true);
  });
});
