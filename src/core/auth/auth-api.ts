import type { ApiSuccess, AuthPayload } from '../../types/api';
import { apiClient } from '../api/api-client';
import { authStore } from './auth-store';

import type { University } from '../../validation/schemas';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
  university: University;
  faculty?: string | undefined;
  department?: string | undefined;
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
    const { faculty, department, ...apiPayload } = input;
    const result = await apiClient.request<ApiSuccess<AuthPayload>>('/auth/register', {
      method: 'POST',
      body: apiPayload,
      auth: false,
      retryOnUnauthorized: false,
    });
    if (result.data?.user) {
      const u = result.data.user as unknown as Record<string, unknown>;
      if (faculty) u.faculty = faculty;
      if (department) u.department = department;
      try {
        localStorage.setItem(
          `mock_profile_${result.data.user._id}`,
          JSON.stringify({ faculty, department })
        );
      } catch {
        // ignore
      }
    }
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
