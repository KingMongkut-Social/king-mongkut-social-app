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
  presence: null as ((update: { userId: string; isOnline: boolean }) => void) | null,
}));
const mocks = vi.hoisted(() => ({
  chatList: vi.fn<() => Promise<Chat[]>>(),
  chatMessages: vi.fn<(chatId: string, before?: string) => Promise<ChatMessage[]>>(),
  sendMessage: vi.fn<(chatId: string, content: string, images?: string[]) => Promise<ChatMessage>>(),
  uploadImage: vi.fn<(file: File) => Promise<{ url: string; mimeType: string; size: number }>>(),
  imageBlob: vi.fn<(path: string) => Promise<Blob>>(),
  listFriends: vi.fn<() => Promise<AcceptedFriend[]>>(),
}));

vi.mock('../src/core/realtime/socket', () => ({
  realtime: {
    onMessage: (listener: (message: ChatMessage) => void) => {
      realtimeState.message = listener;
      return () => { realtimeState.message = null; };
    },
    onConversation: () => () => undefined,
    onPresenceUpdated: (listener: (update: { userId: string; isOnline: boolean }) => void) => {
      realtimeState.presence = listener;
      return () => { realtimeState.presence = null; };
    },
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
  chatImageUrl: (path: string) => path,
  chatsApi: {
    list: mocks.chatList,
    direct: vi.fn(),
    createGroup: vi.fn(),
    messages: mocks.chatMessages,
    send: vi.fn(),
    uploadImage: mocks.uploadImage,
    imageBlob: mocks.imageBlob,
  },
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
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  authStore.setAuthenticated(self, 'access-token');
  mocks.chatList.mockResolvedValue([chat]);
  mocks.chatMessages.mockResolvedValue([]);
  mocks.imageBlob.mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
  mocks.listFriends.mockResolvedValue([]);
  mocks.uploadImage.mockResolvedValue({
    url: '/api/v1/chats/uploads/11111111-1111-4111-8111-111111111111.png',
    mimeType: 'image/png',
    size: 16,
  });
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
  realtimeState.presence = null;
  authStore.setAnonymous();
  document.body.replaceChildren();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'visualViewport');
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
    expect(mocks.sendMessage).toHaveBeenCalledWith('chat-1', 'Hello Bob', []);

    realtimeState.message?.(message);
    acknowledge(message);
    await vi.waitFor(() => expect(input.value).toBe(''));
    expect(page.element.querySelectorAll('.chat-message')).toHaveLength(1);
    expect(page.element.querySelector('.chat-message__content')?.textContent).toBe('Hello Bob');
  });

  it('previews, uploads, sends, and renders chat images', async () => {
    const NativeURL = URL;
    class TestURL extends NativeURL {
      static override createObjectURL = vi.fn(() => 'blob:preview');
      static override revokeObjectURL = vi.fn();
    }
    vi.stubGlobal('URL', TestURL);
    page = chatPage(context());
    document.body.append(page.element);
    await vi.waitFor(() => expect(mocks.chatMessages).toHaveBeenCalledWith('chat-1'));

    const file = new File([
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], 'photo.png', { type: 'image/png' });
    const fileInput = page.element.querySelector<HTMLInputElement>('.chat-composer__file-input')!;
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(page!.element.querySelectorAll('.chat-composer__image-item')).toHaveLength(1));

    const imageUrl = '/api/v1/chats/uploads/11111111-1111-4111-8111-111111111111.png';
    const sent: ChatMessage = {
      id: 'image-message',
      chatId: 'chat-1',
      senderId: 'alice',
      content: '',
      images: [imageUrl],
      createdAt: new Date().toISOString(),
    };
    mocks.sendMessage.mockResolvedValue(sent);
    page.element.querySelector<HTMLFormElement>('.chat-composer')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(mocks.uploadImage).toHaveBeenCalledWith(file));
    await vi.waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledWith('chat-1', '', [imageUrl]));
    await vi.waitFor(() => expect(page!.element.querySelectorAll('.chat-message__image')).toHaveLength(1));
    await vi.waitFor(() => expect(mocks.imageBlob).toHaveBeenCalledWith(imageUrl));
    await vi.waitFor(() => expect(page!.element.querySelector<HTMLImageElement>('.chat-message__image')?.src).toBe('blob:preview'));
    expect(page.element.querySelectorAll('.chat-composer__image-item')).toHaveLength(0);
  });

  it('keeps text and image drafts in their original conversation', async () => {
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = vi.fn(() => 'blob:draft');
      static override revokeObjectURL = vi.fn();
    });
    mocks.chatList.mockResolvedValue([chat, { ...chat, id: 'chat-2', name: 'Other', type: 'group' }]);
    page = chatPage(context());
    document.body.append(page.element);
    await vi.waitFor(() => expect(mocks.chatMessages).toHaveBeenCalledWith('chat-1'));
    const input = page.element.querySelector<HTMLTextAreaElement>('.chat-composer__input')!;
    input.value = 'Only for Bob';
    const picker = page.element.querySelector<HTMLInputElement>('.chat-composer__file-input')!;
    Object.defineProperty(picker, 'files', { configurable: true, value: [new File(['png'], 'photo.png', { type: 'image/png' })] });
    picker.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(page!.element.querySelectorAll('.chat-composer__image-item')).toHaveLength(1));
    const rows = page.element.querySelectorAll<HTMLButtonElement>('.chat-list__item');
    rows[1]!.click();
    await vi.waitFor(() => expect(mocks.chatMessages).toHaveBeenCalledWith('chat-2'));
    expect(input.value).toBe('');
    expect(page.element.querySelectorAll('.chat-composer__image-item')).toHaveLength(0);
    page.element.querySelector<HTMLButtonElement>('.chat-list__item')!.click();
    expect(input.value).toBe('Only for Bob');
    expect(page.element.querySelectorAll('.chat-composer__image-item')).toHaveLength(1);
  });

  it('does not clear another room draft when a timed-out send arrives later', async () => {
    mocks.chatList.mockResolvedValue([chat, { ...chat, id: 'chat-2', type: 'group', name: 'Other' }]);
    page = chatPage(context());
    document.body.append(page.element);
    await vi.waitFor(() => expect(mocks.chatMessages).toHaveBeenCalledWith('chat-1'));
    const input = page.element.querySelector<HTMLTextAreaElement>('.chat-composer__input')!;
    input.value = 'Delayed';
    mocks.sendMessage.mockRejectedValue(new Error('timeout'));
    page.element.querySelector<HTMLFormElement>('.chat-composer')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(page!.element.querySelector<HTMLButtonElement>('.chat-composer__send')!.disabled).toBe(false));
    page.element.querySelectorAll<HTMLButtonElement>('.chat-list__item')[1]!.click();
    input.value = 'Keep this draft';
    realtimeState.message?.({ id: 'delayed', chatId: 'chat-1', senderId: 'alice', content: 'Delayed', images: [], createdAt: new Date().toISOString() });
    expect(input.value).toBe('Keep this draft');
  });

  it('uses a full-screen mobile thread and restores the conversation list on back', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    page = chatPage(context());
    document.body.append(page.element);

    await vi.waitFor(() => expect(page!.element.querySelectorAll('.chat-list__item')).toHaveLength(1));
    expect(document.body.classList.contains('is-chat-thread-open')).toBe(false);
    expect(page.element.querySelector('.chat-workspace')?.classList.contains('chat-workspace--thread-open')).toBe(false);

    page.element.querySelector<HTMLButtonElement>('.chat-list__item')!.click();
    await vi.waitFor(() => expect(mocks.chatMessages).toHaveBeenCalledWith('chat-1'));
    expect(document.body.classList.contains('is-chat-thread-open')).toBe(true);
    expect(page.element.querySelector('.chat-workspace')?.classList.contains('chat-workspace--thread-open')).toBe(true);

    page.element.querySelector<HTMLButtonElement>('.chat-back-button')!.click();
    expect(document.body.classList.contains('is-chat-thread-open')).toBe(false);
    expect(page.element.querySelector('.chat-workspace')?.classList.contains('chat-workspace--thread-open')).toBe(false);
    expect(window.location.pathname).toBe('/chat');
    expect(window.location.search).toBe('');
  });

  it('resizes the open mobile thread to stay above the software keyboard', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

    let visibleHeight = 760;
    const viewport = new EventTarget();
    Object.defineProperties(viewport, {
      height: { configurable: true, get: () => visibleHeight },
      offsetTop: { configurable: true, get: () => 0 },
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: viewport,
    });

    page = chatPage(context());
    document.body.append(page.element);
    await vi.waitFor(() => expect(page!.element.querySelectorAll('.chat-list__item')).toHaveLength(1));
    page.element.querySelector<HTMLButtonElement>('.chat-list__item')!.click();
    await vi.waitFor(() => expect(mocks.chatMessages).toHaveBeenCalledWith('chat-1'));

    expect(page.element.style.getPropertyValue('--chat-visible-height')).toBe('760px');
    expect(document.body.style.getPropertyValue('--chat-visible-height')).toBe('760px');

    const input = page.element.querySelector<HTMLTextAreaElement>('.chat-composer__input')!;
    input.focus();
    visibleHeight = 430;
    viewport.dispatchEvent(new Event('resize'));

    expect(page.element.style.getPropertyValue('--chat-visible-height')).toBe('430px');
    expect(document.body.style.getPropertyValue('--chat-visible-height')).toBe('430px');
    expect(page.element.classList.contains('chat-page--keyboard-open')).toBe(true);

    input.blur();
    visibleHeight = 760;
    viewport.dispatchEvent(new Event('resize'));
    expect(page.element.classList.contains('chat-page--keyboard-open')).toBe(false);
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
    expect(page.element.querySelectorAll('.chat-list__item .app-avatar__status-dot--online')).toHaveLength(1);
    realtimeState.presence?.({ userId: 'bob', isOnline: true });
    expect(page.element.querySelectorAll('.chat-list__item .app-avatar__status-dot--online')).toHaveLength(2);
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
