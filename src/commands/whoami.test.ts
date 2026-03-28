import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('../utils/ui.js', () => ({
  UI: {
    println: vi.fn(),
    error: (t: string) => `ERROR: ${t}`,
    success: (t: string) => `SUCCESS: ${t}`,
    info: (t: string) => `INFO: ${t}`,
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('../core/api/agent.api.js', () => ({
  listAgents: vi.fn(),
}));

vi.mock('../core/config/config.js', () => ({
  setToken: vi.fn(),
}));

import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync } from 'fs';
import { listAgents } from '../core/api/agent.api.js';
import type { CommandModule } from 'yargs';

describe('Whoami Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Structure', () => {
    it('should export a valid yargs command module', async () => {
      const whoamiModule = await import('./whoami.js');
      expect(whoamiModule.default).toBeDefined();
      expect(whoamiModule.default.command).toBe('whoami');
      expect(whoamiModule.default.describe).toContain('logged-in');
      expect(typeof whoamiModule.default.handler).toBe('function');
    });

    it('should define workspace option', async () => {
      const whoamiModule = await import('./whoami.js');
      const command = whoamiModule.default as CommandModule;
      
      // Verify builder is a function
      expect(typeof command.builder).toBe('function');
    });
  });

  describe('Successful Whoami', () => {
    it('should display user info when logged in', async () => {
      const mockConfig = {
        email: 'leo@magic-im.cc',
        token: 'test-token-123',
        userId: 'user-123',
        nickname: 'Leo',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await handler({ workspace: '/tmp/test-workspace' });

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Logged in as Leo'));
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('user-123'));
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('/tmp/test-workspace'));
      expect(logger.info).toHaveBeenCalledWith('Whoami successful', expect.any(Object));
    });

    it('should use default workspace when not specified', async () => {
      const mockConfig = {
        email: 'test@example.com',
        token: 'token123',
        userId: 'user-456',
        nickname: 'TestUser',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await handler({});

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('TestUser'));
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('.magic-im'));
    });

    it('should expand ~ to home directory in workspace path', async () => {
      const mockConfig = {
        email: 'test@example.com',
        token: 'token123',
        userId: 'user-789',
        nickname: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await handler({ workspace: '~/.im/t1' });

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('.im'));
    });

    it('should display default agent when no current agent is set', async () => {
      const mockConfig = {
        email: 'leo1@magic-im.cc',
        token: 'test-token',
        userId: 'user-123',
        nickname: 'Leo1',
        createdAt: '2024-01-01T00:00:00Z',
        // No currentAgent
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));
      vi.mocked(listAgents).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'agent-123',
            user_id: 'user-123',
            name: 'Leo1',
            full_name: 'Leo1#Leo1',
            description: '',
            visibility: 'PRIVATE',
            is_default: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await handler({ workspace: '/tmp/test-workspace' });

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Leo1#Leo1'));
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Leo1'));
    });

    it('should display first agent when no default agent exists', async () => {
      const mockConfig = {
        email: 'test@example.com',
        token: 'test-token',
        userId: 'user-123',
        nickname: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));
      vi.mocked(listAgents).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'agent-456',
            user_id: 'user-123',
            name: 'coding',
            full_name: 'coding#test',
            description: '',
            visibility: 'PRIVATE',
            is_default: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await handler({ workspace: '/tmp/test-workspace' });

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('coding#test'));
    });

    it('should display current agent from config when set', async () => {
      const mockConfig = {
        email: 'test@example.com',
        token: 'test-token',
        userId: 'user-123',
        nickname: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
        currentAgent: {
          id: 'agent-789',
          name: 'switched',
          full_name: 'switched#test',
        },
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await handler({ workspace: '/tmp/test-workspace' });

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('switched#test'));
      // Should not call listAgents when currentAgent is set
      expect(listAgents).not.toHaveBeenCalled();
    });

    it('should show none selected when no agents exist', async () => {
      const mockConfig = {
        email: 'test@example.com',
        token: 'test-token',
        userId: 'user-123',
        nickname: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));
      vi.mocked(listAgents).mockResolvedValue({
        success: true,
        data: [],
      });

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await handler({ workspace: '/tmp/test-workspace' });

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('(none selected)'));
    });

    it('should show none selected when listAgents API fails', async () => {
      const mockConfig = {
        email: 'test@example.com',
        token: 'test-token',
        userId: 'user-123',
        nickname: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));
      vi.mocked(listAgents).mockRejectedValue(new Error('Network error'));

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await handler({ workspace: '/tmp/test-workspace' });

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('(none selected)'));
    });
  });

  describe('Not Logged In', () => {
    it('should exit with error when config file does not exist', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);
      const stderrMock = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      vi.mocked(existsSync).mockReturnValue(false);

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await expect(handler({ workspace: '/tmp/not-exist' })).rejects.toThrow('process.exit');

      expect(logger.error).toHaveBeenCalledWith('No login session found', expect.any(Object));
      expect(stderrMock).toHaveBeenCalledWith(expect.stringContaining('Not logged in'));
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
      stderrMock.mockRestore();
    });
  });

  describe('Invalid Config', () => {
    it('should exit with error when config is invalid JSON', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('invalid json');

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await expect(handler({ workspace: '/tmp/test' })).rejects.toThrow('process.exit');

      expect(logger.error).toHaveBeenCalledWith('Failed to read workspace config', expect.any(Object));
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
    });

    it('should exit with error when config is missing required fields', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ token: 'only-token' }));

      const whoamiModule = await import('./whoami.js');
      const handler = whoamiModule.default.handler as Function;

      await expect(handler({ workspace: '/tmp/test' })).rejects.toThrow('process.exit');

      expect(logger.error).toHaveBeenCalledWith('Invalid workspace config', expect.any(Object));
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
    });
  });
});
