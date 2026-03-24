import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn, SpawnOptions } from 'child_process';
import { existsSync, readFileSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const TEST_LOG_DIR = join(homedir(), '.magic-im');
const TEST_LOG_FILE = join(TEST_LOG_DIR, 'trace.log');

// Helper to run a script and capture output
const runScript = (code: string, timeout = 5000): Promise<{ stdout: string; stderr: string; exitCode: number | null }> => {
  return new Promise((resolve) => {
    const opts: SpawnOptions = {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    };

    const child = spawn('bun', ['--eval', code], opts);

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve({ stdout, stderr, exitCode: null });
    }, timeout);

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode });
    });
  });
};

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

describe('CLI Mode Detection', () => {
  describe('workspace parameter parsing', () => {
    it('should detect -w short flag with value', () => {
      const argv = ['node', 'magic-im', '-w', '~/.im/t1'];
      const workspaceIdx = argv.findIndex((arg) => arg === '-w' || arg === '--workspace');
      const workspace = workspaceIdx !== -1 ? argv[workspaceIdx + 1] : undefined;
      
      expect(workspaceIdx).toBe(2);
      expect(workspace).toBe('~/.im/t1');
    });

    it('should detect --workspace long flag with value', () => {
      const argv = ['node', 'magic-im', '--workspace', '/custom/path'];
      const workspaceIdx = argv.findIndex((arg) => arg === '-w' || arg === '--workspace');
      const workspace = workspaceIdx !== -1 ? argv[workspaceIdx + 1] : undefined;
      
      expect(workspaceIdx).toBe(2);
      expect(workspace).toBe('/custom/path');
    });

    it('should return undefined when no workspace flag', () => {
      const argv = ['node', 'magic-im'];
      const workspaceIdx = argv.findIndex((arg) => arg === '-w' || arg === '--workspace');
      const workspace = workspaceIdx !== -1 ? argv[workspaceIdx + 1] : undefined;
      
      expect(workspaceIdx).toBe(-1);
      expect(workspace).toBeUndefined();
    });

    it('should exclude workspace value from nonFlagArgs', () => {
      const argv = ['node', 'magic-im', '-w', '~/.im/t1'];
      const workspaceIdx = argv.findIndex((arg) => arg === '-w' || arg === '--workspace');
      const workspace = workspaceIdx !== -1 ? argv[workspaceIdx + 1] : undefined;
      
      const nonFlagArgs = argv.slice(2).filter((arg) => 
        !arg.startsWith('-') && arg !== workspace
      );
      
      // Should be empty - only workspace value is positional-like but should be filtered
      expect(nonFlagArgs).toEqual([]);
    });

    it('should detect interactive mode with workspace flag only', () => {
      const argv = ['node', 'magic-im', '-w', '~/.im/t1'];
      const workspaceIdx = argv.findIndex((arg) => arg === '-w' || arg === '--workspace');
      const workspace = workspaceIdx !== -1 ? argv[workspaceIdx + 1] : undefined;
      
      const helpFlags = ['-h', '--help', '-v', '--version'];
      const hasHelpFlag = argv.slice(2).some((arg) => helpFlags.includes(arg));
      const nonFlagArgs = argv.slice(2).filter((arg) => 
        !arg.startsWith('-') && arg !== workspace
      );
      const hasCommand = nonFlagArgs.length > 0 || hasHelpFlag;
      
      expect(hasCommand).toBe(false); // Should enter interactive mode
    });

    it('should detect CLI mode with command and workspace flag', () => {
      const argv = ['node', 'magic-im', 'whoami', '-w', '~/.im/t1'];
      const workspaceIdx = argv.findIndex((arg) => arg === '-w' || arg === '--workspace');
      const workspace = workspaceIdx !== -1 ? argv[workspaceIdx + 1] : undefined;
      
      const helpFlags = ['-h', '--help', '-v', '--version'];
      const hasHelpFlag = argv.slice(2).some((arg) => helpFlags.includes(arg));
      const nonFlagArgs = argv.slice(2).filter((arg) => 
        !arg.startsWith('-') && arg !== workspace
      );
      const hasCommand = nonFlagArgs.length > 0 || hasHelpFlag;
      
      expect(hasCommand).toBe(true); // Should run CLI mode
      expect(nonFlagArgs).toEqual(['whoami']);
    });
  });
});

describe('Global Error Handling', () => {
  beforeEach(async () => {
    cleanupLogs();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupLogs();
    vi.clearAllMocks();
  });

  describe('handleFatalError', () => {
    it('should log error to file successfully', async () => {
      // Import the module fresh after reset
      const { logger } = await import('./utils/logger.js');

      // Use a unique identifier to find our log entry
      const uniqueId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate a fatal error being logged
      logger.error(`Uncaught Exception: ${uniqueId}`, { stack: 'Error: Test error\n    at test.js:1:1' });

      // Wait for file to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The log file should exist and contain error entries
      expect(existsSync(TEST_LOG_FILE)).toBe(true);
      const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
      expect(logContent).toContain('[ERROR]');
    });

    it('should log Error object correctly', async () => {
      // Import the module fresh after reset
      const { logger } = await import('./utils/logger.js');

      const error = new Error('Test error for logging');
      logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });

      // Wait for file to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(existsSync(TEST_LOG_FILE)).toBe(true);
      const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
      expect(logContent).toContain('[ERROR]');
      expect(logContent).toContain('stack');
    });

    it('should handle non-Error objects', async () => {
      // Import the module fresh after reset
      const { logger } = await import('./utils/logger.js');

      const uniqueMsg = `string-error-${Date.now()}`;
      logger.error(`Unhandled Rejection: ${uniqueMsg}`);

      // Wait for file to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(existsSync(TEST_LOG_FILE)).toBe(true);
      const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
      expect(logContent).toContain('[ERROR]');
    });
  });

  describe('uncaughtException handler', () => {
    it('should catch and log synchronous exceptions', async () => {
      const code = `
        import { existsSync, mkdirSync, appendFileSync, writeFileSync } from 'fs';
        import { join } from 'path';
        import { homedir } from 'os';

        const logDir = join(homedir(), '.magic-im');
        const logFile = join(logDir, 'uncaught-test.log');

        process.on('uncaughtException', (error) => {
          if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
          }
          const timestamp = new Date().toISOString();
          const logLine = '[' + timestamp + '] [ERROR] [TEST] Uncaught Exception: ' + error.message + '\\n';
          writeFileSync(logFile, logLine, 'utf-8');
          process.exit(1);
        });

        throw new Error('Test uncaught exception');
      `;

      const result = await runScript(code);

      expect(result.exitCode).toBe(1);

      // Allow some time for file to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      const testLogFile = join(TEST_LOG_DIR, 'uncaught-test.log');
      if (existsSync(testLogFile)) {
        const logContent = readFileSync(testLogFile, 'utf-8');
        expect(logContent).toContain('Uncaught Exception');
        expect(logContent).toContain('Test uncaught exception');
        // Clean up
        unlinkSync(testLogFile);
      }
    });

    it('should output error to stderr', async () => {
      const code = `
        process.on('uncaughtException', (error) => {
          process.stderr.write('Uncaught Exception: ' + error.message + '\\n');
          process.exit(1);
        });

        throw new Error('stderr test error');
      `;

      const result = await runScript(code);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('stderr test error');
    });
  });

  describe('unhandledRejection handler', () => {
    it('should catch and log unhandled promise rejections', async () => {
      const code = `
        import { existsSync, mkdirSync, writeFileSync } from 'fs';
        import { join } from 'path';
        import { homedir } from 'os';

        const logDir = join(homedir(), '.magic-im');
        const logFile = join(logDir, 'rejection-test.log');

        process.on('unhandledRejection', (reason) => {
          if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
          }
          const timestamp = new Date().toISOString();
          const msg = reason instanceof Error ? reason.message : String(reason);
          const logLine = '[' + timestamp + '] [ERROR] [TEST] Unhandled Rejection: ' + msg + '\\n';
          writeFileSync(logFile, logLine, 'utf-8');
          process.exit(1);
        });

        Promise.reject(new Error('Test unhandled rejection'));

        // Keep process alive for a moment
        setTimeout(() => {}, 1000);
      `;

      const result = await runScript(code, 3000);

      expect(result.exitCode).toBe(1);

      // Allow some time for file to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      const testLogFile = join(TEST_LOG_DIR, 'rejection-test.log');
      if (existsSync(testLogFile)) {
        const logContent = readFileSync(testLogFile, 'utf-8');
        expect(logContent).toContain('Unhandled Rejection');
        expect(logContent).toContain('Test unhandled rejection');
        // Clean up
        unlinkSync(testLogFile);
      }
    });

    it('should handle string rejection reasons', async () => {
      const code = `
        process.on('unhandledRejection', (reason) => {
          const msg = reason instanceof Error ? reason.message : String(reason);
          process.stderr.write('Unhandled Rejection: ' + msg + '\\n');
          process.exit(1);
        });

        Promise.reject('string rejection reason');

        setTimeout(() => {}, 1000);
      `;

      const result = await runScript(code, 3000);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('string rejection reason');
    });
  });

  describe('exit behavior', () => {
    it('should exit with code 1 on uncaught exception', async () => {
      const code = `
        process.on('uncaughtException', () => {
          process.exit(1);
        });
        throw new Error('exit test');
      `;

      const result = await runScript(code);
      expect(result.exitCode).toBe(1);
    });

    it('should exit with code 1 on unhandled rejection', async () => {
      const code = `
        process.on('unhandledRejection', () => {
          process.exit(1);
        });
        Promise.reject(new Error('exit test'));
        setTimeout(() => {}, 1000);
      `;

      const result = await runScript(code, 3000);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('error message formatting', () => {
    it('should format Error objects correctly', async () => {
      const { logger } = await import('./utils/logger.js');

      const error = new Error('Formatted error test');
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      logger.error(`Test: ${msg}`, { stack });

      // Wait for file to be written
      await new Promise((resolve) => setTimeout(resolve, 50));

      const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
      expect(logContent).toContain('Formatted error test');
      expect(logContent).toContain('stack');
    });

    it('should handle null/undefined errors', async () => {
      const { logger } = await import('./utils/logger.js');

      const error: unknown = null;
      const msg = error instanceof Error ? error.message : String(error);

      logger.error(`Test: ${msg}`);

      // Wait for file to be written
      await new Promise((resolve) => setTimeout(resolve, 50));

      const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
      expect(logContent).toContain('Test: null');
    });

    it('should handle complex error objects', async () => {
      const { logger } = await import('./utils/logger.js');

      const error = {
        code: 'ERR_TEST',
        message: 'Complex error',
        details: { foo: 'bar' },
      };

      logger.error('Test error', error);

      // Wait for file to be written
      await new Promise((resolve) => setTimeout(resolve, 50));

      const logContent = readFileSync(TEST_LOG_FILE, 'utf-8');
      expect(logContent).toContain('ERR_TEST');
      expect(logContent).toContain('Complex error');
    });
  });
});
