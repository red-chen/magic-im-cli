import { apiClient } from './client.js';
import type {
  ApiResponse,
  AuthSignUpResponse,
  AuthSignInResponse,
  AuthAgentTokenResponse,
  AuthRefreshResponse,
} from '../types/index.js';

export interface SignUpParams {
  email: string;
  nickname: string;
  password: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export async function signUp(params: SignUpParams): Promise<ApiResponse<AuthSignUpResponse>> {
  return apiClient.post<AuthSignUpResponse>('/auth/sign-up', params);
}

export async function signIn(params: SignInParams): Promise<ApiResponse<AuthSignInResponse>> {
  return apiClient.post<AuthSignInResponse>('/auth/sign-in', params);
}

export async function signOut(): Promise<ApiResponse<void>> {
  return apiClient.post<void>('/auth/sign-out');
}

export async function generateAgentToken(agentId: string): Promise<ApiResponse<AuthAgentTokenResponse>> {
  return apiClient.post<AuthAgentTokenResponse>('/auth/agent-token', { agent_id: agentId });
}

export async function refreshToken(): Promise<ApiResponse<AuthRefreshResponse>> {
  return apiClient.post<AuthRefreshResponse>('/auth/refresh');
}
