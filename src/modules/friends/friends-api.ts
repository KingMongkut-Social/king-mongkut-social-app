import { apiClient } from '../../core/api/api-client';
import type { ApiSuccess, University } from '../../types/api';

export interface FriendUser {
  id: string;
  name: string;
  university: University;
  avatarUrl?: string | null;
  relationshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  requestId: string | null;
}

interface FriendshipResult {
  _id: string;
  requester: string;
  recipient: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export async function searchFriends(q?: string, university?: University | 'All'): Promise<FriendUser[]> {
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (university && university !== 'All') query.set('university', university);

  const suffix = query.size ? `?${query.toString()}` : '';
  const response = await apiClient.request<ApiSuccess<FriendUser[]>>(`/friends/search${suffix}`);
  return response.data;
}

export async function sendFriendRequest(targetUserId: string): Promise<FriendshipResult> {
  const response = await apiClient.request<ApiSuccess<FriendshipResult>>('/friends/request', {
    method: 'POST',
    body: { targetUserId },
  });
  return response.data;
}

export async function respondFriendRequest(
  requestId: string,
  action: 'accept' | 'reject',
): Promise<FriendshipResult> {
  const response = await apiClient.request<ApiSuccess<FriendshipResult>>('/friends/respond', {
    method: 'POST',
    body: { requestId, action },
  });
  return response.data;
}
