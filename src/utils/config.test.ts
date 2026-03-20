import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { existsSync, rmSync } from 'fs';
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

describe('config', () => {
  beforeEach(() => {
    cleanup();
    // Reset modules to get fresh config
    vi.resetModules();
  });

  afterAll(() => {
    cleanup();
  });

  describe('basic config operations', () => {
    it('should return default config when no file exists', async () => {
      const { getConfig } = await import('./config.js');
      const config = getConfig();
      expect(config.apiUrl).toBe('http://localhost:3000');
      expect(config.token).toBeUndefined();
      expect(config.agentToken).toBeUndefined();
      expect(config.language).toBeUndefined();
    });

    it('should set and get apiUrl', async () => {
      const { setConfig, getApiUrl } = await import('./config.js');
      setConfig('apiUrl', 'https://api.example.com');
      expect(getApiUrl()).toBe('https://api.example.com');
    });

    it('should set and get token', async () => {
      const { setToken, getToken } = await import('./config.js');
      setToken('test-token');
      expect(getToken()).toBe('test-token');
    });

    it('should clear token', async () => {
      const { setToken, clearToken, getToken } = await import('./config.js');
      setToken('test-token');
      clearToken();
      expect(getToken()).toBeUndefined();
    });

    it('should set and get agent token', async () => {
      const { setAgentToken, getAgentToken } = await import('./config.js');
      setAgentToken('agent-token');
      expect(getAgentToken()).toBe('agent-token');
    });

    it('should clear agent token', async () => {
      const { setAgentToken, clearAgentToken, getAgentToken } = await import('./config.js');
      setAgentToken('agent-token');
      clearAgentToken();
      expect(getAgentToken()).toBeUndefined();
    });

    it('should set and get language', async () => {
      const { setLanguage, getLanguage } = await import('./config.js');
      setLanguage('zh');
      expect(getLanguage()).toBe('zh');
    });

    it('should return default language as en', async () => {
      const { getLanguage } = await import('./config.js');
      expect(getLanguage()).toBe('en');
    });
  });
});
