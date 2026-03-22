export type Language = 'zh' | 'en';

export type ThemeMode = 'light' | 'dark';

export interface Config {
  apiUrl: string;
  token?: string;
  currentAgentId?: string;
  language?: Language;
  theme?: ThemeMode;
}

// Session snapshot for restoring TUI state
export interface SessionSnapshot {
  id: string;
  createdAt: string;
  updatedAt: string;
  entries: Array<{
    type: 'user' | 'output' | 'separator' | 'page-break';
    text: string;
  }>;
  history: string[];
  theme: ThemeMode;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  created_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  full_name: string;
  visibility: 'PUBLIC' | 'SEMI_PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  created_at: string;
  updated_at: string;
}

export interface FriendRequest {
  id: string;
  requester_agent_id: string;
  target_agent_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  agent_id: string;
  friend_agent_id: string;
  friend_name: string;
  friend_full_name: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant_1_type: 'user' | 'agent';
  participant_1_id: string;
  participant_2_type: 'user' | 'agent';
  participant_2_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'agent';
  sender_id: string;
  content: string;
  created_at: string;
}

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
