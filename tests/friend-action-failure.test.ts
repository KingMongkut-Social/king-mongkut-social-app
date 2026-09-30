// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../src/core/auth/auth-store';
import type { RouteContext } from '../src/core/router/router';
import { openProfilePreviewModal } from '../src/modules/profile/profile-modal';
import { postCard } from '../src/modules/posts/post-components';
import { postsPage } from '../src/modules/posts/posts-page';
import type { FriendUser, AcceptedFriend } from '../src/modules/friends/friends-api';
import type { ApiSuccess, PaginatedPosts, Post, User } from '../src/types/api';

const mocks = vi.hoisted(() => ({
  getFriendUser: vi.fn<(id: string) => Promise<FriendUser>>(),
  sendFriendRequest: vi.fn<(id: string) => Promise<unknown>>(),
  listFriends: vi.fn<() => Promise<AcceptedFriend[]>>(),
  listPublished: vi.fn<(input?: unknown) => Promise<ApiSuccess<PaginatedPosts>>>(),
}));

vi.mock('../src/modules/friends/friends-api', () => ({
  getFriendUser: mocks.getFriendUser,
  sendFriendRequest: mocks.sendFriendRequest,
  listFriends: mocks.listFriends,
  respondFriendRequest: vi.fn(),
  searchFriends: vi.fn(),
}));
vi.mock('../src/modules/posts/posts-api', () => ({
  postsApi: { listPublished: mocks.listPublished },
}));
vi.mock('../src/core/realtime/socket', () => ({
  realtime: {
    onPresenceUpdated: () => () => undefined,
    onFriendUpdated: () => () => undefined,
    onConnection: () => () => undefined,
  },
}));

const ownId = 'a'.repeat(24);
const targetId = 'b'.repeat(24);
const account: User = {
  _id: ownId, name: 'Alice', email: 'alice@kmitl.ac.th', university: 'KMITL', role: 'user',
  faculty: 'Engineering', department: 'Computer', needsProfileCompletion: false,
  createdAt: '', updatedAt: '',
};
const target: FriendUser = {
  id: targetId, name: 'Bob', university: 'KMUTT', relationshipStatus: 'none', requestId: null,
};
const post: Post = {
  _id: 'post-1', title: 'Project', content: 'Hello', status: 'published',
  user: { _id: targetId, name: 'Bob', university: 'KMUTT' },
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

function context(): RouteContext {
  const url = new URL('/', 'http://localhost:3000');
  return { url, params: {}, query: url.searchParams };
}

beforeEach(() => {
  authStore.setAuthenticated(account, 'access-token');
  mocks.getFriendUser.mockResolvedValue(target);
  mocks.sendFriendRequest.mockRejectedValue(new Error('offline'));
  mocks.listFriends.mockResolvedValue([]);
  mocks.listPublished.mockResolvedValue({
    success: true, data: { items: [], page: 1, limit: 10, total: 0, pages: 1 },
  });
  document.body.replaceChildren(Object.assign(document.createElement('div'), { id: 'toast-root' }));
});

afterEach(() => {
  document.body.querySelector<HTMLButtonElement>('.profile-preview-modal__close-btn')?.click();
  authStore.setAnonymous();
  document.body.replaceChildren();
  localStorage.clear();
  vi.clearAllMocks();
});

describe('friend actions on posts and profiles', () => {
  it('keeps the profile action available and shows an error when sending fails', async () => {
    const onChange = vi.fn();
    openProfilePreviewModal({ authorId: targetId, name: 'Bob', onFriendStatusChange: onChange });
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith('none'));
    const button = document.body.querySelector<HTMLButtonElement>('.profile-friend-btn')!;
    button.click();
    await vi.waitFor(() => expect(mocks.sendFriendRequest).toHaveBeenCalledWith(targetId));
    await vi.waitFor(() => expect(button.disabled).toBe(false));
    expect(button.textContent).toBe('+ เพิ่มเพื่อน');
    expect(button.classList.contains('profile-friend-btn--pending')).toBe(false);
    expect(onChange).not.toHaveBeenCalledWith('pending_sent');
    expect(document.querySelector('.toast--success')).toBeNull();
    expect(document.querySelector('.toast--error')).not.toBeNull();
  });

  it('does not mark a post author as pending when sending fails', async () => {
    const card = postCard(post);
    document.body.append(card);
    await vi.waitFor(() => expect(mocks.getFriendUser).toHaveBeenCalledWith(targetId));
    const button = card.querySelector<HTMLButtonElement>('.post-friend-btn')!;
    button.click();
    await vi.waitFor(() => expect(mocks.sendFriendRequest).toHaveBeenCalledWith(targetId));
    await vi.waitFor(() => expect(button.disabled).toBe(false));
    expect(button.textContent).toBe('+ เพิ่มเพื่อน');
    expect(button.classList.contains('post-friend-btn--pending')).toBe(false);
    expect(document.querySelector('.toast--success')).toBeNull();
    expect(document.querySelector('.toast--error')).not.toBeNull();
  });

  it('shows an empty accepted-friends widget when the feed and friends API are empty', async () => {
    const page = await postsPage(context());
    document.body.append(page.element);
    expect(mocks.listFriends).toHaveBeenCalledOnce();
    expect(page.element.querySelectorAll('.online-users-list .online-user-item')).toHaveLength(0);
    expect(page.element.querySelector('.online-users-list')?.textContent).toContain('ยังไม่มีเพื่อนที่ตอบรับแล้ว');
  });
});
