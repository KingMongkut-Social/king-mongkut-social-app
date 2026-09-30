import { apiClient } from '../../core/api/api-client';
import type { ApiSuccess } from '../../types/api';

export interface FriendUser {
  id: string;
  name: string;
  faculty?: string;
  department?: string;
  university: 'KMITL' | 'KMUTNB' | 'KMUTT';
  relationshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  requestId: string | null;
  mutualFriendCount?: number;
}

export interface FriendPerson {
  id: string;
  name: string;
  university: FriendUser['university'];
  faculty?: string;
  department?: string;
  mutualFriendCount?: number;
}

export interface SuggestedFriend extends FriendUser {
  relationshipStatus: 'none';
  requestId: null;
  mutualFriendCount: number;
}

export interface AcceptedFriend extends FriendPerson {
  friendshipId: string;
  isOnline?: boolean;
}

export interface FriendRequest {
  id: string;
  requester: FriendPerson;
  recipient: FriendPerson;
  createdAt: string;
}

export interface FriendRequests {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

export async function listFriends(): Promise<AcceptedFriend[]> {
  const response = await apiClient.request<ApiSuccess<AcceptedFriend[]>>('/friends');
  return response.data;
}

export async function listFriendRequests(): Promise<FriendRequests> {
  const response = await apiClient.request<ApiSuccess<FriendRequests>>('/friends/requests');
  return response.data;
}

export async function listSuggestedFriends(limit = 20): Promise<SuggestedFriend[]> {
  const response = await apiClient.request<ApiSuccess<SuggestedFriend[]>>(`/friends/suggestions?limit=${limit}`);
  return response.data;
}

export async function getFriendUser(userId: string): Promise<FriendUser> {
  const response = await apiClient.request<ApiSuccess<FriendUser>>(`/friends/users/${encodeURIComponent(userId)}`);
  return response.data;
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

export async function cancelFriendRequest(requestId: string): Promise<unknown> {
  const response = await apiClient.request<ApiSuccess<unknown>>(`/friends/requests/${encodeURIComponent(requestId)}`, {
    method: 'DELETE',
  });
  return response.data;
}


export async function removeFriend(friendshipId: string): Promise<unknown> {
  const response = await apiClient.request<ApiSuccess<unknown>>(`/friends/${encodeURIComponent(friendshipId)}`, {
    method: 'DELETE',
  });
  return response.data;
}
