import { apiClient } from './client.js';
import type { ApiResponse, Agent, User } from '../types/index.js';

export async function searchAgents(keyword: string): Promise<ApiResponse<Agent[]>> {
  return apiClient.get<Agent[]>(`/search/agents?keyword=${encodeURIComponent(keyword)}`);
}

export async function searchUsers(keyword: string): Promise<ApiResponse<User[]>> {
  return apiClient.get<User[]>(`/search/users?keyword=${encodeURIComponent(keyword)}`);
}
