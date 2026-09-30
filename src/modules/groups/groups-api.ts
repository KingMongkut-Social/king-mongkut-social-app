import { apiClient } from '../../core/api/api-client';
import type { ApiSuccess } from '../../types/api';

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  privacy: 'public' | 'private';
  university: 'KMITL' | 'KMUTT' | 'KMUTNB' | null;
  memberCount: number;
  membershipRole: 'owner' | 'admin' | 'moderator' | 'member' | null;
  joined: boolean;
  createdAt: string;
}

export interface GroupPost {
  id: string;
  content: string;
  author: { _id: string; name: string; username?: string | null; avatarUrl?: string | null; university?: string };
  createdAt: string;
}

export const groupsApi = {
  async list(q = '') {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    const response = await apiClient.request<ApiSuccess<{
      items: CommunityGroup[]; page: number; limit: number; total: number; pages: number;
    }>>(`/groups${query}`);
    return response.data;
  },
  async get(id: string) {
    const response = await apiClient.request<ApiSuccess<{ group: CommunityGroup }>>(`/groups/${encodeURIComponent(id)}`);
    return response.data.group;
  },
  async create(input: { name: string; description: string; privacy: 'public' | 'private'; university?: string | null }) {
    const response = await apiClient.request<ApiSuccess<{ group: CommunityGroup }>>('/groups', { method: 'POST', body: input });
    return response.data.group;
  },
  async join(id: string) {
    const response = await apiClient.request<ApiSuccess<{ group: CommunityGroup }>>(
      `/groups/${encodeURIComponent(id)}/join`,
      { method: 'PUT' },
    );
    return response.data.group;
  },
  async leave(id: string) {
    await apiClient.request(`/groups/${encodeURIComponent(id)}/join`, { method: 'DELETE' });
  },
  async members(id: string) {
    const response = await apiClient.request<ApiSuccess<{ items: Array<{ id: string; role: string; user: any; joinedAt: string }> }>>(
      `/groups/${encodeURIComponent(id)}/members?limit=50`,
      { auth: false },
    );
    return response.data.items;
  },
  async posts(id: string) {
    const response = await apiClient.request<ApiSuccess<{ items: GroupPost[] }>>(
      `/groups/${encodeURIComponent(id)}/posts?limit=50`,
      { auth: false },
    );
    return response.data.items;
  },
  async createPost(id: string, content: string) {
    const response = await apiClient.request<ApiSuccess<{ post: GroupPost }>>(
      `/groups/${encodeURIComponent(id)}/posts`,
      { method: 'POST', body: { content } },
    );
    return response.data.post;
  },
};
