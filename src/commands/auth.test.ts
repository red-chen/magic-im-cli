import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../utils/api.js', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../utils/config.js', () => ({
  setToken: vi.fn(),
  clearToken: vi.fn(),
  setAgentToken: vi.fn(),
  clearAgentToken: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock('../utils/ui.js', () => ({
  UI: {
    println: vi.fn(),
    success: (t: string) => t,
    info: (t: string) => t,
    error: (t: string) => t,
  },
  styles: {
    success: (t: string) => t,
    error: (t: string) => t,
  },
  spinner: vi.fn(() => vi.fn()),
}));

async function runCommand(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { default: yargsLib } = await import('yargs');
  const { hideBin } = await import('yargs/helpers');
  const authMod = await import('./auth.js');

  const stdout: string[] = [];
  const stderr: string[] = [];
  let exitCode = 0;

  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((s: unknown) => {
    stdout.push(String(s));
    return true;
  });
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((s: unknown) => {
    stderr.push(String(s));
    return true;
  });
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    exitCode = typeof code === 'number' ? code : 0;
    throw new Error(`process.exit(${code})`);
  });

  try {
    const originalArgv = process.argv;
    process.argv = ['node', 'magic-im', ...args];
    await yargsLib(hideBin(process.argv))
      .command(authMod.default)
      .exitProcess(false)
      .fail(() => {})
      .parseAsync();
    process.argv = originalArgv;
  } catch {
    // process.exit throws in tests
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { stdout: stdout.join(''), stderr: stderr.join(''), exitCode };
}

describe('auth commands (yargs)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sign-up', () => {
    it('should fail when --email is missing', async () => {
      const { apiClient } = await import('../utils/api.js');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'auth', 'sign-up', '--nickname', 'Tom', '--password', 'pass'];
      try {
        await yargsLib(hideBin(process.argv))
          .command(authMod.default)
          .exitProcess(false)
          .parseAsync();
      } catch {
        // expected
      }
      process.argv = [];

      // demandOption should prevent reaching apiClient.post
      expect(apiClient.post).not.toHaveBeenCalled();

      exitSpy.mockRestore();
      stderrSpy.mockRestore();
    });

    it('should fail when --nickname is missing', async () => {
      const { apiClient } = await import('../utils/api.js');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'auth', 'sign-up', '--email', 'a@b.com', '--password', 'pass'];
      try {
        await yargsLib(hideBin(process.argv))
          .command(authMod.default)
          .exitProcess(false)
          .parseAsync();
      } catch {
        // expected
      }
      process.argv = [];

      expect(apiClient.post).not.toHaveBeenCalled();
      exitSpy.mockRestore();
      stderrSpy.mockRestore();
    });

    it('should fail when --password is missing', async () => {
      const { apiClient } = await import('../utils/api.js');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'auth', 'sign-up', '--email', 'a@b.com', '--nickname', 'Tom'];
      try {
        await yargsLib(hideBin(process.argv))
          .command(authMod.default)
          .exitProcess(false)
          .parseAsync();
      } catch {
        // expected
      }
      process.argv = [];

      expect(apiClient.post).not.toHaveBeenCalled();
      exitSpy.mockRestore();
      stderrSpy.mockRestore();
    });

    it('should call apiClient.post with correct params when all options provided', async () => {
      const { apiClient } = await import('../utils/api.js');
      const { setToken } = await import('../utils/config.js');

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        data: { user: { id: '1', email: 'a@b.com', nickname: 'Tom', created_at: '' }, token: 'tok' },
      });

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'auth', 'sign-up', '-e', 'a@b.com', '-n', 'Tom', '-p', 'pass'];
      await yargsLib(hideBin(process.argv))
        .command(authMod.default)
        .exitProcess(false)
        .parseAsync();
      process.argv = [];

      expect(apiClient.post).toHaveBeenCalledWith('/auth/sign-up', {
        email: 'a@b.com',
        nickname: 'Tom',
        password: 'pass',
      });
      expect(setToken).toHaveBeenCalledWith('tok');
    });
  });

  describe('sign-in', () => {
    it('should fail when --email is missing', async () => {
      const { apiClient } = await import('../utils/api.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'auth', 'sign-in', '--password', 'pass'];
      try {
        await yargsLib(hideBin(process.argv))
          .command(authMod.default)
          .exitProcess(false)
          .parseAsync();
      } catch {}
      process.argv = [];

      expect(apiClient.post).not.toHaveBeenCalled();
      exitSpy.mockRestore();
      stderrSpy.mockRestore();
    });

    it('should call apiClient.post when all options provided', async () => {
      const { apiClient } = await import('../utils/api.js');
      const { setToken } = await import('../utils/config.js');

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        data: { user: { id: '1', email: 'a@b.com', nickname: 'Tom', created_at: '' }, token: 'tok2' },
      });

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'auth', 'sign-in', '-e', 'a@b.com', '-p', 'pass'];
      await yargsLib(hideBin(process.argv))
        .command(authMod.default)
        .exitProcess(false)
        .parseAsync();
      process.argv = [];

      expect(apiClient.post).toHaveBeenCalledWith('/auth/sign-in', { email: 'a@b.com', password: 'pass' });
      expect(setToken).toHaveBeenCalledWith('tok2');
    });
  });

  describe('status', () => {
    it('should show authenticated when token exists', async () => {
      const { getToken } = await import('../utils/config.js');
      const { UI } = await import('../utils/ui.js');
      vi.mocked(getToken).mockReturnValue('some-token');

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'auth', 'status'];
      await yargsLib(hideBin(process.argv))
        .command(authMod.default)
        .exitProcess(false)
        .parseAsync();
      process.argv = [];

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('authenticated'));
    });

    it('should show not authenticated when no token', async () => {
      const { getToken } = await import('../utils/config.js');
      const { UI } = await import('../utils/ui.js');
      vi.mocked(getToken).mockReturnValue(undefined);

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'auth', 'status'];
      await yargsLib(hideBin(process.argv))
        .command(authMod.default)
        .exitProcess(false)
        .parseAsync();
      process.argv = [];

      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('not authenticated'));
    });
  });

  describe('signin (shortcut command)', () => {
    it('should fail when --mail is missing', async () => {
      const { apiClient } = await import('../utils/api.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'signin', '--password', 'pass'];
      try {
        await yargsLib(hideBin(process.argv))
          .command(authMod.signinShortcut)
          .exitProcess(false)
          .parseAsync();
      } catch {}
      process.argv = [];

      expect(apiClient.post).not.toHaveBeenCalled();
      exitSpy.mockRestore();
      stderrSpy.mockRestore();
    });

    it('should fail when --password is missing', async () => {
      const { apiClient } = await import('../utils/api.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'signin', '--mail', 'a@b.com'];
      try {
        await yargsLib(hideBin(process.argv))
          .command(authMod.signinShortcut)
          .exitProcess(false)
          .parseAsync();
      } catch {}
      process.argv = [];

      expect(apiClient.post).not.toHaveBeenCalled();
      exitSpy.mockRestore();
      stderrSpy.mockRestore();
    });

    it('should call apiClient.post with correct params when all options provided', async () => {
      const { apiClient } = await import('../utils/api.js');
      const { setToken } = await import('../utils/config.js');

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        data: { user: { id: '1', email: 'a@b.com', nickname: 'Tom', created_at: '' }, token: 'tok3' },
      });

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'signin', '--mail', 'a@b.com', '--password', 'pass'];
      await yargsLib(hideBin(process.argv))
        .command(authMod.signinShortcut)
        .exitProcess(false)
        .parseAsync();
      process.argv = [];

      expect(apiClient.post).toHaveBeenCalledWith('/auth/sign-in', { email: 'a@b.com', password: 'pass' });
      expect(setToken).toHaveBeenCalledWith('tok3');
    });

    it('should handle API error gracefully', async () => {
      const { apiClient } = await import('../utils/api.js');
      const { UI } = await import('../utils/ui.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      const uiSpy = vi.spyOn(UI, 'println').mockImplementation(() => true);

      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Invalid credentials'));

      const { default: yargsLib } = await import('yargs');
      const { hideBin } = await import('yargs/helpers');
      const authMod = await import('./auth.js');

      process.argv = ['node', 'magic-im', 'signin', '--mail', 'a@b.com', '--password', 'wrong'];
      try {
        await yargsLib(hideBin(process.argv))
          .command(authMod.signinShortcut)
          .exitProcess(false)
          .parseAsync();
      } catch {}
      process.argv = [];

      expect(apiClient.post).toHaveBeenCalledWith('/auth/sign-in', { email: 'a@b.com', password: 'wrong' });
      expect(uiSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid credentials'));
      expect(exitSpy).not.toHaveBeenCalled(); // Should not call process.exit
      exitSpy.mockRestore();
      uiSpy.mockRestore();
    });
  });
});
