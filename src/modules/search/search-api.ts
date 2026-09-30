import { apiClient } from '../../core/api/api-client';
import type { ApiSuccess, Post } from '../../types/api';

export interface SearchUser {
  id: string; name: string; username: string | null; avatarUrl: string | null;
  university: string; faculty?: string; department?: string;
}
export interface SearchGroup {
  id: string; name: string; description: string; coverUrl: string | null; university: string | null;
  memberCount?: number;
}
export interface SearchUniversity {
  code: string; shortName: string; name: string; memberCount: number; postCount: number;
}
export interface SearchResult {
  users: SearchUser[];
  posts: Post[];
  groups: SearchGroup[];
  universities: SearchUniversity[];
  items?: (SearchUser | Post | SearchGroup | SearchUniversity)[];
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
}
export interface SearchOptions {
  type?: 'all' | 'users' | 'posts' | 'groups' | 'universities';
  page?: number;
  limit?: number;
}

export const searchApi = {
  async search(q: string, options: SearchOptions = {}): Promise<SearchResult> {
    const params = new URLSearchParams();
    params.set('q', q);
    if (options.type && options.type !== 'all') params.set('type', options.type);
    if (options.page && options.page > 1) params.set('page', String(options.page));
    params.set('limit', String(options.limit || 10));

    const response = await apiClient.request<ApiSuccess<SearchResult>>(
      `/search?${params.toString()}`,
    );
    return response.data;
  },
};
