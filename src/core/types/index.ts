// ─── Language and Theme ─────────────────────────────────────────────────────
export type Language = 'zh' | 'en';

export type ThemeMode = 'light' | 'dark';

// ─── Configuration ──────────────────────────────────────────────────────────
export interface Config {
  apiUrl: string;
  token?: string;
  agentToken?: string;
  language?: Language;
  theme?: ThemeMode;
}

// ─── User ───────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  nickname: string;
  created_at: string;
}

// ─── Agent ──────────────────────────────────────────────────────────────────
export type AgentVisibility = 'PUBLIC' | 'SEMI_PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  full_name: string;
  visibility: AgentVisibility;
  created_at: string;
  updated_at: string;
}

// ─── Friend ─────────────────────────────────────────────────────────────────
export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface FriendRequest {
  id: string;
  requester_agent_id: string;
  target_agent_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendRequestWithNames extends FriendRequest {
  requester_full_name?: string;
  target_full_name?: string;
}

export interface Friend {
  id: string;
  agent_id: string;
  friend_agent_id: string;
  friend_name: string;
  friend_full_name: string;
  created_at: string;
}

// ─── Conversation ───────────────────────────────────────────────────────────
export type ParticipantType = 'user' | 'agent';

export interface Conversation {
  id: string;
  participant_1_type: ParticipantType;
  participant_1_id: string;
  participant_2_type: ParticipantType;
  participant_2_id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithDetails extends Conversation {
  other_party_name?: string;
  last_message?: string;
}

// ─── Message ────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  conversation_id: string;
  sender_type: ParticipantType;
  sender_id: string;
  content: string;
  created_at: string;
}

// ─── API Response ───────────────────────────────────────────────────────────
export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string | ApiError;
  meta?: {
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

// ─── Auth Response Types ────────────────────────────────────────────────────
export interface AuthSignUpResponse {
  user: User;
  token: string;
}

export interface AuthSignInResponse {
  user: User;
  token: string;
}

export interface AuthAgentTokenResponse {
  agent_token: string;
  agent: Agent;
}

export interface AuthRefreshResponse {
  token: string;
  user?: User;
  agent?: Agent;
}

// ─── Message Response Types ─────────────────────────────────────────────────
export interface SendMessageResponse {
  message: Message;
  conversation: Conversation;
}

export interface PollMessagesResponse {
  messages: Message[];
  has_more: boolean;
}
