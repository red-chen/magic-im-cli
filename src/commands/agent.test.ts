import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CommandModule, ArgumentsCamelCase } from 'yargs';

// Mock dependencies
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('../core/api/agent.api.js', () => ({
  createAgent: vi.fn(),
}));

vi.mock('../core/config/config.js', () => ({
  setToken: vi.fn(),
}));

vi.mock('../utils/ui.js', () => ({
  UI: {
    error: (msg: string) => `[ERROR] ${msg}`,
    success: (msg: string) => `[SUCCESS] ${msg}`,
    info: (msg: string) => `[INFO] ${msg}`,
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
import { createAgent } from '../core/api/agent.api.js';
import { setToken } from '../core/config/config.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import agentCommand from './agent.js';

// Helper function to create mock argv with required yargs properties
const createMockArgv = (args: Record<string, unknown>): ArgumentsCamelCase<any> => ({
  ...args,
  _: [],
  $0: 'magic-im',
});

describe('agent create command', () => {
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

  // Get the create subcommand handler
  const getCreateHandler = () => {
    const builder = agentCommand.builder as (yargs: any) => any;
    let createCommand: CommandModule<{}, any> | undefined;
    
    const mockYargs = {
      command: (cmd: CommandModule<{}, any>) => {
        if (cmd.command?.toString().startsWith('create')) {
          createCommand = cmd;
        }
        return mockYargs;
      },
      demandCommand: () => mockYargs,
    };
    
    builder(mockYargs);
    return createCommand?.handler;
  };

  describe('positive tests', () => {
    it('should create agent with default visibility (private)', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'test-token' }));
      vi.mocked(createAgent).mockResolvedValue({
        success: true,
        data: {
          id: 'agent-123',
          user_id: 'user-123',
          name: 'working',
          full_name: 'working#testuser',
          description: '',
          visibility: 'PRIVATE',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        name: 'working',
        workspace: '/tmp/test-workspace',
      }));

      expect(setToken).toHaveBeenCalledWith('test-token');
      expect(createAgent).toHaveBeenCalledWith({
        name: 'working',
        description: undefined,
        visibility: 'PRIVATE',
      });
      expect(UI.println).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Agent created successfully', expect.any(Object));
    });

    it('should create agent with public visibility', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'test-token' }));
      vi.mocked(createAgent).mockResolvedValue({
        success: true,
        data: {
          id: 'agent-123',
          user_id: 'user-123',
          name: 'my-agent',
          full_name: 'my-agent#testuser',
          description: '',
          visibility: 'PUBLIC',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        name: 'my-agent',
        visibility: 'public',
        workspace: '/tmp/test-workspace',
      }));

      expect(createAgent).toHaveBeenCalledWith({
        name: 'my-agent',
        description: undefined,
        visibility: 'PUBLIC',
      });
    });

    it('should create agent with semi_public visibility', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'test-token' }));
      vi.mocked(createAgent).mockResolvedValue({
        success: true,
        data: {
          id: 'agent-123',
          user_id: 'user-123',
          name: 'my-agent',
          full_name: 'my-agent#testuser',
          description: '',
          visibility: 'SEMI_PUBLIC',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        name: 'my-agent',
        visibility: 'semi_public',
        workspace: '/tmp/test-workspace',
      }));

      expect(createAgent).toHaveBeenCalledWith({
        name: 'my-agent',
        description: undefined,
        visibility: 'SEMI_PUBLIC',
      });
    });

    it('should create agent with description', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'test-token' }));
      vi.mocked(createAgent).mockResolvedValue({
        success: true,
        data: {
          id: 'agent-123',
          user_id: 'user-123',
          name: 'working',
          full_name: 'working#testuser',
          description: 'A helpful assistant',
          visibility: 'PRIVATE',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        name: 'working',
        desc: 'A helpful assistant',
        workspace: '/tmp/test-workspace',
      }));

      expect(createAgent).toHaveBeenCalledWith({
        name: 'working',
        description: 'A helpful assistant',
        visibility: 'PRIVATE',
      });
    });
  });

  describe('error handling tests', () => {
    it('should fail when not logged in (no config file)', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(false);

      await expect(handler(createMockArgv({
        name: 'working',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Not logged in');
    });

    it('should fail when token not found in config', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));

      await expect(handler(createMockArgv({
        name: 'working',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Token not found');
    });

    it('should fail when config file is invalid JSON', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('invalid json');

      await expect(handler(createMockArgv({
        name: 'working',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Failed to read workspace config');
    });

    it('should fail when API returns error', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'test-token' }));
      vi.mocked(createAgent).mockResolvedValue({
        success: false,
        data: null as any,
        error: { code: 'AGENT_NAME_EXISTS', message: 'Agent name already exists for this user' },
      });

      await expect(handler(createMockArgv({
        name: 'working',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Agent name already exists');
    });

    it('should fail when API throws error', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'test-token' }));
      vi.mocked(createAgent).mockRejectedValue(new Error('Network error'));

      await expect(handler(createMockArgv({
        name: 'working',
        workspace: '/tmp/test-workspace',
      }))).rejects.toThrow();

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain('Network error');
    });
  });

  describe('boundary tests', () => {
    it('should handle empty description', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'test-token' }));
      vi.mocked(createAgent).mockResolvedValue({
        success: true,
        data: {
          id: 'agent-123',
          user_id: 'user-123',
          name: 'working',
          full_name: 'working#testuser',
          description: '',
          visibility: 'PRIVATE',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        name: 'working',
        desc: '',
        workspace: '/tmp/test-workspace',
      }));

      expect(createAgent).toHaveBeenCalledWith({
        name: 'working',
        description: '',
        visibility: 'PRIVATE',
      });
    });

    it('should handle agent name with special characters', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'test-token' }));
      vi.mocked(createAgent).mockResolvedValue({
        success: true,
        data: {
          id: 'agent-123',
          user_id: 'user-123',
          name: 'my-agent_v2',
          full_name: 'my-agent_v2#testuser',
          description: '',
          visibility: 'PRIVATE',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        name: 'my-agent_v2',
        workspace: '/tmp/test-workspace',
      }));

      expect(createAgent).toHaveBeenCalledWith({
        name: 'my-agent_v2',
        description: undefined,
        visibility: 'PRIVATE',
      });
    });

    it('should expand ~ in workspace path', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'test-token' }));
      vi.mocked(createAgent).mockResolvedValue({
        success: true,
        data: {
          id: 'agent-123',
          user_id: 'user-123',
          name: 'working',
          full_name: 'working#testuser',
          description: '',
          visibility: 'PRIVATE',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        name: 'working',
        workspace: '~/.magic-im',
      }));

      // Should have expanded ~ and checked the expanded path
      expect(existsSync).toHaveBeenCalled();
    });

    it('should use default workspace if not provided', async () => {
      const handler = getCreateHandler();
      if (!handler) throw new Error('Handler not found');

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'test-token' }));
      vi.mocked(createAgent).mockResolvedValue({
        success: true,
        data: {
          id: 'agent-123',
          user_id: 'user-123',
          name: 'working',
          full_name: 'working#testuser',
          description: '',
          visibility: 'PRIVATE',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      await handler(createMockArgv({
        name: 'working',
        // workspace not provided
      }));

      // Should use default workspace path
      expect(existsSync).toHaveBeenCalled();
      expect(createAgent).toHaveBeenCalled();
    });
  });
});
