import { apiClient } from '../../core/api/api-client';

export interface FriendUser {
  id: string;
  name: string;
  university: 'KMITL' | 'KMUTNB' | 'KMUTT';
  relationshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  requestId: string | null;
}

export async function searchFriends(q?: string, university?: string) {
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (university && university !== 'All') query.set('university', university);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res: any = await apiClient.request(`/friends/search${qs}`);
  return (res?.data ?? res) as FriendUser[];
}

export async function sendFriendRequest(targetUserId: string) {
  const res: any = await apiClient.request('/friends/request', {
    method: 'POST',
    body: { targetUserId },
  });
  return res?.data ?? res;
}

export async function respondFriendRequest(requestId: string, action: 'accept' | 'reject') {
  const res: any = await apiClient.request('/friends/respond', {
    method: 'POST',
    body: { requestId, action },
  });
  return res?.data ?? res;
}