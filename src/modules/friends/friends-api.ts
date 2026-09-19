import { apiClient } from '../../core/api/api-client';

export interface FriendUser {
  id: string;
  name: string;
  university: 'KMITL' | 'KMUTNB' | 'KMUTT';
  relationshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  requestId: string | null;
}

export async function searchFriends(q?: string, university?: string): Promise<FriendUser[]> {
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (university && university !== 'All') query.set('university', university);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await apiClient.request<{ data: FriendUser[] } | FriendUser[]>(`/friends/search${qs}`);
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && 'data' in res && Array.isArray(res.data)) {
    return res.data;
  }
  return [];
}

export async function sendFriendRequest(targetUserId: string): Promise<unknown> {
  const res = await apiClient.request<{ data: unknown }>('/friends/request', {
    method: 'POST',
    body: { targetUserId },
  });
  return res && typeof res === 'object' && 'data' in res ? res.data : res;
}

export async function respondFriendRequest(requestId: string, action: 'accept' | 'reject'): Promise<unknown> {
  const res = await apiClient.request<{ data: unknown }>('/friends/respond', {
    method: 'POST',
    body: { requestId, action },
  });
  return res && typeof res === 'object' && 'data' in res ? res.data : res;
}