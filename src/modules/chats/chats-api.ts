import { env } from '../../config/env';
import { apiClient } from '../../core/api/api-client';
import type { ApiSuccess } from '../../types/api';
import type { FriendPerson } from '../friends/friends-api';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  images?: string[];
  createdAt: string;
}

export interface ChatImageAsset {
  url: string;
  mimeType: string;
  size: number;
}

export function chatImageUrl(path: string): string {
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

  async uploadImage(file: File): Promise<ChatImageAsset> {
    const form = new FormData();
    form.append('file', file);
    const result = await apiClient.request<ApiSuccess<{ image: ChatImageAsset }>>('/chats/uploads', {
      method: 'POST',
      body: form,
    });
    return result.data.image;
  },

  async send(chatId: string, content: string, images: string[] = []): Promise<ChatMessage> {
    const result = await apiClient.request<ApiSuccess<ChatMessage>>(`/chats/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      body: { content, images },
    });
    return result.data;
  },
};
