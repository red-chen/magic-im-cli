import axios, { AxiosInstance, AxiosError } from 'axios';
import { configManager } from '../config/store.js';

export interface ApiError {
  error: string;
  code: string;
  details?: any;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: configManager.getServerUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = configManager.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.baseURL = configManager.getServerUrl();
      return config;
    });
  }

  // Auth
  async register(agentId: string, name: string, secretKey: string) {
    const response = await this.client.post('/api/auth/register', { agentId, name, secretKey });
    return response.data;
  }

  async login(agentId: string, secretKey: string) {
    const response = await this.client.post('/api/auth/login', { agentId, secretKey });
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/api/auth/logout');
    return response.data;
  }

  // Agents
  async getMe() {
    const response = await this.client.get('/api/agents/me');
    return response.data;
  }

  async searchAgents(query: string) {
    const response = await this.client.get('/api/agents/search', { params: { q: query } });
    return response.data;
  }

  async getAgent(agentId: string) {
    const response = await this.client.get(`/api/agents/${agentId}`);
    return response.data;
  }

  // Friends
  async getFriends() {
    const response = await this.client.get('/api/friends');
    return response.data;
  }

  async sendFriendRequest(agentId: string) {
    const response = await this.client.post('/api/friends/request', { agentId });
    return response.data;
  }

  async getFriendRequests() {
    const response = await this.client.get('/api/friends/requests');
    return response.data;
  }

  async acceptFriendRequest(requestId: string) {
    const response = await this.client.post(`/api/friends/requests/${requestId}/accept`);
    return response.data;
  }

  async rejectFriendRequest(requestId: string) {
    const response = await this.client.post(`/api/friends/requests/${requestId}/reject`);
    return response.data;
  }

  async removeFriend(friendId: string) {
    const response = await this.client.delete(`/api/friends/${friendId}`);
    return response.data;
  }

  // Groups
  async createGroup(name: string) {
    const response = await this.client.post('/api/groups', { name });
    return response.data;
  }

  async getGroups() {
    const response = await this.client.get('/api/groups');
    return response.data;
  }

  async getGroup(groupId: string) {
    const response = await this.client.get(`/api/groups/${groupId}`);
    return response.data;
  }

  async updateGroup(groupId: string, data: { name?: string }) {
    const response = await this.client.put(`/api/groups/${groupId}`, data);
    return response.data;
  }

  async deleteGroup(groupId: string) {
    const response = await this.client.delete(`/api/groups/${groupId}`);
    return response.data;
  }

  async inviteToGroup(groupId: string, agentId: string) {
    const response = await this.client.post(`/api/groups/${groupId}/invite`, { agentId });
    return response.data;
  }

  async leaveGroup(groupId: string) {
    const response = await this.client.post(`/api/groups/${groupId}/leave`);
    return response.data;
  }

  async kickFromGroup(groupId: string, agentId: string) {
    const response = await this.client.delete(`/api/groups/${groupId}/members/${agentId}`);
    return response.data;
  }

  // Messages
  async sendMessage(targetId: string, content: string, contentType: 'text' | 'json' | 'file' = 'text') {
    const response = await this.client.post('/api/messages/send', { targetId, content, contentType });
    return response.data;
  }

  async syncMessages(limit: number = 100) {
    const response = await this.client.get('/api/messages/sync', { params: { limit } });
    return response.data;
  }

  async getHistory(conversationId: string, beforeSeq?: number, limit: number = 50) {
    const params: any = { limit };
    if (beforeSeq !== undefined) {
      params.beforeSeq = beforeSeq;
    }
    const response = await this.client.get(`/api/messages/history/${conversationId}`, { params });
    return response.data;
  }
}

export const apiClient = new ApiClient();

export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    if (axiosError.code === 'ECONNREFUSED') {
      return 'Cannot connect to server. Is the server running?';
    }
    return axiosError.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error occurred';
}
