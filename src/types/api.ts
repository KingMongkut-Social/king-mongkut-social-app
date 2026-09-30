export type Role = 'user' | 'admin';
export type PostStatus = 'draft' | 'published';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  university: 'KMITL' | 'KMUTNB' | 'KMUTT';
  needsProfileCompletion: boolean;
  faculty?: string | undefined;
  department?: string | undefined;
  username?: string | null | undefined;
  bio?: string | undefined;
  academicYear?: number | null | undefined;
  avatarUrl?: string | null | undefined;
  coverUrl?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface PostAuthor {
  _id: string;
  name: string;
  email?: string | undefined;
  university?: string | undefined;
  faculty?: string | undefined;
  department?: string | undefined;
}

export interface Post {
  _id: string;
  title: string;
  content: string;
  status: PostStatus;
  author?: string | PostAuthor | undefined;
  user?: string | PostAuthor | undefined;
  coverImage?: string | null | undefined;
  tags?: string[] | undefined;
  images?: string[] | undefined;
  attachments?: PostAttachment[] | undefined;
  media?: PostAttachment[] | undefined;
  feeling?: string | null | undefined;
  taggedFriends?: string[] | undefined;
  likesCount?: number | undefined;
  commentsCount?: number | undefined;
  likeCount?: number | undefined;
  commentCount?: number | undefined;
  likedByMe?: boolean | undefined;
  savedByMe?: boolean | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface PostAttachment {
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface PostComment {
  _id: string;
  post: string;
  author: PostAuthor;
  content: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPostComments {
  items: PostComment[];
  page: number;
  limit: number;
  total: number;
  pages: number;
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
