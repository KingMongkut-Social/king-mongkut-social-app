import type { ApiSuccess, AuthPayload, University } from '../../types/api';
import { apiClient } from '../api/api-client';
import { authStore } from './auth-store';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
  university: University;
}

export const authApi = {
  async login(input: LoginInput): Promise<void> {
    const result = await apiClient.request<ApiSuccess<AuthPayload>>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
      retryOnUnauthorized: false,
    });
    authStore.setAuthenticated(result.data.user, result.data.accessToken);
  },

  async register(input: RegisterInput): Promise<void> {
    const result = await apiClient.request<ApiSuccess<AuthPayload>>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
      retryOnUnauthorized: false,
    });
    authStore.setAuthenticated(result.data.user, result.data.accessToken);
  },

  async googleLogin(code: string, university: University): Promise<void> {
    const result = await apiClient.request<ApiSuccess<AuthPayload>>('/auth/google', {
      method: 'POST',
      body: { code, university },
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      auth: false,
      retryOnUnauthorized: false,
    });
    authStore.setAuthenticated(result.data.user, result.data.accessToken);
  },

  async logout(): Promise<void> {
    try {
      await apiClient.request<void>('/auth/logout', {
        method: 'POST',
        auth: false,
        retryOnUnauthorized: false,
      });
    } finally {
      authStore.setAnonymous();
    }
  },
};
