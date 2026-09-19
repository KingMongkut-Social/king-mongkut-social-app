import type {
  ApiSuccess,
  CommentPayload,
  CommentsPayload,
  EngagementPayload,
  PaginatedPosts,
  PostPayload,
  PostStatus,
  ReactionTargetType,
  ReactionType,
  University,
} from '../../types/api';
import { apiClient } from '../../core/api/api-client';

export interface ListPostsInput {
  page?: number;
  limit?: number;
  search?: string;
  university?: University;
}

export interface SavePostInput {
  title?: string;
  content: string;
  status: PostStatus;
  coverImage?: string | null;
  tags?: string[];
}

function queryString(input: ListPostsInput): string {
  const query = new URLSearchParams();
  if (input.page) query.set('page', String(input.page));
  if (input.limit) query.set('limit', String(input.limit));
  if (input.search) query.set('search', input.search);
  if (input.university) query.set('university', input.university);
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

  listComments(postId: string): Promise<ApiSuccess<CommentsPayload>> {
    return apiClient.request(`/posts/${encodeURIComponent(postId)}/comments`);
  },

  createComment(postId: string, content: string, parentCommentId?: string): Promise<ApiSuccess<CommentPayload>> {
    return apiClient.request(`/posts/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      body: { content, ...(parentCommentId ? { parentCommentId } : {}) },
    });
  },

  updateComment(postId: string, commentId: string, content: string): Promise<void> {
    return apiClient.request(
      `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      { method: 'PATCH', body: { content } },
    );
  },

  removeComment(postId: string, commentId: string): Promise<void> {
    return apiClient.request(
      `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE' },
    );
  },

  react(targetType: ReactionTargetType, targetId: string, type: ReactionType): Promise<ApiSuccess<EngagementPayload>> {
    return apiClient.request(`/reactions/${targetType}/${encodeURIComponent(targetId)}`, {
      method: 'PUT',
      body: { type },
    });
  },

  removeReaction(targetType: ReactionTargetType, targetId: string): Promise<ApiSuccess<EngagementPayload>> {
    return apiClient.request(`/reactions/${targetType}/${encodeURIComponent(targetId)}`, {
      method: 'DELETE',
    });
  },
};
