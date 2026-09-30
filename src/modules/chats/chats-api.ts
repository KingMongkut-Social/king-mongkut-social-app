import { apiClient } from '../../core/api/api-client';
import type { ApiSuccess } from '../../types/api';
import type { FriendPerson } from '../friends/friends-api';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
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

  async send(chatId: string, content: string): Promise<ChatMessage> {
    const result = await apiClient.request<ApiSuccess<ChatMessage>>(`/chats/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      body: { content },
    });
    return result.data;
  },
};
