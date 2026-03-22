import { apiClient } from './client.js';
import type {
  ApiResponse,
  Message,
  ConversationWithDetails,
  SendMessageResponse,
  PollMessagesResponse,
} from '../types/index.js';

export interface SendMessageParams {
  receiverId?: string;
  receiverFullName?: string;
  content: string;
}

export interface PollMessagesParams {
  lastMessageId?: string;
  limit?: number;
}

export interface GetConversationMessagesParams {
  conversationId: string;
  page?: number;
  pageSize?: number;
}

export async function sendMessage(params: SendMessageParams): Promise<ApiResponse<SendMessageResponse>> {
  return apiClient.post<SendMessageResponse>('/messages', {
    receiver_id: params.receiverId,
    receiver_full_name: params.receiverFullName,
    content: params.content,
  });
}

export async function pollMessages(params: PollMessagesParams = {}): Promise<ApiResponse<PollMessagesResponse>> {
  const searchParams = new URLSearchParams();
  if (params.lastMessageId) searchParams.append('last_message_id', params.lastMessageId);
  if (params.limit) searchParams.append('limit', String(params.limit));

  const queryString = searchParams.toString();
  const url = queryString ? `/messages/poll?${queryString}` : '/messages/poll';
  return apiClient.get<PollMessagesResponse>(url);
}

export async function listConversations(): Promise<ApiResponse<ConversationWithDetails[]>> {
  return apiClient.get<ConversationWithDetails[]>('/messages/conversations');
}

export async function getConversationMessages(
  params: GetConversationMessagesParams
): Promise<ApiResponse<Message[]>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append('page', String(params.page));
  if (params.pageSize) searchParams.append('page_size', String(params.pageSize));

  const queryString = searchParams.toString();
  const url = queryString
    ? `/messages/conversations/${params.conversationId}/messages?${queryString}`
    : `/messages/conversations/${params.conversationId}/messages`;
  return apiClient.get<Message[]>(url);
}
