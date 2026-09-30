import { apiClient } from '../../core/api/api-client';
import type { ApiSuccess, PaginatedPosts } from '../../types/api';

export type UniversityCode = 'KMITL' | 'KMUTT' | 'KMUTNB';

export interface UniversitySummary {
  code: UniversityCode;
  shortName: string;
  name: string;
  memberCount: number;
  postCount: number;
}

export interface UniversityMember {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  university: UniversityCode;
  faculty?: string;
  department?: string;
}

export const universitiesApi = {
  async list(): Promise<UniversitySummary[]> {
    const response = await apiClient.request<ApiSuccess<{ items: UniversitySummary[] }>>('/universities', { auth: false });
    return response.data.items;
  },
  async get(code: UniversityCode): Promise<UniversitySummary> {
    const response = await apiClient.request<ApiSuccess<{ university: UniversitySummary }>>(
      `/universities/${encodeURIComponent(code)}`,
      { auth: false },
    );
    return response.data.university;
  },
  async posts(code: UniversityCode, page = 1): Promise<PaginatedPosts> {
    const response = await apiClient.request<ApiSuccess<PaginatedPosts>>(
      `/universities/${encodeURIComponent(code)}/posts?page=${page}&limit=10`,
    );
    return response.data;
  },
  async members(code: UniversityCode, page = 1) {
    const response = await apiClient.request<ApiSuccess<{
      items: UniversityMember[]; page: number; limit: number; total: number; pages: number;
    }>>(`/universities/${encodeURIComponent(code)}/members?page=${page}&limit=20`, { auth: false });
    return response.data;
  },
};
