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

export interface GroupUser {
  _id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  university?: string;
  faculty?: string;
  department?: string;
}

export interface GroupMember {
  id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  user: GroupUser;
  joinedAt: string;
}

export interface GroupPost {
  _id: string;
  group: string;
  content: string;
  author: GroupUser;
  createdAt: string;
  updatedAt?: string;
}

export const groupsApi = {
  async list(q = '') {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    const response = await apiClient.request<ApiSuccess<{
      items: CommunityGroup[]; page: number; limit: number; total: number; pages: number;
    }>>(`/groups${query}`);
    return response.data;
  },

  async userGroups(userId: string): Promise<CommunityGroup[]> {
    const response = await apiClient.request<ApiSuccess<{ items: CommunityGroup[] }>>(
      `/groups/users/${encodeURIComponent(userId)}`,
    );
    return response.data.items;
  },

  async get(id: string) {
    const response = await apiClient.request<ApiSuccess<{ group: CommunityGroup }>>(`/groups/${encodeURIComponent(id)}`);
    return response.data.group;
  },

  async create(input: {
    name: string;
    description: string;
    privacy: 'public' | 'private';
    university?: 'KMITL' | 'KMUTT' | 'KMUTNB' | null;
  }) {
    const response = await apiClient.request<ApiSuccess<{ group: CommunityGroup }>>('/groups', { method: 'POST', body: input });
    return response.data.group;
  },

  async delete(id: string): Promise<void> {
    await apiClient.request(`/groups/${encodeURIComponent(id)}`, { method: 'DELETE' });
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
    const response = await apiClient.request<ApiSuccess<{ items: GroupMember[] }>>(
      `/groups/${encodeURIComponent(id)}/members?limit=50`,
    );
    return response.data.items;
  },

  async addMember(id: string, userId: string) {
    const response = await apiClient.request<ApiSuccess<{ membership: GroupMember }>>(
      `/groups/${encodeURIComponent(id)}/members`,
      { method: 'POST', body: { userId } },
    );
    return response.data.membership;
  },

  async setMemberRole(id: string, userId: string, role: GroupMember['role']) {
    const response = await apiClient.request<ApiSuccess<{ membership: GroupMember }>>(
      `/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
      { method: 'PATCH', body: { role } },
    );
    return response.data.membership;
  },

  async removeMember(id: string, userId: string): Promise<void> {
    await apiClient.request(
      `/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
  },

  async posts(id: string) {
    const response = await apiClient.request<ApiSuccess<{ items: GroupPost[] }>>(
      `/groups/${encodeURIComponent(id)}/posts?limit=50`,
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

  async deletePost(id: string, postId: string): Promise<void> {
    await apiClient.request(
      `/groups/${encodeURIComponent(id)}/posts/${encodeURIComponent(postId)}`,
      { method: 'DELETE' },
    );
  },
};
