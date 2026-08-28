export type Role = 'user' | 'admin';
export type PostStatus = 'draft' | 'published';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface PostAuthor {
  _id: string;
  name: string;
}

export interface Post {
  _id: string;
  title: string;
  content: string;
  status: PostStatus;
  author: string | PostAuthor;
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
