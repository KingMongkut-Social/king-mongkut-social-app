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

export interface PaginatedGroups {
  items: CommunityGroup[];
  page: number;
  limit: number;
  total: number;
  pages: number;
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

export interface PaginatedGroupMembers {
  items: GroupMember[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface GroupPost {
  id: string;
  content: string;
  author: GroupUser;
  mentions: GroupUser[];
  createdAt: string;
}

export interface PaginatedGroupPosts {
  items: GroupPost[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface GroupInvitation {
  id: string;
  group: Pick<CommunityGroup, 'id' | 'name' | 'description' | 'coverUrl' | 'privacy' | 'university'>;
  invitedBy: GroupUser;
  createdAt: string;
}

function pageQuery(page: number, limit: number): string {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  return query.toString();
}

export const groupsApi = {
  async list(q = '', page = 1): Promise<PaginatedGroups> {
    const query = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) query.set('q', q);
    const response = await apiClient.request<ApiSuccess<PaginatedGroups>>(`/groups?${query}`);
    return response.data;
  },
  async mine(page = 1, limit = 20): Promise<PaginatedGroups> {
    const response = await apiClient.request<ApiSuccess<PaginatedGroups>>(
      `/groups/mine?${pageQuery(page, limit)}`,
    );
    return response.data;
  },
  async invitations(): Promise<GroupInvitation[]> {
    const response = await apiClient.request<ApiSuccess<{ items: GroupInvitation[] }>>('/groups/invitations');
    return response.data.items;
  },
  async respondInvitation(inviteId: string, action: 'accept' | 'reject'): Promise<void> {
    await apiClient.request(`/groups/invitations/${encodeURIComponent(inviteId)}`, {
      method: 'PATCH',
      body: { action },
    });
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
  async update(id: string, input: { name?: string; description?: string }) {
    const response = await apiClient.request<ApiSuccess<{ group: CommunityGroup }>>(
      `/groups/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: input },
    );
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
  async invite(id: string, userId: string): Promise<void> {
    await apiClient.request(`/groups/${encodeURIComponent(id)}/invites`, {
      method: 'POST',
      body: { userId },
    });
  },
  async members(id: string, page = 1, limit = 20, q = ''): Promise<PaginatedGroupMembers> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q.trim()) query.set('q', q.trim());
    const response = await apiClient.request<ApiSuccess<PaginatedGroupMembers>>(
      `/groups/${encodeURIComponent(id)}/members?${query}`,
    );
    return response.data;
  },
  async posts(id: string, page = 1, limit = 20): Promise<PaginatedGroupPosts> {
    const response = await apiClient.request<ApiSuccess<PaginatedGroupPosts>>(
      `/groups/${encodeURIComponent(id)}/posts?${pageQuery(page, limit)}`,
    );
    return response.data;
  },
  async createPost(id: string, content: string, mentions: string[] = []) {
    const response = await apiClient.request<ApiSuccess<{ post: GroupPost }>>(
      `/groups/${encodeURIComponent(id)}/posts`,
      { method: 'POST', body: { content, mentions } },
    );
    return response.data.post;
  },
};
