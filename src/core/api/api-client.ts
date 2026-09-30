import { env } from '../../config/env';
import type { ApiSuccess, AuthPayload } from '../../types/api';
import { authStore } from '../auth/auth-store';
import { ApiError } from './api-error';

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined;
  return response.json() as Promise<unknown>;
}

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      const payload = await parseResponse(response);
      if (!response.ok) {
        authStore.setAnonymous();
        return false;
      }

      const result = payload as ApiSuccess<AuthPayload>;
      authStore.setAuthenticated(result.data.user, result.data.accessToken);
      return true;
    } catch {
      authStore.setAnonymous();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

class ApiClient {
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      body,
      headers: customHeaders,
      auth = true,
      retryOnUnauthorized = true,
      ...requestInit
    } = options;

    const headers = new Headers(customHeaders);
    headers.set('Accept', 'application/json');

    if (body !== undefined && !(body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = authStore.snapshot.accessToken;
    if (auth && token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const request: RequestInit = {
      ...requestInit,
      headers,
      credentials: 'include',
    };
    if (body !== undefined) request.body = body instanceof FormData ? body : JSON.stringify(body);

    let response: Response;
    try {
      response = await fetch(`${env.apiBaseUrl}${path}`, request);
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the API. Check the backend and network connection.');
    }

    if (response.status === 401 && auth && retryOnUnauthorized) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return this.request<T>(path, { ...options, retryOnUnauthorized: false });
      }
    }

    const payload = await parseResponse(response);
    if (!response.ok) throw ApiError.fromResponse(response.status, payload);
    return payload as T;
  }

  restoreSession(): Promise<boolean> {
    return refreshSession();
  }
}

export const apiClient = new ApiClient();
