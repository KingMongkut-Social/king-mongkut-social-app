import { io, type Socket } from 'socket.io-client';
import { env } from '../../config/env';
import type { Chat, ChatMessage } from '../../modules/chats/chats-api';
import { apiClient } from '../api/api-client';
import { authStore } from '../auth/auth-store';

type Listener<T> = (value: T) => void;

const messageListeners = new Set<Listener<ChatMessage>>();
const conversationListeners = new Set<Listener<Chat>>();
const friendListeners = new Set<() => void>();

export interface RealtimeNotification {
  id: string;
  recipientId: string;
  actor: { id: string; name: string; avatarUrl: string | null; university: string } | null;
  type: 'friend_request' | 'friend_accept' | 'post_reaction' | 'post_comment' | 'comment_reply' | 'group_invite' | 'group_join';
  entityId: string | null;
  content: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}
const notificationListeners = new Set<Listener<RealtimeNotification>>();
export interface PresenceUpdate { userId: string; isOnline: boolean }
const presenceListeners = new Set<Listener<PresenceUpdate>>();
const connectionListeners = new Set<Listener<boolean>>();

let socket: Socket | null = null;
let activeToken: string | null = null;
let connected = false;

function setConnected(value: boolean): void {
  if (connected === value) return;
  connected = value;
  for (const listener of connectionListeners) listener(value);
}

function syncSocket(): void {
  const state = authStore.snapshot;
  const token = state.status === 'authenticated' ? state.accessToken : null;
  if (token === activeToken && ((token === null && !socket) || (token !== null && socket))) return;

  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  activeToken = token;
  setConnected(false);
  if (!token) return;

  const next = io(new URL(env.apiBaseUrl).origin, {
    auth: { token },
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
    reconnection: true,
  });
  socket = next;
  let refreshAttempted = false;

  next.on('connect', () => {
    refreshAttempted = false;
    setConnected(true);
  });
  next.on('disconnect', (reason) => {
    setConnected(false);
    if (reason === 'io server disconnect' && !refreshAttempted) {
      refreshAttempted = true;
      activeToken = null;
      void apiClient.restoreSession();
    }
  });
  next.on('connect_error', (error: Error) => {
    setConnected(false);
    if (!refreshAttempted && /auth|unauthor|token/i.test(error.message)) {
      refreshAttempted = true;
      void apiClient.restoreSession();
    }
  });
  next.on('message:new', (message: ChatMessage) => {
    for (const listener of messageListeners) listener(message);
  });
  next.on('conversation:updated', (chat: Chat) => {
    for (const listener of conversationListeners) listener(chat);
  });
  next.on('friend:updated', () => {
    for (const listener of friendListeners) listener();
  });
  next.on('presence:updated', (update: PresenceUpdate) => {
    for (const listener of presenceListeners) listener(update);
  });
  next.on('notification:new', (notification: RealtimeNotification) => {
    for (const listener of notificationListeners) listener(notification);
  });
}

function subscribe<T>(set: Set<Listener<T>>, listener: Listener<T>): () => void {
  set.add(listener);
  syncSocket();
  return () => set.delete(listener);
}

export const realtime = {
  isConnected: (): boolean => connected && socket !== null,
  async sendMessage(chatId: string, content: string): Promise<ChatMessage> {
    if (!socket || !connected) throw new Error('ไม่สามารถเชื่อมต่อแชทได้');
    const acknowledgement = await socket.timeout(10000).emitWithAck('chat:send', { chatId, content }) as
      | { success: true; data: ChatMessage }
      | { success: false; error: { code: string; message: string } };
    if (!acknowledgement.success) {
      if (acknowledgement.error.code === 'INVALID_TOKEN' || acknowledgement.error.code === 'UNAUTHORIZED') {
        await apiClient.restoreSession();
        throw new Error('เซสชันแชทหมดอายุ กรุณาลองส่งอีกครั้ง');
      }
      throw new Error(acknowledgement.error.message);
    }
    return acknowledgement.data;
  },
  onMessage: (listener: Listener<ChatMessage>): (() => void) => subscribe(messageListeners, listener),
  onConversation: (listener: Listener<Chat>): (() => void) => subscribe(conversationListeners, listener),
  onConnection: (listener: Listener<boolean>): (() => void) => {
    const unsubscribe = subscribe(connectionListeners, listener);
    listener(connected);
    return unsubscribe;
  },
  onFriendUpdated: (listener: () => void): (() => void) => {
    friendListeners.add(listener);
    syncSocket();
    return () => friendListeners.delete(listener);
  },
  onPresenceUpdated: (listener: Listener<PresenceUpdate>): (() => void) => subscribe(presenceListeners, listener),
  onNotification: (listener: Listener<RealtimeNotification>): (() => void) => subscribe(notificationListeners, listener),
};

authStore.subscribe(syncSocket);
syncSocket();
