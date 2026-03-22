import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const TEST_LOG_DIR = join(homedir(), '.magic-im');
const TEST_LOG_FILE = join(TEST_LOG_DIR, 'trace.log');

// Mock dependencies
vi.mock('../utils/api.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../utils/ui.js', () => ({
  UI: {
    println: vi.fn(),
  },
  spinner: vi.fn(() => vi.fn()),
}));

vi.mock('../utils/format.js', () => ({
  formatSuccess: (t: string) => t,
  formatError: (t: string) => t,
  formatAgentList: () => '',
  formatUserList: () => '',
}));

// Helper to clean up log files
const cleanupLogs = () => {
  if (existsSync(TEST_LOG_DIR)) {
    try {
      const files = readdirSync(TEST_LOG_DIR);
      for (const file of files) {
        if (file.startsWith('trace.log')) {
          unlinkSync(join(TEST_LOG_DIR, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }
};

async function runSearchCommand(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number; uiOutput: string[] }> {
  const { default: yargsLib } = await import('yargs');
  const { hideBin } = await import('yargs/helpers');
  const searchMod = await import('./search.js');
  const { UI } = await import('../utils/ui.js');

  const stdout: string[] = [];
  const stderr: string[] = [];
  const uiOutput: string[] = [];
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
  const uiSpy = vi.spyOn(UI, 'println').mockImplementation((s: string) => {
    uiOutput.push(s);
    return true;
  });

  try {
    const originalArgv = process.argv;
    process.argv = ['node', 'magic-im', ...args];
    await yargsLib(hideBin(process.argv))
      .command(searchMod.default)
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
    uiSpy.mockRestore();
  }

  return { stdout: stdout.join(''), stderr: stderr.join(''), exitCode, uiOutput };
}

describe('search commands error logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupLogs();
  });

  afterEach(() => {
    vi.resetModules();
    cleanupLogs();
  });

  describe('search agents', () => {
    it('should log error to file when API call fails', async () => {
      const { apiClient } = await import('../utils/api.js');
      const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
      mockGet.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await runSearchCommand(['search', 'agents', 'test']);

      // Should not call process.exit - TUI should continue running
      expect(result.exitCode).toBe(0);
      // Error should be displayed via UI.println
      expect(result.uiOutput).toContain('Unauthorized');

      // Verify log file contains the error
      if (existsSync(TEST_LOG_FILE)) {
        const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
        expect(logContent).toContain('[ERROR]');
        expect(logContent).toContain('search agents failed');
        expect(logContent).toContain('Unauthorized');
      }
    });

    it('should log error with stack trace when Error is thrown', async () => {
      const { apiClient } = await import('../utils/api.js');
      const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
      const error = new Error('Network error');
      mockGet.mockRejectedValueOnce(error);

      await runSearchCommand(['search', 'agents', 'test']);

      if (existsSync(TEST_LOG_FILE)) {
        const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
        expect(logContent).toContain('stack');
      }
    });

    it('should handle non-Error rejection', async () => {
      const { apiClient } = await import('../utils/api.js');
      const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
      mockGet.mockRejectedValueOnce('string error');

      const result = await runSearchCommand(['search', 'agents', 'test']);

      // Should not call process.exit - TUI should continue running
      expect(result.exitCode).toBe(0);
      // Error should be displayed via UI.println
      expect(result.uiOutput).toContain('Search failed');
    });

    it('should not call process.exit on error to prevent TUI crash', async () => {
      const { apiClient } = await import('../utils/api.js');
      const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
      mockGet.mockRejectedValueOnce(new Error('Unauthorized'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit should not be called');
      });

      // Should not throw
      await expect(runSearchCommand(['search', 'agents', 'test'])).resolves.not.toThrow();

      expect(exitSpy).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });
  });

  describe('search users', () => {
    it('should log error to file when API call fails', async () => {
      const { apiClient } = await import('../utils/api.js');
      const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
      mockGet.mockRejectedValueOnce(new Error('User not authenticated'));

      const result = await runSearchCommand(['search', 'users', 'test']);

      // Should not call process.exit - TUI should continue running
      expect(result.exitCode).toBe(0);
      // Error should be displayed via UI.println
      expect(result.uiOutput).toContain('User not authenticated');

      if (existsSync(TEST_LOG_FILE)) {
        const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
        expect(logContent).toContain('[ERROR]');
        expect(logContent).toContain('search users failed');
        expect(logContent).toContain('User not authenticated');
      }
    });

    it('should not call process.exit on error to prevent TUI crash', async () => {
      const { apiClient } = await import('../utils/api.js');
      const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
      mockGet.mockRejectedValueOnce(new Error('User not authenticated'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit should not be called');
      });

      // Should not throw
      await expect(runSearchCommand(['search', 'users', 'test'])).resolves.not.toThrow();

      expect(exitSpy).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });
  });

  describe('error message format', () => {
    it('should include timestamp in log entry', async () => {
      const { apiClient } = await import('../utils/api.js');
      const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
      mockGet.mockRejectedValueOnce(new Error('Test error'));

      await runSearchCommand(['search', 'agents', 'test']);

      if (existsSync(TEST_LOG_FILE)) {
        const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
        // Check for ISO timestamp format
        expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
      }
    });

    it('should include command context in log entry', async () => {
      const { apiClient } = await import('../utils/api.js');
      const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
      mockGet.mockRejectedValueOnce(new Error('API error'));

      await runSearchCommand(['search', 'agents', 'keyword']);

      if (existsSync(TEST_LOG_FILE)) {
        const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
        expect(logContent).toContain('[CLI]');
        expect(logContent).toContain('search agents failed');
      }
    });
  });
});
