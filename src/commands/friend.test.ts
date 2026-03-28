import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CommandModule, ArgumentsCamelCase } from 'yargs';

// Mock dependencies
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('../core/api/friend.api.js', () => ({
  listFriends: vi.fn(),
  sendFriendRequest: vi.fn(),
  listFriendRequests: vi.fn(),
  acceptFriendRequest: vi.fn(),
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
import { listFriends, sendFriendRequest, listFriendRequests, acceptFriendRequest } from '../core/api/friend.api.js';
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

    it('friends command should be a composite command', async () => {
      // Test that friendsCommand is a composite command showing both friends and requests
      expect(friendsCommand.command).toBe('friends');
      expect(friendsCommand.describe).toContain('friends and pending requests');
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

describe('friend add command', () => {
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

  // Get the add subcommand handler
  const getAddHandler = () => {
    const builder = friendCommand.builder as (yargs: any) => any;
    let addCommand: CommandModule<{}, any> | undefined;
    
    const mockYargs = {
      command: (cmd: CommandModule<{}, any>) => {
        if (cmd.command?.toString().startsWith('add')) {
          addCommand = cmd;
        }
        return mockYargs;
      },
      demandCommand: () => mockYargs,
    };
    
    builder(mockYargs);
    return addCommand?.handler;
  };

  describe('positive tests', () => {
    it('should send friend request with current agent', async () => {
      const handler = getAddHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(sendFriendRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'friend-1',
          agent_id: 'agent-123',
          friend_agent_id: 'agent-456',
          friend_name: 'buxiao',
          friend_full_name: 'buxiao#buxiao',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }));

      expect(setToken).toHaveBeenCalledWith('test-token');
      expect(sendFriendRequest).toHaveBeenCalledWith('agent-123', 'buxiao#buxiao');
      expect(UI.println).toHaveBeenCalledWith('[SUCCESS] Friend request sent to buxiao#buxiao');
      expect(logger.info).toHaveBeenCalledWith('Friend request sent successfully', { target: 'buxiao#buxiao' });
    });

    it('should send friend request with specified agent', async () => {
      const handler = getAddHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(sendFriendRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'friend-1',
          agent_id: 'agent-999',
          friend_agent_id: 'agent-456',
          friend_name: 'helper',
          friend_full_name: 'helper#alice',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        target: 'helper#alice',
        workspace: '/tmp/test-workspace',
        agent: 'agent-999',
      }));

      expect(sendFriendRequest).toHaveBeenCalledWith('agent-999', 'helper#alice');
      expect(UI.println).toHaveBeenCalledWith('[SUCCESS] Friend request sent to helper#alice');
    });

    it('should send friend request with default agent when no current agent', async () => {
      const handler = getAddHandler();
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
      vi.mocked(sendFriendRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'friend-1',
          agent_id: 'default-agent-123',
          friend_agent_id: 'agent-456',
          friend_name: 'buxiao',
          friend_full_name: 'buxiao#buxiao',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }));

      expect(listAgents).toHaveBeenCalled();
      expect(sendFriendRequest).toHaveBeenCalledWith('default-agent-123', 'buxiao#buxiao');
    });
  });

  describe('error handling tests', () => {
    it('should fail when not logged in', async () => {
      const handler = getAddHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(false);

      await expect(handler(createMockArgv({
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Not logged in');
    });

    it('should fail when target agent not found', async () => {
      const handler = getAddHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(sendFriendRequest).mockResolvedValue({
        success: false,
        data: null as any,
        error: { code: 'TARGET_NOT_FOUND', message: 'Target agent not found' },
      });

      await expect(handler(createMockArgv({
        target: 'nonexistent#user',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Target agent not found');
    });

    it('should fail when trying to add self as friend', async () => {
      const handler = getAddHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(sendFriendRequest).mockRejectedValue(new Error('Cannot send friend request to yourself'));

      await expect(handler(createMockArgv({
        target: 'myself#user',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Cannot send friend request to yourself');
    });

    it('should fail when no agents exist for user', async () => {
      const handler = getAddHandler();
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
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('No agents found');
    });
  });

  describe('boundary tests', () => {
    it('should handle target name with special characters', async () => {
      const handler = getAddHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(sendFriendRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'friend-1',
          agent_id: 'agent-123',
          friend_agent_id: 'agent-456',
          friend_name: 'my-agent_v2',
          friend_full_name: 'my-agent_v2#user-123',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        target: 'my-agent_v2#user-123',
        workspace: '/tmp/test-workspace',
      }));

      expect(sendFriendRequest).toHaveBeenCalledWith('agent-123', 'my-agent_v2#user-123');
    });

    it('should handle target name with numbers', async () => {
      const handler = getAddHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(sendFriendRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'friend-1',
          agent_id: 'agent-123',
          friend_agent_id: 'agent-456',
          friend_name: 'agent007',
          friend_full_name: 'agent007#user42',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        target: 'agent007#user42',
        workspace: '/tmp/test-workspace',
      }));

      expect(sendFriendRequest).toHaveBeenCalledWith('agent-123', 'agent007#user42');
    });
  });
});

describe('friend requests command', () => {
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

  // Get the requests subcommand handler
  const getRequestsHandler = () => {
    const builder = friendCommand.builder as (yargs: any) => any;
    let requestsCommand: CommandModule<{}, any> | undefined;
    
    const mockYargs = {
      command: (cmd: CommandModule<{}, any>) => {
        if (cmd.command?.toString().startsWith('requests')) {
          requestsCommand = cmd;
        }
        return mockYargs;
      },
      demandCommand: () => mockYargs,
    };
    
    builder(mockYargs);
    return requestsCommand?.handler;
  };

  describe('positive tests', () => {
    it('should list pending friend requests with current agent', async () => {
      const handler = getRequestsHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-456',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            requester_full_name: 'buxiao#buxiao',
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'request-2',
            requester_agent_id: 'agent-789',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            requester_full_name: 'helper#alice',
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(setToken).toHaveBeenCalledWith('test-token');
      expect(listFriendRequests).toHaveBeenCalledWith('agent-123');
      expect(UI.println).toHaveBeenCalledWith('  - buxiao#buxiao');
      expect(UI.println).toHaveBeenCalledWith('  - helper#alice');
      expect(logger.info).toHaveBeenCalledWith('Friend requests listed successfully', { count: 2 });
    });

    it('should list pending requests with specified agent', async () => {
      const handler = getRequestsHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-456',
            target_agent_id: 'agent-999',
            status: 'PENDING',
            requester_full_name: 'coder#bob',
            target_full_name: 'otheragent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
        agent: 'agent-999',
      }));

      expect(listFriendRequests).toHaveBeenCalledWith('agent-999');
      expect(UI.println).toHaveBeenCalledWith('  - coder#bob');
    });

    it('should show warning when no pending requests', async () => {
      const handler = getRequestsHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(UI.println).toHaveBeenCalledWith('[WARNING] No pending friend requests');
      expect(logger.info).toHaveBeenCalledWith('Friend requests listed successfully', { count: 0 });
    });

    it('should use default agent when no current agent', async () => {
      const handler = getRequestsHandler();
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
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-456',
            target_agent_id: 'default-agent-123',
            status: 'PENDING',
            requester_full_name: 'buxiao#buxiao',
            target_full_name: 'default#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(listAgents).toHaveBeenCalled();
      expect(listFriendRequests).toHaveBeenCalledWith('default-agent-123');
      expect(UI.println).toHaveBeenCalledWith('  - buxiao#buxiao');
    });
  });

  describe('error handling tests', () => {
    it('should fail when not logged in', async () => {
      const handler = getRequestsHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(false);

      await expect(handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Not logged in');
    });

    it('should fail when API returns error', async () => {
      const handler = getRequestsHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
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

    it('should fail when no agents exist for user', async () => {
      const handler = getRequestsHandler();
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
  });

  describe('boundary tests', () => {
    it('should handle request without requester_full_name', async () => {
      const handler = getRequestsHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-456',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            // No requester_full_name
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(UI.println).toHaveBeenCalledWith('  - Unknown');
    });

    it('should handle large number of requests', async () => {
      const handler = getRequestsHandler();
      if (!handler) throw new Error('Handler not found');

      const largeRequestList = Array.from({ length: 50 }, (_, i) => ({
        id: `request-${i}`,
        requester_agent_id: `agent-${i + 100}`,
        target_agent_id: 'agent-123',
        status: 'PENDING' as const,
        requester_full_name: `user${i}#nick${i}`,
        target_full_name: 'myagent#user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: largeRequestList,
      });

      await handler(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(UI.println).toHaveBeenCalledTimes(50);
      expect(logger.info).toHaveBeenCalledWith('Friend requests listed successfully', { count: 50 });
    });
  });
});

describe('friend accept command', () => {
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

  // Get the accept subcommand handler
  const getAcceptHandler = () => {
    const builder = friendCommand.builder as (yargs: any) => any;
    let acceptCommand: CommandModule<{}, any> | undefined;
    
    const mockYargs = {
      command: (cmd: CommandModule<{}, any>) => {
        if (cmd.command?.toString().startsWith('accept')) {
          acceptCommand = cmd;
        }
        return mockYargs;
      },
      demandCommand: () => mockYargs,
    };
    
    builder(mockYargs);
    return acceptCommand?.handler;
  };

  describe('positive tests', () => {
    it('should accept friend request with current agent', async () => {
      const handler = getAcceptHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-456',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            requester_full_name: 'buxiao#buxiao',
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });
      vi.mocked(acceptFriendRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'friend-1',
          agent_id: 'agent-123',
          friend_agent_id: 'agent-456',
          friend_name: 'buxiao',
          friend_full_name: 'buxiao#buxiao',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }));

      expect(setToken).toHaveBeenCalledWith('test-token');
      expect(listFriendRequests).toHaveBeenCalledWith('agent-123');
      expect(acceptFriendRequest).toHaveBeenCalledWith('request-1', 'agent-123');
      expect(UI.println).toHaveBeenCalledWith('[SUCCESS] Friend request from buxiao#buxiao accepted');
      expect(logger.info).toHaveBeenCalledWith('Friend request accepted successfully', { target: 'buxiao#buxiao' });
    });

    it('should accept friend request with specified agent', async () => {
      const handler = getAcceptHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-2',
            requester_agent_id: 'agent-789',
            target_agent_id: 'agent-999',
            status: 'PENDING',
            requester_full_name: 'helper#alice',
            target_full_name: 'otheragent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });
      vi.mocked(acceptFriendRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'friend-2',
          agent_id: 'agent-999',
          friend_agent_id: 'agent-789',
          friend_name: 'helper',
          friend_full_name: 'helper#alice',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        target: 'helper#alice',
        workspace: '/tmp/test-workspace',
        agent: 'agent-999',
      }));

      expect(listFriendRequests).toHaveBeenCalledWith('agent-999');
      expect(acceptFriendRequest).toHaveBeenCalledWith('request-2', 'agent-999');
      expect(UI.println).toHaveBeenCalledWith('[SUCCESS] Friend request from helper#alice accepted');
    });

    it('should use default agent when no current agent', async () => {
      const handler = getAcceptHandler();
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
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-456',
            target_agent_id: 'default-agent-123',
            status: 'PENDING',
            requester_full_name: 'buxiao#buxiao',
            target_full_name: 'default#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });
      vi.mocked(acceptFriendRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'friend-1',
          agent_id: 'default-agent-123',
          friend_agent_id: 'agent-456',
          friend_name: 'buxiao',
          friend_full_name: 'buxiao#buxiao',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }));

      expect(listAgents).toHaveBeenCalled();
      expect(listFriendRequests).toHaveBeenCalledWith('default-agent-123');
      expect(acceptFriendRequest).toHaveBeenCalledWith('request-1', 'default-agent-123');
    });
  });

  describe('error handling tests', () => {
    it('should fail when not logged in', async () => {
      const handler = getAcceptHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(false);

      await expect(handler(createMockArgv({
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Not logged in');
    });

    it('should fail when no matching friend request found', async () => {
      const handler = getAcceptHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-456',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            requester_full_name: 'other#user',
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await expect(handler(createMockArgv({
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('No pending friend request found from buxiao#buxiao');
    });

    it('should fail when list friend requests API returns error', async () => {
      const handler = getAcceptHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: false,
        data: null as any,
        error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
      });

      await expect(handler(createMockArgv({
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Agent not found');
    });

    it('should fail when accept friend request API returns error', async () => {
      const handler = getAcceptHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-456',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            requester_full_name: 'buxiao#buxiao',
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });
      vi.mocked(acceptFriendRequest).mockResolvedValue({
        success: false,
        data: null as any,
        error: { code: 'REQUEST_NOT_FOUND', message: 'Friend request not found or already processed' },
      });

      await expect(handler(createMockArgv({
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Friend request not found or already processed');
    });

    it('should fail when no agents exist for user', async () => {
      const handler = getAcceptHandler();
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
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('No agents found');
    });
  });

  describe('boundary tests', () => {
    it('should handle target name with special characters', async () => {
      const handler = getAcceptHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-456',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            requester_full_name: 'my-agent_v2#user-123',
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });
      vi.mocked(acceptFriendRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'friend-1',
          agent_id: 'agent-123',
          friend_agent_id: 'agent-456',
          friend_name: 'my-agent_v2',
          friend_full_name: 'my-agent_v2#user-123',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        target: 'my-agent_v2#user-123',
        workspace: '/tmp/test-workspace',
      }));

      expect(acceptFriendRequest).toHaveBeenCalledWith('request-1', 'agent-123');
    });

    it('should find correct request among multiple pending requests', async () => {
      const handler = getAcceptHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-456',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            requester_full_name: 'user1#nick1',
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'request-2',
            requester_agent_id: 'agent-789',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            requester_full_name: 'buxiao#buxiao',
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'request-3',
            requester_agent_id: 'agent-abc',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            requester_full_name: 'user3#nick3',
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });
      vi.mocked(acceptFriendRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'friend-1',
          agent_id: 'agent-123',
          friend_agent_id: 'agent-789',
          friend_name: 'buxiao',
          friend_full_name: 'buxiao#buxiao',
          created_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        target: 'buxiao#buxiao',
        workspace: '/tmp/test-workspace',
      }));

      expect(acceptFriendRequest).toHaveBeenCalledWith('request-2', 'agent-123');
      expect(UI.println).toHaveBeenCalledWith('[SUCCESS] Friend request from buxiao#buxiao accepted');
    });
  });
});

describe('friends composite command', () => {
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

  describe('positive tests', () => {
    it('should display both friends and pending requests', async () => {
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
        ],
      });
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'request-1',
            requester_agent_id: 'agent-789',
            target_agent_id: 'agent-123',
            status: 'PENDING',
            requester_full_name: 'helper#alice',
            target_full_name: 'myagent#user',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      await friendsCommand.handler!(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(listFriends).toHaveBeenCalledWith('agent-123');
      expect(listFriendRequests).toHaveBeenCalledWith('agent-123');
      expect(UI.println).toHaveBeenCalledWith('Friends:');
      expect(UI.println).toHaveBeenCalledWith('  - buxiao#buxiao');
      expect(UI.println).toHaveBeenCalledWith('');
      expect(UI.println).toHaveBeenCalledWith('Pending Requests:');
      expect(UI.println).toHaveBeenCalledWith('  - helper#alice');
    });

    it('should show (none) when no friends or requests', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [],
      });
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [],
      });

      await friendsCommand.handler!(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(UI.println).toHaveBeenCalledWith('Friends:');
      expect(UI.println).toHaveBeenCalledWith('  (none)');
      expect(UI.println).toHaveBeenCalledWith('Pending Requests:');
      expect(UI.println).toHaveBeenCalledWith('  (none)');
    });

    it('should use default agent when no current agent', async () => {
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
        data: [],
      });
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [],
      });

      await friendsCommand.handler!(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      expect(listAgents).toHaveBeenCalled();
      expect(listFriends).toHaveBeenCalledWith('default-agent-123');
      expect(listFriendRequests).toHaveBeenCalledWith('default-agent-123');
    });
  });

  describe('error handling tests', () => {
    it('should fail when not logged in', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(friendsCommand.handler!(createMockArgv({
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Not logged in');
    });

    it('should fail when listFriends API returns error', async () => {
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
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: [],
      });

      await expect(friendsCommand.handler!(createMockArgv({
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Agent not found');
    });

    it('should fail when listFriendRequests API returns error', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: [],
      });
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: false,
        data: null as any,
        error: { code: 'ERROR', message: 'Failed to fetch requests' },
      });

      await expect(friendsCommand.handler!(createMockArgv({
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Failed to fetch requests');
    });
  });

  describe('boundary tests', () => {
    it('should handle many friends and requests', async () => {
      const manyFriends = Array.from({ length: 50 }, (_, i) => ({
        id: `friend-${i}`,
        agent_id: 'agent-123',
        friend_agent_id: `agent-${i + 1000}`,
        friend_name: `friend${i}`,
        friend_full_name: `friend${i}#user${i}`,
        created_at: '2024-01-01T00:00:00Z',
      }));
      const manyRequests = Array.from({ length: 30 }, (_, i) => ({
        id: `request-${i}`,
        requester_agent_id: `agent-${i + 2000}`,
        target_agent_id: 'agent-123',
        status: 'PENDING' as const,
        requester_full_name: `requester${i}#nick${i}`,
        target_full_name: 'myagent#user',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({
        token: 'test-token',
        currentAgent: { id: 'agent-123' },
      }));
      vi.mocked(listFriends).mockResolvedValue({
        success: true,
        data: manyFriends,
      });
      vi.mocked(listFriendRequests).mockResolvedValue({
        success: true,
        data: manyRequests,
      });

      await friendsCommand.handler!(createMockArgv({
        workspace: '/tmp/test-workspace',
      }));

      // Friends: header + 50 friends + empty line + Pending Requests: header + 30 requests
      expect(UI.println).toHaveBeenCalledTimes(1 + 50 + 1 + 1 + 30);
    });
  });
});
