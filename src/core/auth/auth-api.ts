import { env } from '../../config/env';
import type { ApiSuccess, User } from '../../types/api';
import type { ProfileInput } from '../../validation/schemas';
import { apiClient } from '../api/api-client';
import { authStore } from './auth-store';
import { safeReturnTo } from './return-to';

export const authApi = {
  startGoogleLogin(returnTo: string | null): void {
    const url = new URL(env.apiBaseUrl + '/auth/google');
    url.searchParams.set('returnTo', safeReturnTo(returnTo));
    window.location.assign(url.toString());
  },

  async updateProfile(input: ProfileInput): Promise<void> {
    const result = await apiClient.request<ApiSuccess<{ user: User }>>('/auth/profile', {
      method: 'PATCH', body: input,
    });
    const token = authStore.snapshot.accessToken;
    if (token) authStore.setAuthenticated(result.data.user, token);
  },

  async logout(): Promise<void> {
    try {
      await apiClient.request<void>('/auth/logout', {
        method: 'POST', auth: false, retryOnUnauthorized: false,
      });
    } finally {
      authStore.setAnonymous();
    }
  },
};
