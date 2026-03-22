import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Use a test config directory
const TEST_CONFIG_DIR = join(homedir(), '.magic-im');
const TEST_CONFIG_FILE = join(TEST_CONFIG_DIR, 'settings.json');

// Clean up function
const cleanup = () => {
  if (existsSync(TEST_CONFIG_FILE)) {
    rmSync(TEST_CONFIG_FILE);
  }
};

// Mock the ui module to avoid opentui dependencies
vi.mock('./ui.js', () => ({
  styles: {
    bold: (s: string) => s,
    dim: (s: string) => s,
    info: (s: string) => s,
    success: (s: string) => s,
    error: (s: string) => s,
  },
  createBox: (content: string) => content,
  createSuccessBox: (content: string) => content,
  showWelcomeBanner: () => {},
}));

describe('first-run', () => {
  beforeEach(() => {
    cleanup();
    vi.resetModules();
    // Re-apply mocks after resetModules
    vi.mock('./ui.js', () => ({
      styles: {
        bold: (s: string) => s,
        dim: (s: string) => s,
        info: (s: string) => s,
        success: (s: string) => s,
        error: (s: string) => s,
      },
      createBox: (content: string) => content,
      createSuccessBox: (content: string) => content,
      showWelcomeBanner: () => {},
    }));
    // Clear environment variables
    delete process.env.CI;
    delete process.env.NON_INTERACTIVE;
    delete process.env.AGENT_MODE;
    delete process.env.MAGIC_IM_LANGUAGE;
  });

  afterEach(() => {
    cleanup();
  });

  describe('isNonInteractive', () => {
    it('should return true when CI env is set', async () => {
      process.env.CI = 'true';
      const { isNonInteractive } = await import('./first-run.js');
      expect(isNonInteractive()).toBe(true);
    });

    it('should return true when NON_INTERACTIVE env is set', async () => {
      process.env.NON_INTERACTIVE = '1';
      const { isNonInteractive } = await import('./first-run.js');
      expect(isNonInteractive()).toBe(true);
    });

    it('should return true when AGENT_MODE env is set', async () => {
      process.env.AGENT_MODE = 'true';
      const { isNonInteractive } = await import('./first-run.js');
      expect(isNonInteractive()).toBe(true);
    });
  });

  describe('isFirstRun', () => {
    it('should correctly detect config file existence', async () => {
      // This test verifies the isFirstRun function works correctly
      // We reset modules and check if file existence detection works
      vi.resetModules();
      vi.mock('./ui.js', () => ({
        styles: {
          bold: (s: string) => s,
          dim: (s: string) => s,
          info: (s: string) => s,
          success: (s: string) => s,
          error: (s: string) => s,
        },
        createBox: (content: string) => content,
        createSuccessBox: (content: string) => content,
        showWelcomeBanner: () => {},
      }));
      
      const { isFirstRun } = await import('./first-run.js');
      const { getConfigFilePath } = await import('./config.js');
      const configPath = getConfigFilePath();
      
      // isFirstRun should return true if config doesn't exist, false if it does
      const configExists = existsSync(configPath);
      const firstRunStatus = isFirstRun();
      
      // The return value should be opposite of file existence
      expect(firstRunStatus).toBe(!configExists);
    });
  });

  describe('promptForLanguage', () => {
    it('should return default language in non-interactive mode', async () => {
      process.env.CI = 'true';
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const { promptForLanguage } = await import('./first-run.js');
      const lang = await promptForLanguage();
      
      expect(lang).toBe('en');
      consoleSpy.mockRestore();
    });

    it('should use MAGIC_IM_LANGUAGE env var in non-interactive mode', async () => {
      process.env.CI = 'true';
      process.env.MAGIC_IM_LANGUAGE = 'zh';
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const { promptForLanguage } = await import('./first-run.js');
      const lang = await promptForLanguage();
      
      expect(lang).toBe('zh');
      consoleSpy.mockRestore();
    });

    it('should handle invalid MAGIC_IM_LANGUAGE and default to en', async () => {
      process.env.CI = 'true';
      process.env.MAGIC_IM_LANGUAGE = 'invalid';
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const { promptForLanguage } = await import('./first-run.js');
      const lang = await promptForLanguage();
      
      expect(lang).toBe('en');
      consoleSpy.mockRestore();
    });
  });

  describe('checkFirstRun', () => {
    it('should complete without error in non-interactive mode', async () => {
      // Set non-interactive mode so checkFirstRun won't prompt
      process.env.CI = 'true';
      
      vi.resetModules();
      
      // Re-apply mocks after resetModules
      vi.mock('./ui.js', () => ({
        styles: {
          bold: (s: string) => s,
          dim: (s: string) => s,
          info: (s: string) => s,
          success: (s: string) => s,
          error: (s: string) => s,
        },
        createBox: (content: string) => content,
        createSuccessBox: (content: string) => content,
        showWelcomeBanner: () => {},
      }));
      
      // Mock console.log to suppress output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const { checkFirstRun } = await import('./first-run.js');
      
      // checkFirstRun should complete without error
      await expect(checkFirstRun()).resolves.toBeUndefined();
      
      consoleSpy.mockRestore();
    });
  });
});
