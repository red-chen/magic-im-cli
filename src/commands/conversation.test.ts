import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';

// Mock dependencies
vi.mock('../utils/api.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../utils/config.js', () => ({
  getAgentId: vi.fn(),
}));

vi.mock('../utils/ui.js', () => ({
  UI: {
    error: (msg: string) => `[ERROR] ${msg}`,
    success: (msg: string) => `[SUCCESS] ${msg}`,
    info: (msg: string) => `[INFO] ${msg}`,
    println: vi.fn(),
  },
  spinner: vi.fn(() => vi.fn()),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

import { apiClient } from '../utils/api.js';
import { getAgentId } from '../utils/config.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import conversationCommand, { conversationsCommand } from './conversation.js';

// Helper function to create mock argv
const createMockArgv = (args: Record<string, unknown>): ArgumentsCamelCase<any> => ({
  ...args,
  _: (args._ as string[]) || [],
  $0: 'magic-im',
});

describe('conversation command', () => {
  const originalProcessExit = process.exit;
  const originalStderrWrite = process.stderr.write;
  const originalStdoutWrite = process.stdout.write;
  let exitCode: number | null = null;
  let stderrOutput: string = '';
  let stdoutOutput: string = '';

  beforeEach(() => {
    vi.clearAllMocks();
    exitCode = null;
    stderrOutput = '';
    stdoutOutput = '';

    // Mock process.exit
    process.exit = vi.fn((code?: number) => {
      exitCode = code ?? 0;
      throw new Error(`Process exit with code ${code}`);
    }) as never;

    // Mock process.stderr.write
    process.stderr.write = vi.fn((msg: string | Uint8Array) => {
      stderrOutput += msg.toString();
      return true;
    }) as never;

    // Mock process.stdout.write
    process.stdout.write = vi.fn((msg: string | Uint8Array) => {
      stdoutOutput += msg.toString();
      return true;
    }) as never;
  });

  afterEach(() => {
    process.exit = originalProcessExit;
    process.stderr.write = originalStderrWrite;
    process.stdout.write = originalStdoutWrite;
  });

  describe('list conversations (no action)', () => {
    it('should list conversations successfully', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          agent1_id: 'agent-1',
          agent2_id: 'agent-2',
          created_at: '2026-03-23T01:00:00Z',
          updated_at: '2026-03-23T01:00:00Z',
          last_message_content: 'Hello',
          last_message_at: '2026-03-23T01:00:00Z',
          other_agent_id: 'agent-2',
          other_agent_name: 'yuanhao',
          other_agent_full_name: 'yuanhao#yuanhao',
        },
        {
          id: 'conv-2',
          agent1_id: 'agent-1',
          agent2_id: 'agent-3',
          created_at: '2026-03-23T02:00:00Z',
          updated_at: '2026-03-23T02:00:00Z',
          last_message_content: 'Hi there',
          last_message_at: '2026-03-23T02:00:00Z',
          other_agent_id: 'agent-3',
          other_agent_name: 'service',
          other_agent_full_name: 'service#yuanhao',
        },
      ];

      vi.mocked(getAgentId).mockReturnValue('agent-1');
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: mockConversations,
      });

      const handler = conversationCommand.handler as Function;
      await handler(createMockArgv({ agent: 'agent-1', limit: 100 }));

      expect(apiClient.get).toHaveBeenCalledWith('/messages/conversations?agent_id=agent-1&limit=100');
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Found 2 conversation(s)'));
    });

    it('should show empty message when no conversations', async () => {
      vi.mocked(getAgentId).mockReturnValue('agent-1');
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: [],
      });

      const handler = conversationCommand.handler as Function;
      await handler(createMockArgv({ agent: 'agent-1', limit: 100 }));

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('No conversations yet'));
    });

    it('should exit with error when agent ID is not provided', async () => {
      vi.mocked(getAgentId).mockReturnValue(undefined);

      const handler = conversationCommand.handler as Function;
      
      await expect(handler(createMockArgv({}))).rejects.toThrow('Process exit with code 1');
      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Agent ID required');
    });

    it('should handle API error', async () => {
      vi.mocked(getAgentId).mockReturnValue('agent-1');
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      const handler = conversationCommand.handler as Function;
      
      await expect(handler(createMockArgv({ agent: 'agent-1', limit: 100 }))).rejects.toThrow('Process exit with code 1');
      expect(exitCode).toBe(1);
      // Error message is wrapped by the catch block
      expect(stderrOutput).toContain('[ERROR]');
    });
  });

  describe('show conversation with agent', () => {
    it('should show conversation messages successfully', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: 'agent-2',
          sender_type: 'agent',
          content: '你在干什么？',
          created_at: '2026-03-23T00:00:00Z',
        },
        {
          id: 'msg-2',
          conversation_id: 'conv-1',
          sender_id: 'agent-1',
          sender_type: 'agent',
          content: '我在看书',
          created_at: '2026-03-23T00:01:00Z',
        },
      ];

      vi.mocked(getAgentId).mockReturnValue('agent-1');
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          messages: mockMessages,
          conversationId: 'conv-1',
          otherAgentId: 'agent-2',
        },
      });

      const handler = conversationCommand.handler as Function;
      await handler(createMockArgv({ 
        agent: 'agent-1', 
        action: 'yuanhao#yuanhao',
      }));

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/messages/conversations/messages?agent_id=agent-1')
      );
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Conversation with yuanhao#yuanhao'));
    });

    it('should show error when agent not found', async () => {
      vi.mocked(getAgentId).mockReturnValue('agent-1');
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          messages: [],
          conversationId: null,
          otherAgentId: null,
        },
      });

      const handler = conversationCommand.handler as Function;
      
      await expect(handler(createMockArgv({ 
        agent: 'agent-1', 
        action: 'unknown#agent',
      }))).rejects.toThrow('Process exit with code 1');
      
      expect(exitCode).toBe(1);
      // Error message is wrapped by the catch block
      expect(stderrOutput).toContain('[ERROR]');
    });

    it('should show empty message when no messages', async () => {
      vi.mocked(getAgentId).mockReturnValue('agent-1');
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: {
          messages: [],
          conversationId: 'conv-1',
          otherAgentId: 'agent-2',
        },
      });

      const handler = conversationCommand.handler as Function;
      await handler(createMockArgv({ 
        agent: 'agent-1', 
        action: 'yuanhao#yuanhao',
      }));

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('No messages yet'));
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Conversation with yuanhao#yuanhao'));
    });
  });

  describe('send message', () => {
    it('should send message successfully with full name', async () => {
      vi.mocked(getAgentId).mockReturnValue('agent-1');
      vi.mocked(apiClient.post).mockResolvedValue({
        success: true,
        data: { message: { id: 'msg-1' } },
      });

      const handler = conversationCommand.handler as Function;
      await handler(createMockArgv({ 
        agent: 'agent-1', 
        action: 'send',
        message: 'hello world',
        to: 'yuanhao#yuanhao',
      }));

      expect(apiClient.post).toHaveBeenCalledWith('/messages', {
        agent_id: 'agent-1',
        receiver_id: undefined,
        receiver_full_name: 'yuanhao#yuanhao',
        content: 'hello world',
      });
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Message sent'));
    });

    it('should send message successfully with agent ID', async () => {
      vi.mocked(getAgentId).mockReturnValue('agent-1');
      vi.mocked(apiClient.post).mockResolvedValue({
        success: true,
        data: { message: { id: 'msg-1' } },
      });

      const handler = conversationCommand.handler as Function;
      await handler(createMockArgv({ 
        agent: 'agent-1', 
        action: 'send',
        message: 'hello',
        to: 'agent-2',
      }));

      expect(apiClient.post).toHaveBeenCalledWith('/messages', {
        agent_id: 'agent-1',
        receiver_id: 'agent-2',
        receiver_full_name: undefined,
        content: 'hello',
      });
    });

    it('should exit with error when message content is missing', async () => {
      vi.mocked(getAgentId).mockReturnValue('agent-1');

      const handler = conversationCommand.handler as Function;
      
      await expect(handler(createMockArgv({ 
        agent: 'agent-1', 
        action: 'send',
        to: 'yuanhao#yuanhao',
      }))).rejects.toThrow('Process exit with code 1');
      
      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Message content required');
    });

    it('should exit with error when --to option is missing', async () => {
      vi.mocked(getAgentId).mockReturnValue('agent-1');

      const handler = conversationCommand.handler as Function;
      
      await expect(handler(createMockArgv({ 
        agent: 'agent-1', 
        action: 'send',
        _: ['conversation', 'send', 'hello'] 
      }))).rejects.toThrow('Process exit with code 1');
      
      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('[ERROR]');
    });

    it('should handle API error when sending message', async () => {
      vi.mocked(getAgentId).mockReturnValue('agent-1');
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'));

      const handler = conversationCommand.handler as Function;
      
      await expect(handler(createMockArgv({ 
        agent: 'agent-1', 
        action: 'send',
        message: 'hello',
        to: 'yuanhao#yuanhao',
      }))).rejects.toThrow('Process exit with code 1');
      
      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('[ERROR]');
    });
  });

  describe('conversations alias command', () => {
    it('should list conversations using alias', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          agent1_id: 'agent-1',
          agent2_id: 'agent-2',
          created_at: '2026-03-23T01:00:00Z',
          updated_at: '2026-03-23T01:00:00Z',
          last_message_content: 'Hello',
          last_message_at: '2026-03-23T01:00:00Z',
          other_agent_id: 'agent-2',
          other_agent_name: 'yuanhao',
          other_agent_full_name: 'yuanhao#yuanhao',
        },
      ];

      vi.mocked(getAgentId).mockReturnValue('agent-1');
      vi.mocked(apiClient.get).mockResolvedValue({
        success: true,
        data: mockConversations,
      });

      const handler = conversationsCommand.handler as Function;
      await handler(createMockArgv({ agent: 'agent-1', limit: 100 }));

      expect(apiClient.get).toHaveBeenCalledWith('/messages/conversations?agent_id=agent-1&limit=100');
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Found 1 conversation(s)'));
    });

    it('should exit with error when agent ID is not provided for alias', async () => {
      vi.mocked(getAgentId).mockReturnValue(undefined);

      const handler = conversationsCommand.handler as Function;
      
      await expect(handler(createMockArgv({}))).rejects.toThrow('Process exit with code 1');
      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Agent ID required');
    });
  });
});
