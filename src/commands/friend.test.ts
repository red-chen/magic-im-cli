import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CommandModule, ArgumentsCamelCase } from 'yargs';

// Mock dependencies
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('../core/api/friend.api.js', () => ({
  listFriends: vi.fn(),
}));

vi.mock('../core/api/agent.api.js', () => ({
  listAgents: vi.fn(),
}));

vi.mock('../core/config/config.js', () => ({
  setToken: vi.fn(),
}));

vi.mock('../utils/ui.js', () => ({
  UI: {
    error: (msg: string) => `[ERROR] ${msg}`,
    success: (msg: string) => `[SUCCESS] ${msg}`,
    info: (msg: string) => `[INFO] ${msg}`,
    warning: (msg: string) => `[WARNING] ${msg}`,
    println: vi.fn(),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

import { existsSync, readFileSync } from 'fs';
import { listFriends } from '../core/api/friend.api.js';
import { listAgents } from '../core/api/agent.api.js';
import { setToken } from '../core/config/config.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import friendCommand, { friendsCommand } from './friend.js';

// Helper function to create mock argv with required yargs properties
const createMockArgv = (args: Record<string, unknown>): ArgumentsCamelCase<any> => ({
  ...args,
  _: [],
  $0: 'magic-im',
});

describe('friend list command', () => {
  const originalProcessExit = process.exit;
  const originalStderrWrite = process.stderr.write;
  let exitCode: number | null = null;
  let stderrOutput: string = '';

  beforeEach(() => {
    vi.clearAllMocks();
    exitCode = null;
    stderrOutput = '';
    
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
  });

  afterEach(() => {
    process.exit = originalProcessExit;
    process.stderr.write = originalStderrWrite;
  });

  // Get the list subcommand handler
  const getListHandler = () => {
    const builder = friendCommand.builder as (yargs: any) => any;
    let listCommand: CommandModule<{}, any> | undefined;
    
    const mockYargs = {
      command: (cmd: CommandModule<{}, any>) => {
        if (cmd.command?.toString().startsWith('list')) {
          listCommand = cmd;
        }
        return mockYargs;
      },
      demandCommand: () => mockYargs,
    };
    
    builder(mockYargs);
    return listCommand?.handler;
  };

  describe('positive tests', () => {
    it('should list friends with current agent from config', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'friend-1',
            agent_id: 'agent-123',
            friend_agent_id: 'agent-456',
            friend_name: 'buxiao',
            friend_full_name: 'buxiao#buxiao',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'friend-2',
            agent_id: 'agent-123',
            friend_agent_id: 'agent-789',
            friend_name: 'profile',
            friend_full_name: 'profile#yuanhao',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(setToken).toHaveBeenCalledWith('test-token');
      expect(listFriends).toHaveBeenCalledWith('agent-123');
      expect(UI.println).toHaveBeenCalledWith('  - buxiao#buxiao');
      expect(UI.println).toHaveBeenCalledWith('  - profile#yuanhao');
      expect(logger.info).toHaveBeenCalledWith('Friends listed successfully', { count: 2 });
    });

    it('should list friends with specified agent ID', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'friend-1',
            agent_id: 'agent-999',
            friend_agent_id: 'agent-456',
            friend_name: 'helper',
            friend_full_name: 'helper#alice',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
        agent: 'agent-999',
      }));

      expect(listFriends).toHaveBeenCalledWith('agent-999');
      expect(UI.println).toHaveBeenCalledWith('  - helper#alice');
    });

    it('should show warning when no friends found', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(UI.println).toHaveBeenCalledWith('[WARNING] No friends found');
      expect(logger.info).toHaveBeenCalledWith('Friends listed successfully', { count: 0 });
    });

    it('friends shorthand command should work same as friend list', async () => {
      // Test that friendsCommand has the same handler as friend list
      expect(friendsCommand.command).toBe('friends');
      expect(friendsCommand.describe).toContain('shorthand');
    });
  });

  describe('error handling tests', () => {
    it('should fail when not logged in (no config file)', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(false);

      await expect(handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Not logged in');
    });

    it('should fail when token not found in config', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));

      await expect(handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Token not found');
    });

    it('should use default agent when no current agent specified', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        // No currentAgent
      }));
      vi.mocked(listAgents).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'default-agent-123',
            user_id: 'user-123',
            name: 'default',
            full_name: 'default#user',
            description: '',
            visibility: 'PRIVATE',
            is_default: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'friend-1',
            agent_id: 'default-agent-123',
            friend_agent_id: 'agent-456',
            friend_name: 'buxiao',
            friend_full_name: 'buxiao#buxiao',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(listAgents).toHaveBeenCalled();
      expect(listFriends).toHaveBeenCalledWith('default-agent-123');
      expect(UI.println).toHaveBeenCalledWith('  - buxiao#buxiao');
    });

    it('should use first agent when no default agent exists', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        // No currentAgent
      }));
      vi.mocked(listAgents).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'first-agent-123',
            user_id: 'user-123',
            name: 'first',
            full_name: 'first#user',
            description: '',
            visibility: 'PRIVATE',
            is_default: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'second-agent-456',
            user_id: 'user-123',
            name: 'second',
            full_name: 'second#user',
            description: '',
            visibility: 'PRIVATE',
            is_default: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(listAgents).toHaveBeenCalled();
      expect(listFriends).toHaveBeenCalledWith('first-agent-123');
    });

    it('should fail when no agents exist for user', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        // No currentAgent
      }));
      vi.mocked(listAgents).mockResolvedValue({
        success: true,
        data: [],
      });

      await expect(handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('No agents found');
    });

    it('should fail when config file is invalid JSON', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('invalid json');

      await expect(handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Failed to read workspace config');
    });

    it('should fail when API returns error', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: false,
        data: null as any,
        error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
      });

      await expect(handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Agent not found');
    });

    it('should fail when API throws error', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockRejectedValue(new Error('Network error'));

      await expect(handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Network error');
    });
  });

  describe('boundary tests', () => {
    it('should handle friend with special characters in name', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'friend-1',
            agent_id: 'agent-123',
            friend_agent_id: 'agent-456',
            friend_name: 'my-agent_v2',
            friend_full_name: 'my-agent_v2#user-123',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(UI.println).toHaveBeenCalledWith('  - my-agent_v2#user-123');
    });

    it('should expand ~ in workspace path', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [],
      });

      await handler(createMockArgv({
        workspace: '~/.magic-im',
      }));

      // Should have expanded ~ and checked the expanded path
      expect(existsSync).toHaveBeenCalled();
    });

    it('should use default workspace if not provided', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [],
      });

      await handler(createMockArgv({
        // workspace not provided
      }));

      // Should use default workspace path
      expect(existsSync).toHaveBeenCalled();
      expect(listFriends).toHaveBeenCalled();
    });

    it('should handle single friend in list', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'friend-1',
            agent_id: 'agent-123',
            friend_agent_id: 'agent-456',
            friend_name: 'solo',
            friend_full_name: 'solo#user',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(UI.println).toHaveBeenCalledTimes(1);
      expect(UI.println).toHaveBeenCalledWith('  - solo#user');
    });

    it('should handle large friend list', async () => {
      const handler = getListHandler();
      if (!handler) throw new Error('Handler not found');

      const largeFriendList = Array.from({ length: 100 }, (_, i) => ({
        id: `friend-${i}`,
        agent_id: 'agent-123',
        friend_agent_id: `agent-${i + 1000}`,
        friend_name: `friend${i}`,
        friend_full_name: `friend${i}#user${i}`,
        created_at: '2024-01-01T00:00:00Z',
      }));

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: largeFriendList,
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(UI.println).toHaveBeenCalledTimes(100);
      expect(logger.info).toHaveBeenCalledWith('Friends listed successfully', { count: 100 });
    });
  });
});
