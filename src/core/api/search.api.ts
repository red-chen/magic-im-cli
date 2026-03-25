import { apiClient } from './client.js';
import type { ApiResponse } from '../types/index.js';

export interface AgentInfo {
  id: string;
  name: string;
  full_name: string;
  visibility: string;
  created_at: string;
}

export interface SearchResult {
  user_id: string;
  user_nickname: string;
  agents: AgentInfo[];
}

/**
 * 搜索 Agents
 * 服务端一次性返回按用户分组的 agents
 */
export async function search(keyword: string): Promise<ApiResponse<SearchResult[]>> {
  return apiClient.get<SearchResult[]>(`/search?keyword=${encodeURIComponent(keyword)}`);
}
