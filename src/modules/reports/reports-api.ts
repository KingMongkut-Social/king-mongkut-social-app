import { apiClient } from '../../core/api/api-client';
import type { ApiSuccess } from '../../types/api';

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'fake_account' | 'scam' | 'other';
export type ReportTarget = 'post' | 'comment' | 'user' | 'group' | 'group_post';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface ReportItem {
  _id: string;
  reporter: { _id: string; name: string; username?: string | null; university?: string };
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  action?: 'dismiss' | 'remove_content' | 'suspend_user' | 'restore_user' | null;
  note?: string | null;
  moderatedAt?: string | null;
  createdAt: string;
}

export const reportsApi = {
  create(input: { targetType: ReportTarget; targetId: string; reason: ReportReason; details: string }) {
    return apiClient.request<ApiSuccess<{ report: ReportItem }>>('/reports', { method: 'POST', body: input });
  },
  async listPage(status: ReportStatus = 'pending', page = 1, limit = 50) {
    const response = await apiClient.request<ApiSuccess<{
      items: ReportItem[]; page: number; limit: number; total: number; pages: number;
    }>>(`/reports?status=${encodeURIComponent(status)}&page=${page}&limit=${limit}`);
    return response.data;
  },

  async list(status: ReportStatus = 'pending') {
    return (await this.listPage(status, 1, 100)).items;
  },
  moderate(id: string, action: 'dismiss' | 'remove_content' | 'suspend_user' | 'restore_user', note?: string) {
    return apiClient.request(`/reports/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { action, ...(note ? { note } : {}) },
    });
  },
};
