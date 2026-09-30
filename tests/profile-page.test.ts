// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../src/core/auth/auth-store';
import type { RouteContext } from '../src/core/router/router';
import { profilePage } from '../src/modules/profile/profile-page';
import type { UserProfile } from '../src/modules/profile/profile-api';
import type { User } from '../src/types/api';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  posts: vi.fn(),
  friends: vi.fn(),
  chatList: vi.fn(),
}));

vi.mock('../src/modules/profile/profile-api', () => ({
  profileApi: { get: mocks.get, posts: mocks.posts, friends: mocks.friends },
}));
vi.mock('../src/modules/chats/chats-api', () => ({ chatsApi: { list: mocks.chatList } }));
vi.mock('../src/core/realtime/socket', () => ({
  realtime: { onFriendUpdated: () => () => undefined },
}));

const userId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const viewerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const profile: UserProfile = {
  id: userId,
  name: 'Bob',
  university: 'KMUTT',
  faculty: 'Engineering',
  department: 'Computer Science',
  friendCount: 3,
  mutualFriendCount: 1,
  relationshipStatus: 'none',
  requestId: null,
};

function context(search = '', path = `/profile/${userId}`): RouteContext {
  const url = new URL(`${path}${search}`, 'http://localhost:3000');
  return { url, query: url.searchParams, params: { id: path.split('/').pop() || userId } };
}

beforeEach(() => {
  authStore.setAnonymous();
  mocks.get.mockResolvedValue(profile);
  mocks.posts.mockResolvedValue({ items: [], page: 1, limit: 10, total: 0, pages: 1 });
  mocks.friends.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, pages: 1 });
  mocks.chatList.mockResolvedValue([]);
});

afterEach(() => {
  authStore.setAnonymous();
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe('profile page tabs', () => {
  it('loads page two of this user’s friends and keeps the tab in pagination links', async () => {
    mocks.friends.mockResolvedValue({
      items: [{ id: viewerId, name: 'Alice', university: 'KMITL' }],
      page: 2, limit: 20, total: 45, pages: 3,
    });
    const view = await profilePage(context('?tab=friends&page=2'));
    expect(mocks.get).toHaveBeenCalledWith(userId);
    expect(mocks.friends).toHaveBeenCalledWith(userId, 2, 20);
    expect(view.element.querySelector('.profile-person-card')?.textContent).toContain('Alice');
    expect(view.element.querySelector('.profile-tab--active')?.textContent).toBe('เพื่อน');
    const next = [...view.element.querySelectorAll<HTMLAnchorElement>('.pagination__link')]
      .find((link) => link.textContent === '3');
    const nextUrl = new URL(next!.href);
    expect(nextUrl.pathname).toBe(`/profile/${userId}`);
    expect(nextUrl.searchParams.get('tab')).toBe('friends');
    expect(nextUrl.searchParams.get('page')).toBe('3');
    view.dispose?.();
  });

  it('requests image-only posts and links each real image to its post', async () => {
    mocks.posts.mockResolvedValue({
      items: [{
        _id: 'post-1', title: 'Project', content: '', status: 'published',
        images: ['https://example.com/project.jpg'],
        coverImage: 'https://example.com/project.jpg',
        attachments: [{ url: 'https://example.com/diagram.png', name: 'diagram.png', mimeType: 'image/png', size: 100 }],
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      }],
      page: 1, limit: 30, total: 1, pages: 1,
    });
    const view = await profilePage(context('?tab=photos'));
    expect(mocks.posts).toHaveBeenCalledWith(userId, 1, 30, true);
    expect(view.element.querySelector<HTMLAnchorElement>('.profile-photo')?.getAttribute('href')).toBe('/posts/post-1');
    expect(view.element.querySelector<HTMLImageElement>('.profile-photo img')?.src).toBe('https://example.com/project.jpg');
    expect(view.element.querySelectorAll('.profile-photo')).toHaveLength(2);
    expect(view.element.querySelectorAll<HTMLImageElement>('.profile-photo img')[1]?.src).toBe('https://example.com/diagram.png');
    expect(view.element.querySelector('.profile-load-more')?.hasAttribute('hidden')).toBe(true);
    view.dispose?.();
  });

  it('shows real profile fields and leaves unavailable handle and year absent', async () => {
    const view = await profilePage(context('?tab=about'));
    expect(view.element.querySelector('.profile-name-heading')?.textContent).toBe('Bob');
    expect(view.element.querySelector('.profile-academic-line')?.textContent).toContain('Computer Science');
    expect(view.element.querySelector('.profile-detail-list')?.textContent).toContain('Engineering');
    expect(view.element.textContent).not.toContain('@Bob');
    expect(view.element.textContent).not.toContain('ปี 2');
    view.dispose?.();
  });

  it('shows the signed-in user’s actual group chats', async () => {
    const viewer: User = {
      _id: viewerId, name: 'Alice', email: 'alice@example.com', role: 'user', university: 'KMITL',
      needsProfileCompletion: false, createdAt: '', updatedAt: '',
    };
    authStore.setAuthenticated(viewer, 'token');
    mocks.get.mockResolvedValue({ ...profile, id: viewerId, name: 'Alice', relationshipStatus: 'self' });
    mocks.chatList.mockResolvedValue([{ id: 'group-1', type: 'group', name: 'Study team', members: [viewer], lastMessage: null, createdAt: '', updatedAt: '' }]);
    const view = await profilePage(context('?tab=groups', `/profile/${viewerId}`));
    expect(mocks.get).toHaveBeenCalledWith(viewerId);
    expect(mocks.chatList).toHaveBeenCalledOnce();
    expect(view.element.querySelector<HTMLAnchorElement>('.profile-groups-grid a')?.getAttribute('href')).toBe('/chat?chatId=group-1');
    expect(view.element.querySelector('.profile-groups-grid')?.textContent).toContain('Study team');
    view.dispose?.();
  });
});
