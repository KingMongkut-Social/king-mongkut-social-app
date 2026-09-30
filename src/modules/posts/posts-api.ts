import type { ApiSuccess, PaginatedPostComments, PaginatedPosts, PostAttachment, PostComment, PostPayload, PostReaction, PostStatus } from '../../types/api';
import { apiClient } from '../../core/api/api-client';
import { env } from '../../config/env';

export interface ListPostsInput {
  page?: number;
  limit?: number;
  search?: string;
}

export interface SavePostInput {
  title?: string;
  content: string;
  status: PostStatus;
  coverImage?: string | null | undefined;
  tags?: string[] | undefined;
  images?: string[];
  attachments?: PostAttachment[];
  feeling?: string | null;
  taggedFriends?: string[];
}

export function assetUrl(path: string): string {
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return new URL(path, env.apiBaseUrl).href;
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
    return apiClient.request(`/posts${queryString(input)}`);
  },

  listMine(input: ListPostsInput = {}): Promise<ApiSuccess<PaginatedPosts>> {
    return apiClient.request(`/posts/mine${queryString(input)}`);
  },

  listBookmarks(input: ListPostsInput = {}): Promise<ApiSuccess<PaginatedPosts>> {
    return apiClient.request(`/posts/bookmarks${queryString(input)}`);
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

  like(id: string): Promise<ApiSuccess<PostPayload>> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}/like`, { method: 'PUT' });
  },

  unlike(id: string): Promise<ApiSuccess<PostPayload>> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}/like`, { method: 'DELETE' });
  },

  react(id: string, reaction: PostReaction): Promise<ApiSuccess<PostPayload>> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}/reaction`, {
      method: 'PUT',
      body: { reaction },
    });
  },

  unreact(id: string): Promise<ApiSuccess<PostPayload>> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}/reaction`, { method: 'DELETE' });
  },

  bookmark(id: string): Promise<ApiSuccess<PostPayload>> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}/bookmark`, { method: 'PUT' });
  },

  unbookmark(id: string): Promise<ApiSuccess<PostPayload>> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}/bookmark`, { method: 'DELETE' });
  },

  listComments(id: string, page = 1, limit = 100): Promise<ApiSuccess<PaginatedPostComments>> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}/comments?page=${page}&limit=${limit}`);
  },

  addComment(id: string, content: string, parentId?: string): Promise<ApiSuccess<{ comment: PostComment }>> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}/comments`, {
      method: 'POST', body: { content, ...(parentId ? { parentId } : {}) },
    });
  },

  removeComment(id: string, commentId: string): Promise<void> {
    return apiClient.request(`/posts/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
  },

  upload(file: File): Promise<ApiSuccess<{ asset: PostAttachment }>> {
    const form = new FormData();
    form.append('file', file);
    return apiClient.request('/posts/uploads', { method: 'POST', body: form });
  },
};
