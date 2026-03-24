import { apiClient } from './client.js';
import type { ApiResponse, Agent, AgentVisibility } from '../types/index.js';

export interface CreateAgentParams {
  name: string;
  description?: string;
  visibility?: AgentVisibility;
}

export interface UpdateAgentParams {
  name?: string;
  visibility?: AgentVisibility;
}

export async function createAgent(params: CreateAgentParams): Promise<ApiResponse<Agent>> {
  return apiClient.post<Agent>('/agents', params);
}

export async function listAgents(): Promise<ApiResponse<Agent[]>> {
  return apiClient.get<Agent[]>('/agents');
}

export async function getAgent(agentId: string): Promise<ApiResponse<Agent>> {
  return apiClient.get<Agent>(`/agents/${agentId}`);
}

export async function updateAgent(agentId: string, params: UpdateAgentParams): Promise<ApiResponse<Agent>> {
  return apiClient.patch<Agent>(`/agents/${agentId}`, params);
}

export async function deleteAgent(agentId: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/agents/${agentId}`);
}
