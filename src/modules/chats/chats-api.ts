import { apiClient } from '../../core/api/api-client';
import { env } from '../../config/env';
import type { ApiSuccess } from '../../types/api';
import type { FriendPerson } from '../friends/friends-api';

export interface ChatImage {
  url: string;
  name: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/avif';
  size: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  image?: ChatImage | null;
  createdAt: string;
}

export function chatAssetUrl(path: string): string {
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return new URL(path, env.apiBaseUrl).href;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  members: FriendPerson[];
  lastMessage: ChatMessage | null;
  createdAt: string;
  updatedAt: string;
}

export const chatsApi = {
  async list(): Promise<Chat[]> {
    const result = await apiClient.request<ApiSuccess<Chat[]>>('/chats');
    return result.data;
  },

  async direct(userId: string): Promise<Chat> {
    const result = await apiClient.request<ApiSuccess<Chat>>('/chats/direct', {
      method: 'POST',
      body: { userId },
    });
    return result.data;
  },

  async createGroup(name: string, memberIds: string[]): Promise<Chat> {
    const result = await apiClient.request<ApiSuccess<Chat>>('/chats/groups', {
      method: 'POST',
      body: { name, memberIds },
    });
    return result.data;
  },

  async messages(chatId: string, before?: string): Promise<ChatMessage[]> {
    const query = new URLSearchParams({ limit: '30' });
    if (before) query.set('before', before);
    const result = await apiClient.request<ApiSuccess<ChatMessage[]>>(`/chats/${encodeURIComponent(chatId)}/messages?${query}`);
    return result.data;
  },

  async uploadImage(chatId: string, file: File): Promise<ChatImage> {
    const form = new FormData();
    form.append('file', file);
    const result = await apiClient.request<ApiSuccess<{ asset: ChatImage }>>(
      `/chats/${encodeURIComponent(chatId)}/uploads`,
      { method: 'POST', body: form },
    );
    return result.data.asset;
  },

  async send(chatId: string, content: string, image?: ChatImage | null): Promise<ChatMessage> {
    const result = await apiClient.request<ApiSuccess<ChatMessage>>(`/chats/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      body: { content, ...(image ? { image } : {}) },
    });
    return result.data;
  },
};
