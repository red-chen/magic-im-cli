import { apiClient } from './client.js';
import type { ApiResponse, Agent, User } from '../types/index.js';

export interface SearchResult {
  user: User;
  agents: Agent[];
}

export async function searchAgents(keyword: string): Promise<ApiResponse<Agent[]>> {
  return apiClient.get<Agent[]>(`/search/agents?keyword=${encodeURIComponent(keyword)}`);
}

export async function searchUsers(keyword: string): Promise<ApiResponse<User[]>> {
  return apiClient.get<User[]>(`/search/users?keyword=${encodeURIComponent(keyword)}`);
}

/**
 * 综合搜索：搜索用户及其所有 agent
 * 先搜索用户，再获取每个用户的所有 agent
 */
export async function searchUsersWithAgents(keyword: string): Promise<ApiResponse<SearchResult[]>> {
  // 1. 搜索用户
  const usersResponse = await searchUsers(keyword);
  if (!usersResponse.success || !usersResponse.data) {
    return {
      success: false,
      data: [],
      error: usersResponse.error || 'Search failed'
    };
  }

  const users = usersResponse.data;
  
  // 2. 为每个用户获取其所有 agent
  const results: SearchResult[] = [];
  for (const user of users) {
    try {
      const agentsResponse = await apiClient.get<Agent[]>(`/agents?user_id=${user.id}`);
      results.push({
        user,
        agents: agentsResponse.success && agentsResponse.data ? agentsResponse.data : []
      });
    } catch {
      // 如果获取 agent 失败，仍然返回用户，但 agent 列表为空
      results.push({
        user,
        agents: []
      });
    }
  }

  return {
    success: true,
    data: results
  };
}
