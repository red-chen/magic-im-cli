import { describe, it, expect } from 'vitest';
import chalk from 'chalk';
import {
  formatAgent,
  formatAgentList,
  formatFriend,
  formatFriendList,
  formatFriendRequestList,
  formatMessage,
  formatConversationList,
  formatError,
  formatSuccess,
  formatInfo,
  formatWarning,
} from './format.js';
import { Agent, Friend, FriendRequest, Message, Conversation } from '../types/index.js';

describe('format', () => {
  const mockAgent: Agent = {
    id: 'agent-123',
    user_id: 'user-123',
    name: 'TestAgent',
    full_name: 'TestAgent#User',
    visibility: 'PUBLIC',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockFriend: Friend = {
    id: 'friend-123',
    agent_id: 'agent-123',
    friend_agent_id: 'agent-456',
    friend_name: 'FriendAgent',
    friend_full_name: 'FriendAgent#Other',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockMessage: Message = {
    id: 'msg-123',
    conversation_id: 'conv-123',
    sender_type: 'agent',
    sender_id: 'agent-456',
    content: 'Hello!',
    created_at: '2024-01-01T12:00:00Z',
  };

  describe('formatAgent', () => {
    it('should format agent details', () => {
      const result = formatAgent(mockAgent);
      expect(result).toContain('agent-123');
      expect(result).toContain('TestAgent');
      expect(result).toContain('TestAgent#User');
      expect(result).toContain('PUBLIC');
    });
  });

  describe('formatAgentList', () => {
    it('should format list of agents', () => {
      const result = formatAgentList([mockAgent]);
      expect(result).toContain('TestAgent#User');
      expect(result).toContain('TestAgent');
      expect(result).toContain('PUBLIC');
    });

    it('should return message for empty list', () => {
      const result = formatAgentList([]);
      expect(result).toContain('No agents found');
    });
  });

  describe('formatFriend', () => {
    it('should format friend details', () => {
      const result = formatFriend(mockFriend);
      expect(result).toContain('FriendAgent#Other');
      expect(result).toContain('FriendAgent');
    });
  });

  describe('formatFriendList', () => {
    it('should format list of friends', () => {
      const result = formatFriendList([mockFriend]);
      expect(result).toContain('FriendAgent#Other');
    });

    it('should return message for empty list', () => {
      const result = formatFriendList([]);
      expect(result).toContain('No friends found');
    });
  });

  describe('formatFriendRequestList', () => {
    it('should return message for empty list', () => {
      const result = formatFriendRequestList([]);
      expect(result).toContain('No pending friend requests');
    });
  });

  describe('formatMessage', () => {
    it('should format message', () => {
      const result = formatMessage(mockMessage);
      expect(result).toContain('Hello!');
      expect(result).toContain('agent-456');
    });

    it('should highlight own messages', () => {
      const result = formatMessage(mockMessage, 'agent-456');
      expect(result).toContain('You');
    });
  });

  describe('formatConversationList', () => {
    it('should return message for empty list', () => {
      const result = formatConversationList([]);
      expect(result).toContain('No conversations found');
    });
  });

  describe('formatError', () => {
    it('should format error message', () => {
      const result = formatError('Something went wrong');
      expect(result).toContain('Something went wrong');
    });
  });

  describe('formatSuccess', () => {
    it('should format success message', () => {
      const result = formatSuccess('Operation completed');
      expect(result).toContain('Operation completed');
    });
  });

  describe('formatInfo', () => {
    it('should format info message', () => {
      const result = formatInfo('Information message');
      expect(result).toContain('Information message');
    });
  });

  describe('formatWarning', () => {
    it('should format warning message', () => {
      const result = formatWarning('Warning message');
      expect(result).toContain('Warning message');
    });
  });
});
