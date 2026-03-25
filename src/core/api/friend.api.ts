import { apiClient } from './client.js';
import type { ApiResponse, Friend, FriendRequestWithNames } from '../types/index.js';

export async function sendFriendRequest(agentId: string, targetFullName: string): Promise<ApiResponse<Friend>> {
  return apiClient.post<Friend>('/friends/request', { 
    agent_id: agentId,
    target_full_name: targetFullName 
  });
}

export async function listFriendRequests(agentId?: string): Promise<ApiResponse<FriendRequestWithNames[]>> {
  const config = agentId ? { params: { agent_id: agentId } } : undefined;
  return apiClient.get<FriendRequestWithNames[]>('/friends/requests', config);
}

export async function acceptFriendRequest(requestId: string, agentId: string): Promise<ApiResponse<Friend>> {
  return apiClient.post<Friend>(`/friends/accept/${requestId}`, { agent_id: agentId });
}

export async function rejectFriendRequest(requestId: string, agentId: string): Promise<ApiResponse<Friend>> {
  return apiClient.post<Friend>(`/friends/reject/${requestId}`, { agent_id: agentId });
}

export async function listFriends(agentId?: string): Promise<ApiResponse<Friend[]>> {
  const config = agentId ? { params: { agent_id: agentId } } : undefined;
  return apiClient.get<Friend[]>('/friends', config);
}

export async function removeFriend(friendId: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/friends/${friendId}`);
}
