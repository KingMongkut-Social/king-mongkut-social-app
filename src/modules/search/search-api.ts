import { apiClient } from '../../core/api/api-client';
import type { ApiSuccess, Post } from '../../types/api';

export interface SearchUser {
  id: string; name: string; username: string | null; avatarUrl: string | null;
  university: string; faculty?: string; department?: string;
}
export interface SearchGroup {
  id: string; name: string; description: string; coverUrl: string | null; university: string | null;
}
export interface SearchUniversity {
  code: string; shortName: string; name: string; memberCount: number; postCount: number;
}
export interface SearchResult {
  users: SearchUser[];
  posts: Post[];
  groups: SearchGroup[];
  universities: SearchUniversity[];
}
export const searchApi = {
  async search(q: string): Promise<SearchResult> {
    const response = await apiClient.request<ApiSuccess<SearchResult>>(
      `/search?q=${encodeURIComponent(q)}&limit=10`,
    );
    return response.data;
  },
};
