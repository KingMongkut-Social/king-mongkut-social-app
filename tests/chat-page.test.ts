// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../src/core/auth/auth-store';
import type { RouteContext, PageView } from '../src/core/router/router';
import { chatPage } from '../src/modules/chats/chat-page';
import type { Chat, ChatMessage } from '../src/modules/chats/chats-api';
import type { AcceptedFriend } from '../src/modules/friends/friends-api';
import type { User } from '../src/types/api';

const realtimeState = vi.hoisted(() => ({
  message: null as ((message: ChatMessage) => void) | null,
}));
const mocks = vi.hoisted(() => ({
  chatList: vi.fn<() => Promise<Chat[]>>(),
  chatMessages: vi.fn<(chatId: string, before?: string) => Promise<ChatMessage[]>>(),
  sendMessage: vi.fn<(chatId: string, content: string) => Promise<ChatMessage>>(),
  listFriends: vi.fn<() => Promise<AcceptedFriend[]>>(),
}));

vi.mock('../src/core/realtime/socket', () => ({
  realtime: {
    onMessage: (listener: (message: ChatMessage) => void) => {
      realtimeState.message = listener;
      return () => { realtimeState.message = null; };
    },
    onConversation: () => () => undefined,
    onPresenceUpdated: () => () => undefined,
    onConnection: (listener: (connected: boolean) => void) => {
      listener(true);
      return () => undefined;
    },
    isConnected: () => true,
    sendMessage: mocks.sendMessage,
    onTyping: () => () => undefined,
    sendTyping: vi.fn(),
  },
}));
vi.mock('../src/modules/chats/chats-api', () => ({
  chatsApi: { list: mocks.chatList, direct: vi.fn(), createGroup: vi.fn(), messages: mocks.chatMessages, send: vi.fn() },
}));
vi.mock('../src/modules/friends/friends-api', () => ({ listFriends: mocks.listFriends }));

const self: User = {
  _id: 'alice', name: 'Alice', email: 'alice@kmitl.ac.th', university: 'KMITL', role: 'user',
  faculty: 'Engineering', department: 'Computer', needsProfileCompletion: false,
  createdAt: '', updatedAt: '',
};
const chat: Chat = {
  id: 'chat-1', type: 'direct', name: null,
  members: [{ id: 'alice', name: 'Alice', university: 'KMITL' }, { id: 'bob', name: 'Bob', university: 'KMUTT' }],
  lastMessage: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
let page: PageView | undefined;

function context(): RouteContext {
  const url = new URL('/chat', 'http://localhost:3000');
  return { url, params: {}, query: url.searchParams };
}

beforeEach(() => {
  authStore.setAuthenticated(self, 'access-token');
  mocks.chatList.mockResolvedValue([chat]);
  mocks.chatMessages.mockResolvedValue([]);
  mocks.listFriends.mockResolvedValue([]);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => callback(0));
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) { this.setAttribute('open', ''); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) { this.removeAttribute('open'); },
  });
});

afterEach(() => {
  page?.dispose?.();
  page = undefined;
  realtimeState.message = null;
  authStore.setAnonymous();
  document.body.replaceChildren();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('chat page', () => {
  it('reconciles the real-time message event and send acknowledgment into one message', async () => {
    page = chatPage(context());
    document.body.append(page.element);
    await vi.waitFor(() => expect(mocks.chatMessages).toHaveBeenCalledWith('chat-1'));
    const message: ChatMessage = {
      id: 'message-1', chatId: 'chat-1', senderId: 'alice', content: 'Hello Bob',
      createdAt: new Date().toISOString(),
    };
    let acknowledge!: (message: ChatMessage) => void;
    mocks.sendMessage.mockReturnValue(new Promise((resolve) => { acknowledge = resolve; }));
    const input = page.element.querySelector<HTMLTextAreaElement>('.chat-composer__input')!;
    input.value = 'Hello Bob';
    page.element.querySelector<HTMLFormElement>('.chat-composer')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(mocks.sendMessage).toHaveBeenCalledWith('chat-1', 'Hello Bob');

    realtimeState.message?.(message);
    acknowledge(message);
    await vi.waitFor(() => expect(input.value).toBe(''));
    expect(page.element.querySelectorAll('.chat-message')).toHaveLength(1);
    expect(page.element.querySelector('.chat-message__content')?.textContent).toBe('Hello Bob');
  });

  it('offers only accepted friends in the group member picker', async () => {
    mocks.listFriends.mockResolvedValue([
      { id: 'bob', name: 'Bob', university: 'KMUTT', friendshipId: 'friendship-1' },
    ]);
    page = chatPage(context());
    document.body.append(page.element);
    page.element.querySelector<HTMLButtonElement>('.chat-sidebar__header button')!.click();
    await vi.waitFor(() => expect(mocks.listFriends).toHaveBeenCalled());
    const choices = page.element.querySelectorAll<HTMLInputElement>('.chat-group-members input[name="member"]');
    expect(choices).toHaveLength(1);
    expect(choices[0]?.value).toBe('bob');
    expect(page.element.querySelector('.chat-group-members')?.textContent).not.toContain('Eve');
  });

  it('filters conversations by name and shows real online presence for the selected friend', async () => {
    const another: Chat = {
      ...chat, id: 'chat-2', members: [chat.members[0]!, { id: 'may', name: 'May P.', university: 'KMITL' }],
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    mocks.chatList.mockResolvedValue([chat, another]);
    mocks.listFriends.mockResolvedValue([{ id: 'may', name: 'May P.', university: 'KMITL', friendshipId: 'friend-1', isOnline: true }]);
    page = chatPage(context());
    document.body.append(page.element);
    await vi.waitFor(() => expect(page!.element.querySelector('.chat-panel__subtitle')?.textContent).toBe('ออนไลน์ · KMITL'));
    const search = page.element.querySelector<HTMLInputElement>('.chat-conversation-search')!;
    search.value = 'bob';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(page.element.querySelectorAll('.chat-list__item')).toHaveLength(1);
    expect(page.element.querySelector('.chat-list__item')?.textContent).toContain('Bob');
    search.value = 'nobody';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(page.element.querySelector('.chat-list__empty')?.textContent).toContain('ไม่พบการสนทนา');
  });
});
