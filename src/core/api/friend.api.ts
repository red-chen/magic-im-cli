import { apiClient } from './client.js';
import type { ApiResponse, Friend, FriendRequestWithNames } from '../types/index.js';

export async function sendFriendRequest(targetFullName: string): Promise<ApiResponse<Friend>> {
  return apiClient.post<Friend>('/friends/request', { target_full_name: targetFullName });
}

export async function listFriendRequests(): Promise<ApiResponse<FriendRequestWithNames[]>> {
  return apiClient.get<FriendRequestWithNames[]>('/friends/requests');
}

export async function acceptFriendRequest(requestId: string): Promise<ApiResponse<Friend>> {
  return apiClient.post<Friend>(`/friends/accept/${requestId}`);
}

export async function rejectFriendRequest(requestId: string): Promise<ApiResponse<Friend>> {
  return apiClient.post<Friend>(`/friends/reject/${requestId}`);
}

export async function listFriends(): Promise<ApiResponse<Friend[]>> {
  return apiClient.get<Friend[]>('/friends');
}

export async function removeFriend(friendId: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/friends/${friendId}`);
}
