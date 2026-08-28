import type { ApiSuccess, PaginatedPosts, PostPayload, PostStatus } from '../../types/api';
import { apiClient } from '../../core/api/api-client';

export interface ListPostsInput {
  page?: number;
  limit?: number;
  search?: string;
}

export interface SavePostInput {
  title: string;
  content: string;
  status: PostStatus;
}

function queryString(input: ListPostsInput): string {
  const query = new URLSearchParams();
  if (input.page) query.set('page', String(input.page));
  if (input.limit) query.set('limit', String(input.limit));
  if (input.search) query.set('search', input.search);
  const result = query.toString();
  return result ? `?${result}` : '';
}

export const postsApi = {
  listPublished(input: ListPostsInput = {}): Promise<ApiSuccess<PaginatedPosts>> {
    return apiClient.request(`/posts${queryString(input)}`, { auth: false });
  },

  listMine(input: ListPostsInput = {}): Promise<ApiSuccess<PaginatedPosts>> {
    return apiClient.request(`/posts/mine${queryString(input)}`);
  },

  getById(id: string): Promise<ApiSuccess<PostPayload>> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}`);
  },

  create(input: SavePostInput): Promise<ApiSuccess<PostPayload>> {
    return apiClient.request('/posts', { method: 'POST', body: input });
  },

  update(id: string, input: SavePostInput): Promise<ApiSuccess<PostPayload>> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });
  },

  remove(id: string): Promise<void> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
