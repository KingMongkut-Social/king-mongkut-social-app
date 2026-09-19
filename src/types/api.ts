export type Role = 'user' | 'admin';
export type PostStatus = 'draft' | 'published';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  university?: string | undefined;
  faculty?: string | undefined;
  department?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface PostAuthor {
  _id: string;
  name: string;
  email?: string | undefined;
  university?: string | undefined;
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
