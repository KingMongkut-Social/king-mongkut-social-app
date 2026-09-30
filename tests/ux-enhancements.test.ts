// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../src/core/auth/auth-store';
import type { RouteContext } from '../src/core/router/router';
import { confirmAction } from '../src/core/ui/confirm-dialog';
import { chatPage } from '../src/modules/chats/chat-page';
import { notificationsPage } from '../src/modules/notifications/notifications-page';
import { searchPage } from '../src/modules/search/search-page';
import { connectionsPage } from '../src/modules/friends/connections-page';
import { mountLayout } from '../src/app/layout';
import type { User } from '../src/types/api';

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  chatList: vi.fn(),
  chatMessages: vi.fn(),
  listFriends: vi.fn(),
}));

vi.mock('../src/modules/search/search-api', () => ({
  searchApi: { search: mocks.search },
}));

vi.mock('../src/core/realtime/socket', () => ({
  realtime: {
    onMessage: () => () => undefined,
    onConversation: () => () => undefined,
    onPresenceUpdated: () => () => undefined,
    onNotification: () => () => undefined,
    onFriendUpdated: () => () => undefined,
    onConnection: (listener: (connected: boolean) => void) => {
      listener(true);
      return () => undefined;
    },
    isConnected: () => true,
    sendMessage: vi.fn(),
    onTyping: () => () => undefined,
    sendTyping: vi.fn(),
  },
}));

vi.mock('../src/modules/chats/chats-api', () => ({
  chatsApi: {
    list: mocks.chatList,
    direct: vi.fn(),
    createGroup: vi.fn(),
    messages: mocks.chatMessages,
    send: vi.fn(),
  },
}));

vi.mock('../src/modules/friends/friends-api', () => ({
  listFriends: mocks.listFriends,
  listFriendRequests: vi.fn().mockResolvedValue({ incoming: [], outgoing: [] }),
  listSuggestedFriends: vi.fn().mockResolvedValue([]),
  searchFriends: vi.fn().mockResolvedValue([]),
  sendFriendRequest: vi.fn(),
  removeFriend: vi.fn(),
  respondFriendRequest: vi.fn(),
  cancelFriendRequest: vi.fn(),
}));

const testUser: User = {
  _id: 'user-alice',
  name: 'Alice',
  email: 'alice@kmitl.ac.th',
  university: 'KMITL',
  role: 'user',
  faculty: 'Engineering',
  department: 'Computer',
  needsProfileCompletion: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function context(path: string): RouteContext {
  const url = new URL(path, 'http://localhost:3000');
  return { url, query: url.searchParams, params: {} };
}

beforeEach(() => {
  authStore.setAuthenticated(testUser, 'access-token');
  mocks.search.mockResolvedValue({
    users: [
      { id: 'user-bob', name: 'Bob Smith', username: 'bob', university: 'KMUTT', avatarUrl: null },
    ],
    posts: [
      {
        id: 'post-1',
        title: 'โครงการวิศวกรรมคอมพิวเตอร์',
        content: 'รายละเอียดโครงการ',
        coverImage: null,
        images: [],
        university: 'KMITL',
        tags: ['Engineering'],
        author: { id: 'user-alice', name: 'Alice', university: 'KMITL', avatarUrl: null },
        likeCount: 5,
        liked: false,
        reactionCounts: {},
        commentCount: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    groups: [
      {
        id: 'group-1',
        name: 'กลุ่มศึกษา AI',
        description: 'กลุ่มศึกษา AI สำหรับ 3 พระจอม',
        coverUrl: null,
        privacy: 'public',
        university: 'KMITL',
        memberCount: 15,
        joined: false,
      },
    ],
    universities: [
      { code: 'KMITL', name: 'สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง', memberCount: 120, postCount: 45 },
    ],
  });

  mocks.chatList.mockResolvedValue([
    {
      id: 'chat-1',
      type: 'direct',
      name: null,
      members: [
        { id: 'user-alice', name: 'Alice', university: 'KMITL' },
        { id: 'user-bob', name: 'Bob Smith', university: 'KMUTT' },
      ],
      lastMessage: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]);
  mocks.chatMessages.mockResolvedValue([]);
  mocks.listFriends.mockResolvedValue([]);

  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe('UX Enhancements', () => {
  describe('Search Page', () => {
    it('renders category tabs with counts and allows switching tabs', async () => {
      const page = await searchPage(context('/search?q=AI'));
      document.body.append(page.element);

      expect(mocks.search).toHaveBeenCalledWith('AI');
      const tabs = page.element.querySelectorAll<HTMLButtonElement>('.search-tab-btn');
      expect(tabs.length).toBe(5);

      const tabTexts = Array.from(tabs).map((t) => t.textContent ?? '');
      expect(tabTexts.some((t) => t.includes('ทั้งหมด'))).toBe(true);
      expect(tabTexts.some((t) => t.includes('ผู้ใช้'))).toBe(true);
      expect(tabTexts.some((t) => t.includes('โพสต์'))).toBe(true);
      expect(tabTexts.some((t) => t.includes('กลุ่ม'))).toBe(true);
      expect(tabTexts.some((t) => t.includes('สถาบัน'))).toBe(true);

      const usersTab = Array.from(tabs).find((t) => t.textContent?.includes('ผู้ใช้'))!;
      usersTab.click();

      expect(usersTab.classList.contains('search-tab-btn--active')).toBe(true);
      expect(page.element.querySelector('.search-row')?.textContent).toContain('Bob Smith');
    });

    it('displays prompt state when no query is given', async () => {
      const page = await searchPage(context('/search'));
      document.body.append(page.element);

      expect(page.element.querySelector('.empty-state__title')?.textContent).toContain('พิมพ์คำค้นหาเพื่อสำรวจ');
    });
  });

  describe('Accessible Confirm Dialog', () => {
    it('resolves true when confirm button is clicked', async () => {
      const promise = confirmAction({
        title: 'ยืนยันการลบ',
        message: 'ต้องการลบโพสต์นี้หรือไม่?',
        confirmText: 'ลบโพสต์',
        cancelText: 'ยกเลิก',
        variant: 'danger',
      });

      const dialog = document.body.querySelector<HTMLDialogElement>('.confirm-dialog');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('ต้องการลบโพสต์นี้หรือไม่?');

      const confirmBtn = dialog?.querySelector<HTMLButtonElement>('.confirm-dialog__confirm');
      expect(confirmBtn?.textContent).toBe('ลบโพสต์');
      confirmBtn?.click();

      const result = await promise;
      expect(result).toBe(true);
    });

    it('resolves false when cancel button is clicked', async () => {
      const promise = confirmAction({
        title: 'ยืนยันการดำเนินการ',
        message: 'ต้องการดำเนินการหรือไม่?',
      });

      const dialog = document.body.querySelector<HTMLDialogElement>('.confirm-dialog');
      const cancelBtn = dialog?.querySelector<HTMLButtonElement>('.confirm-dialog__cancel');
      cancelBtn?.click();

      const result = await promise;
      expect(result).toBe(false);
    });
  });

  describe('Chat Master-Detail Navigation', () => {
    it('manages .chat-workspace--thread-open class and returns to list view on back button click', async () => {
      const page = chatPage(context('/chat?chatId=chat-1'));
      document.body.append(page.element);

      await vi.waitFor(() => expect(mocks.chatMessages).toHaveBeenCalledWith('chat-1'));

      const workspace = page.element.querySelector('.chat-workspace');
      expect(workspace?.classList.contains('chat-workspace--thread-open')).toBe(true);

      const backButton = page.element.querySelector<HTMLButtonElement>('.chat-back-button');
      expect(backButton).not.toBeNull();

      backButton?.click();
      expect(workspace?.classList.contains('chat-workspace--thread-open')).toBe(false);

      page.dispose?.();
    });
  });

  describe('Notifications Page', () => {
    it('renders notifications page with all and unread filter tabs', () => {
      const page = notificationsPage();
      document.body.append(page.element);

      expect(page.element.querySelector('.platform-title')?.textContent).toBe('การแจ้งเตือน');
      expect(page.element.querySelector('.button--small')?.textContent).toContain('อ่านทั้งหมดแล้ว');

      const tabs = page.element.querySelectorAll<HTMLButtonElement>('.search-tab-btn');
      expect(tabs).toHaveLength(2);
      expect(tabs[0]?.textContent).toContain('ทั้งหมด');
      expect(tabs[1]?.textContent).toContain('ยังไม่ได้อ่าน');

      tabs[1]?.click();
      expect(tabs[1]?.classList.contains('search-tab-btn--active')).toBe(true);

      page.dispose?.();
    });
  });

  describe('Header Search Autocomplete', () => {
    it('shows autocomplete suggestions when typing query >= 2 characters', async () => {
      const root = document.createElement('div');
      mountLayout(root);
      document.body.append(root);

      const input = root.querySelector<HTMLInputElement>('.search-pill-input');
      expect(input).not.toBeNull();

      input!.value = 'Bo';
      input!.dispatchEvent(new Event('input'));

      const dropdown = root.querySelector<HTMLElement>('.header-search-autocomplete');
      expect(dropdown).not.toBeNull();

      await vi.waitFor(() => {
        expect(mocks.search).toHaveBeenCalledWith('Bo', { limit: 5 });
        expect(dropdown?.style.display).toBe('flex');
        expect(dropdown?.textContent).toContain('Bob Smith');
        expect(dropdown?.textContent).toContain('กลุ่มศึกษา AI');
      });

      // Escape closes autocomplete
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(dropdown?.style.display).toBe('none');
    });

    it('navigates through items with arrow keys and selects on enter', async () => {
      const root = document.createElement('div');
      mountLayout(root);
      document.body.append(root);

      const input = root.querySelector<HTMLInputElement>('.search-pill-input');
      input!.value = 'Bo';
      input!.dispatchEvent(new Event('input'));

      const dropdown = root.querySelector<HTMLElement>('.header-search-autocomplete');
      await vi.waitFor(() => expect(dropdown?.style.display).toBe('flex'));

      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      const items = dropdown!.querySelectorAll<HTMLAnchorElement>('.header-search-autocomplete__item');
      expect(items[0]?.classList.contains('header-search-autocomplete__item--focused')).toBe(true);

      const pushStateSpy = vi.spyOn(window.history, 'pushState');
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/profile/user-bob');
    });
  });

  describe('Connections Page Filter and Counters', () => {
    it('filters friends list instantly by typing in search input', async () => {
      mocks.listFriends.mockResolvedValue([
        { id: 'user-bob', name: 'Bob Smith', username: 'bob', university: 'KMUTT', friendshipId: 'f-1' },
        { id: 'user-charlie', name: 'Charlie Brown', username: 'charlie', university: 'KMITL', friendshipId: 'f-2' },
      ]);

      const page = connectionsPage();
      document.body.append(page.element);

      await vi.waitFor(() => {
        const cards = page.element.querySelectorAll('.student-card');
        expect(cards).toHaveLength(2);
      });

      const searchInput = page.element.querySelector<HTMLInputElement>('.connections-search-input');
      expect(searchInput).not.toBeNull();

      searchInput!.value = 'charlie';
      searchInput!.dispatchEvent(new Event('input'));

      const filteredCards = page.element.querySelectorAll('.student-card');
      expect(filteredCards).toHaveLength(1);
      expect(filteredCards[0]?.textContent).toContain('Charlie Brown');

      page.dispose?.();
    });
  });
});

