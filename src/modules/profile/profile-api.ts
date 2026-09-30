import { apiClient } from '../../core/api/api-client';
import { env } from '../../config/env';
import type { ApiSuccess, PaginatedPosts, User } from '../../types/api';

export type ProfileRelationship = 'self' | 'none' | 'friends' | 'pending_sent' | 'pending_received';

export interface UserProfile {
  id: string;
  name: string;
  university: string;
  faculty?: string;
  department?: string;
  username?: string | null;
  bio?: string;
  academicYear?: number | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  friendCount: number;
  mutualFriendCount: number;
  relationshipStatus: ProfileRelationship;
  requestId: string | null;
}

export interface ProfileFriend {
  id: string;
  name: string;
  university: string;
  faculty?: string;
  department?: string;
}

export interface PaginatedProfileFriends {
  items: ProfileFriend[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface EditProfileInput {
  name: string;
  username: string | null;
  bio: string;
  faculty: string;
  department: string;
  academicYear: number | null;
}

export interface ProfileImageAsset {
  url: string;
  mimeType: string;
  size: number;
}

export function profileImageUrl(path: string): string {
  return /^(https?:|data:|blob:)/i.test(path) ? path : new URL(path, env.apiBaseUrl).href;
}

function pageQuery(page: number, limit: number): string {
  return new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
}

export const profileApi = {
  async getMine(): Promise<User> {
    const result = await apiClient.request<ApiSuccess<{ user: User }>>('/auth/me');
    return result.data.user;
  },

  async updateMine(input: EditProfileInput): Promise<User> {
    const result = await apiClient.request<ApiSuccess<{ user: User }>>('/users/me/profile', {
      method: 'PATCH', body: input,
    });
    return result.data.user;
  },

  async uploadMineImage(kind: 'avatar' | 'cover', file: File): Promise<{ user: User; asset: ProfileImageAsset }> {
    const form = new FormData();
    form.append('file', file);
    const result = await apiClient.request<ApiSuccess<{ user: User; asset: ProfileImageAsset }>>(`/users/me/${kind}`, {
      method: 'POST', body: form,
    });
    return result.data;
  },

  async removeMineImage(kind: 'avatar' | 'cover'): Promise<User> {
    const result = await apiClient.request<ApiSuccess<{ user: User }>>(`/users/me/${kind}`, {
      method: 'DELETE',
    });
    return result.data.user;
  },

  async get(userId: string): Promise<UserProfile> {
    const result = await apiClient.request<ApiSuccess<{ profile: UserProfile }>>(`/users/${encodeURIComponent(userId)}/profile`);
    return result.data.profile;
  },

  async posts(userId: string, page = 1, limit = 10, imagesOnly = false): Promise<PaginatedPosts> {
    const result = await apiClient.request<ApiSuccess<PaginatedPosts>>(
      `/users/${encodeURIComponent(userId)}/posts?${pageQuery(page, limit)}${imagesOnly ? '&imagesOnly=1' : ''}`,
    );
    return result.data;
  },

  async friends(userId: string, page = 1, limit = 20): Promise<PaginatedProfileFriends> {
    const result = await apiClient.request<ApiSuccess<PaginatedProfileFriends>>(
      `/users/${encodeURIComponent(userId)}/friends?${pageQuery(page, limit)}`,
    );
    return result.data;
  },
};
