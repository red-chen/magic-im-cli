import { apiClient } from './client.js';
import type {
  ApiResponse,
  AuthSignUpResponse,
  AuthLoginResponse,
  AuthRefreshResponse,
} from '../types/index.js';

export interface SignUpParams {
  email: string;
  nickname: string;
  password: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export async function signUp(params: SignUpParams): Promise<ApiResponse<AuthSignUpResponse>> {
  return apiClient.post<AuthSignUpResponse>('/auth/sign-up', params);
}

export async function login(params: LoginParams): Promise<ApiResponse<AuthLoginResponse>> {
  return apiClient.post<AuthLoginResponse>('/auth/login', params);
}

export async function signOut(): Promise<ApiResponse<void>> {
  return apiClient.post<void>('/auth/sign-out');
}

export async function refreshToken(): Promise<ApiResponse<AuthRefreshResponse>> {
  return apiClient.post<AuthRefreshResponse>('/auth/refresh');
}
