// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../src/core/auth/auth-store';
import { openReactionsModal } from '../src/modules/posts/reactions-modal';
import type { PaginatedPostReactions, User } from '../src/types/api';

const mocks = vi.hoisted(() => ({
  listReactions: vi.fn(),
  getFriendUser: vi.fn(),
  sendFriendRequest: vi.fn(),
  respondFriendRequest: vi.fn(),
}));

vi.mock('../src/modules/posts/posts-api', () => ({
  postsApi: {
    listReactions: mocks.listReactions,
  },
}));

vi.mock('../src/modules/friends/friends-api', () => ({
  getFriendUser: mocks.getFriendUser,
  sendFriendRequest: mocks.sendFriendRequest,
  respondFriendRequest: mocks.respondFriendRequest,
}));

const currentUser: User = {
  _id: '111111111111111111111111',
  name: 'Me',
  email: 'me@kmitl.ac.th',
  role: 'user',
  university: 'KMITL',
  needsProfileCompletion: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const bobUser = {
  _id: '222222222222222222222222',
  name: 'Bob',
  university: 'KMUTNB' as const,
  faculty: 'Engineering',
  department: 'Electronics',
};

const mockReactionsData: PaginatedPostReactions = {
  items: [
    {
      _id: 'reaction1',
      post: 'post123',
      reaction: 'SAD',
      user: bobUser,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      _id: 'reaction2',
      post: 'post123',
      reaction: 'LIKE',
      user: {
        _id: currentUser._id,
        name: currentUser.name,
        university: currentUser.university,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  page: 1,
  limit: 100,
  total: 2,
  pages: 1,
  reactionCounts: {
    LIKE: 1,
    LOVE: 0,
    HAHA: 0,
    WOW: 0,
    SAD: 1,
    ANGRY: 0,
  },
  totalReactions: 2,
};

beforeEach(() => {
  authStore.setAuthenticated(currentUser, 'token');
  mocks.listReactions.mockResolvedValue({ data: mockReactionsData });
  mocks.getFriendUser.mockResolvedValue({
    _id: bobUser._id,
    name: bobUser.name,
    relationshipStatus: 'none',
    requestId: null,
  });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe('reactions modal', () => {
  it('opens modal, lists users with reaction badges, and supports tab switching', async () => {
    openReactionsModal('post123');

    const modal = document.querySelector('.reactions-modal');
    expect(modal).not.toBeNull();
    expect(modal?.querySelector('.reactions-modal__title')?.textContent).toBe('คนที่แสดงความรู้สึก');

    await vi.waitFor(() => {
      expect(mocks.listReactions).toHaveBeenCalledWith('post123', undefined, 1, 100);
      expect(modal?.querySelectorAll('.reactions-user-row')).toHaveLength(2);
    });

    // Check user row contents
    const rows = modal!.querySelectorAll('.reactions-user-row');
    expect(rows[0]?.textContent).toContain('Bob');
    expect(rows[0]?.querySelector('.reactions-user-badge--sad')).not.toBeNull();
    expect(rows[1]?.textContent).toContain('Me');
    expect(rows[1]?.querySelector('.reactions-user-badge--like')).not.toBeNull();
    expect(rows[1]?.querySelector('.reactions-user-you-tag')?.textContent).toBe('คุณ');

    // Check tabs
    const tabs = modal!.querySelectorAll<HTMLButtonElement>('.reactions-modal__tab');
    expect(tabs.length).toBeGreaterThanOrEqual(2); // "ทั้งหมด" + at least LIKE and SAD
    const sadTab = modal!.querySelector<HTMLButtonElement>('.reactions-modal__tab--sad');
    expect(sadTab).not.toBeNull();

    // Click SAD tab
    mocks.listReactions.mockResolvedValueOnce({
      data: {
        ...mockReactionsData,
        items: [mockReactionsData.items[0]!],
        total: 1,
      },
    });
    sadTab!.click();
    await vi.waitFor(() => {
      expect(mocks.listReactions).toHaveBeenCalledWith('post123', 'SAD', 1, 100);
      expect(modal?.querySelectorAll('.reactions-user-row')).toHaveLength(1);
    });

    // Close button works
    const closeBtn = modal!.querySelector<HTMLButtonElement>('.reactions-modal__close-btn')!;
    closeBtn.click();
    expect(document.querySelector('.reactions-modal')).toBeNull();
  });
});
