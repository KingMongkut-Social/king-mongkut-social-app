export type Role = 'user' | 'admin';
export type University = 'KMITL' | 'KMUTT' | 'KMUTNB';
export type PostStatus = 'draft' | 'published';
export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
export type ReactionTargetType = 'post' | 'comment';

export interface User {
  _id: string;
  name: string;
  email: string;
  university: University;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface PostAuthor {
  _id: string;
  name: string;
  university?: University;
  avatarUrl?: string | null;
}

export interface ReactionCounts {
  like: number;
  love: number;
  haha: number;
  wow: number;
  sad: number;
  angry: number;
}

export interface Engagement {
  total: number;
  counts: ReactionCounts;
  viewerReaction: ReactionType | null;
  commentCount?: number;
}

export interface Post {
  _id: string;
  title: string;
  content: string;
  status: PostStatus;
  author: string | PostAuthor;
  coverImage?: string | null;
  tags?: string[];
  engagement?: Engagement;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  post: string;
  author: PostAuthor;
  parentCommentId: string | null;
  content: string;
  isDeleted: boolean;
  engagement: Engagement;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPosts {
  items: Post[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthPayload {
  user: User;
  accessToken: string;
}

export interface PostPayload {
  post: Post;
}

export interface CommentsPayload {
  items: Comment[];
}

export interface CommentPayload {
  comment: Comment;
}

export interface EngagementPayload {
  engagement: Engagement;
}
