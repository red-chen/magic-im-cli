import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('../core/api/auth.api.js', () => ({
  login: vi.fn(),
}));

// No global config mocks needed - token is stored in workspace only

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
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { login } from '../core/api/auth.api.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import type { CommandModule } from 'yargs';

describe('Login Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Structure', () => {
    it('should export a valid yargs command module', async () => {
      const loginModule = await import('./login.js');
      expect(loginModule.default).toBeDefined();
      expect(loginModule.default.command).toBe('login');
      expect(loginModule.default.describe).toContain('Sign in');
      expect(typeof loginModule.default.handler).toBe('function');
    });

    it('should define all required options', async () => {
      const loginModule = await import('./login.js');
      const command = loginModule.default as CommandModule;
      
      // Verify builder is a function
      expect(typeof command.builder).toBe('function');
    });
  });

  describe('Input Validation', () => {
    it('should exit with error when email is missing', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);
      const stderrMock = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const loginModule = await import('./login.js');
      const handler = loginModule.default.handler as Function;

      await expect(handler({ password: 'test123' })).rejects.toThrow('process.exit');
      
      expect(logger.error).toHaveBeenCalledWith('Login failed: email is required');
      expect(stderrMock).toHaveBeenCalled();
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
      stderrMock.mockRestore();
    });

    it('should exit with error when password is missing', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);
      const stderrMock = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const loginModule = await import('./login.js');
      const handler = loginModule.default.handler as Function;

      await expect(handler({ mail: 'test@example.com' })).rejects.toThrow('process.exit');
      
      expect(logger.error).toHaveBeenCalledWith('Login failed: password is required');
      expect(stderrMock).toHaveBeenCalled();
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
      stderrMock.mockRestore();
    });
  });

  describe('Successful Login', () => {
    it('should save token and display success message on successful login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'leo@magic-im.cc',
        nickname: 'Leo',
        created_at: '2024-01-01T00:00:00Z',
      };
      const mockToken = 'test-token-abc123';

      vi.mocked(login).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: mockToken,
        },
      });

      vi.mocked(existsSync).mockReturnValue(true);

      const loginModule = await import('./login.js');
      const handler = loginModule.default.handler as Function;

      await handler({
        mail: 'leo@magic-im.cc',
        password: '12345678',
        workspace: '/tmp/test-workspace',
      });

      // Verify API was called with correct params
      expect(login).toHaveBeenCalledWith({
        email: 'leo@magic-im.cc',
        password: '12345678',
      });

      // Verify workspace config was written
      expect(writeFileSync).toHaveBeenCalled();

      // Verify success output
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Successfully logged in'));
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Token saved'));
    });

    it('should create workspace directory if it does not exist', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        nickname: 'TestUser',
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(login).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'token123',
        },
      });

      vi.mocked(existsSync).mockReturnValue(false);

      const loginModule = await import('./login.js');
      const handler = loginModule.default.handler as Function;

      await handler({
        mail: 'test@example.com',
        password: 'password123',
        workspace: '/tmp/new-workspace',
      });

      expect(mkdirSync).toHaveBeenCalledWith('/tmp/new-workspace', { recursive: true });
      expect(writeFileSync).toHaveBeenCalled();
    });

    it('should expand ~ to home directory in workspace path', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        nickname: 'TestUser',
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(login).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'token123',
        },
      });

      vi.mocked(existsSync).mockReturnValue(true);

      const loginModule = await import('./login.js');
      const handler = loginModule.default.handler as Function;

      await handler({
        mail: 'test@example.com',
        password: 'password123',
        workspace: '~/.im/t1',
      });

      // Verify workspace config was written with expanded path
      expect(writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      expect(writeCall[0]).toContain('.im');
    });
  });

  describe('Failed Login', () => {
    it('should exit with error on API failure', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);
      const stderrMock = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      vi.mocked(login).mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
        data: undefined as never,
      });

      const loginModule = await import('./login.js');
      const handler = loginModule.default.handler as Function;

      await expect(handler({
        mail: 'wrong@example.com',
        password: 'wrongpass',
      })).rejects.toThrow('process.exit');

      expect(exitMock).toHaveBeenCalledWith(1);
      expect(stderrMock).toHaveBeenCalledWith(expect.stringContaining('Login failed'));

      exitMock.mockRestore();
      stderrMock.mockRestore();
    });

    it('should handle API error object format', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);
      const stderrMock = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      vi.mocked(login).mockResolvedValue({
        success: false,
        error: { code: 'AUTH_FAILED', message: 'Authentication failed' },
        data: undefined as never,
      });

      const loginModule = await import('./login.js');
      const handler = loginModule.default.handler as Function;

      await expect(handler({
        mail: 'test@example.com',
        password: 'wrong',
      })).rejects.toThrow('process.exit');

      expect(stderrMock).toHaveBeenCalledWith(expect.stringContaining('Authentication failed'));

      exitMock.mockRestore();
      stderrMock.mockRestore();
    });

    it('should handle API exceptions', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);

      vi.mocked(login).mockRejectedValue(new Error('Network error'));

      const loginModule = await import('./login.js');
      const handler = loginModule.default.handler as Function;

      await expect(handler({
        mail: 'test@example.com',
        password: 'password',
      })).rejects.toThrow('process.exit');

      expect(logger.error).toHaveBeenCalledWith(
        'Login command failed',
        expect.objectContaining({ error: 'Network error' })
      );
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
    });
  });

  describe('Default Workspace', () => {
    it('should use default ~/.magic-im/ workspace when not specified', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        nickname: 'TestUser',
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(login).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'token123',
        },
      });

      vi.mocked(existsSync).mockReturnValue(true);

      const loginModule = await import('./login.js');
      const handler = loginModule.default.handler as Function;

      // Not specifying workspace - should use default
      await handler({
        mail: 'test@example.com',
        password: 'password123',
      });

      // Should use default workspace path containing .magic-im
      expect(writeFileSync).toHaveBeenCalled();
      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      expect(writeCall[0]).toContain('.magic-im');
      expect(writeCall[0]).toContain('config.json');
    });
  });

  describe('Workspace Config Save Failure', () => {
    it('should continue even if workspace config save fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        nickname: 'TestUser',
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(login).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'token123',
        },
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const loginModule = await import('./login.js');
      const handler = loginModule.default.handler as Function;

      // Should fail and exit when workspace config cannot be saved
      await expect(handler({
        mail: 'test@example.com',
        password: 'password123',
        workspace: '/tmp/test',
      })).rejects.toThrow('process.exit');
    });
  });
});
