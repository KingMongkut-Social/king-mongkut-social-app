import { apiClient } from '../../core/api/api-client';
import type { ApiSuccess } from '../../types/api';

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'fake_account' | 'scam' | 'other';
export type ReportTarget = 'post' | 'comment' | 'user' | 'group';

export interface ReportItem {
  _id: string;
  reporter: { _id: string; name: string; username?: string | null; university?: string };
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export const reportsApi = {
  create(input: { targetType: ReportTarget; targetId: string; reason: ReportReason; details: string }) {
    return apiClient.request<ApiSuccess<{ report: ReportItem }>>('/reports', { method: 'POST', body: input });
  },
  async list(status = 'pending') {
    const response = await apiClient.request<ApiSuccess<{ items: ReportItem[] }>>(
      `/reports?status=${encodeURIComponent(status)}&limit=100`,
    );
    return response.data.items;
  },
  moderate(id: string, action: 'dismiss' | 'remove_content' | 'suspend_user' | 'restore_user', note?: string) {
    return apiClient.request(`/reports/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { action, ...(note ? { note } : {}) },
    });
  },
};
