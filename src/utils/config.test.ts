import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Use a test config directory
const TEST_CONFIG_DIR = join(homedir(), '.magic-im');
const TEST_CONFIG_FILE = join(TEST_CONFIG_DIR, 'settings.json');
const TEST_SNAPSHOT_DIR = join(TEST_CONFIG_DIR, 'snapshots');

// Clean up function
const cleanup = () => {
  if (existsSync(TEST_CONFIG_FILE)) {
    rmSync(TEST_CONFIG_FILE);
  }
  if (existsSync(TEST_SNAPSHOT_DIR)) {
    rmSync(TEST_SNAPSHOT_DIR, { recursive: true });
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

  describe('error handling', () => {
    it('should handle corrupted config file gracefully', async () => {
      // Create corrupted config file
      if (!existsSync(TEST_CONFIG_DIR)) {
        mkdirSync(TEST_CONFIG_DIR, { recursive: true });
      }
      writeFileSync(TEST_CONFIG_FILE, 'invalid json {{{', 'utf-8');
      
      const { getConfig } = await import('./config.js');
      const config = getConfig();
      
      // Should return default config on parse error
      expect(config.apiUrl).toBe('http://localhost:3000');
    });

    it('should handle corrupted snapshot file gracefully', async () => {
      // Create corrupted snapshot file
      if (!existsSync(TEST_SNAPSHOT_DIR)) {
        mkdirSync(TEST_SNAPSHOT_DIR, { recursive: true });
      }
      writeFileSync(join(TEST_SNAPSHOT_DIR, 'test.json'), 'invalid json', 'utf-8');
      
      const { loadSnapshot } = await import('./config.js');
      const snapshot = loadSnapshot('test');
      
      // Should return null on parse error
      expect(snapshot).toBeNull();
    });

    it('should handle non-existent snapshot gracefully', async () => {
      const { loadSnapshot } = await import('./config.js');
      const snapshot = loadSnapshot('non-existent-id');
      
      // Should return null for non-existent snapshot
      expect(snapshot).toBeNull();
    });

    it('should list snapshots even with corrupted files', async () => {
      // Create snapshot directory with one valid and one corrupted file
      if (!existsSync(TEST_SNAPSHOT_DIR)) {
        mkdirSync(TEST_SNAPSHOT_DIR, { recursive: true });
      }
      
      // Valid snapshot
      const validSnapshot = {
        id: 'valid-snapshot',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entries: [],
        history: [],
        theme: 'dark'
      };
      writeFileSync(
        join(TEST_SNAPSHOT_DIR, 'valid.json'), 
        JSON.stringify(validSnapshot), 
        'utf-8'
      );
      
      // Corrupted snapshot
      writeFileSync(join(TEST_SNAPSHOT_DIR, 'corrupted.json'), 'invalid', 'utf-8');
      
      const { listSnapshots } = await import('./config.js');
      const snapshots = listSnapshots();
      
      // Should return only valid snapshots
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].id).toBe('valid-snapshot');
    });

    it('should return empty array when snapshot directory does not exist', async () => {
      const { listSnapshots } = await import('./config.js');
      const snapshots = listSnapshots();
      expect(snapshots).toEqual([]);
    });
  });

  describe('snapshot operations', () => {
    it('should save and load snapshot', async () => {
      const { saveSnapshot, loadSnapshot } = await import('./config.js');
      
      const snapshot = {
        id: 'test-snapshot-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entries: [{ type: 'output' as const, text: 'hello' }],
        history: ['/help'],
        theme: 'dark' as const
      };
      
      const result = saveSnapshot(snapshot);
      expect(result).toBe(true);
      
      const loaded = loadSnapshot('test-snapshot-id');
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe('test-snapshot-id');
      expect(loaded?.entries).toHaveLength(1);
      expect(loaded?.history).toEqual(['/help']);
    });

    it('should delete snapshot', async () => {
      const { saveSnapshot, deleteSnapshot, loadSnapshot } = await import('./config.js');
      
      const snapshot = {
        id: 'delete-test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entries: [],
        history: [],
        theme: 'dark' as const
      };
      
      saveSnapshot(snapshot);
      const result = deleteSnapshot('delete-test');
      expect(result).toBe(true);
      
      const loaded = loadSnapshot('delete-test');
      expect(loaded).toBeNull();
    });

    it('should handle deleting non-existent snapshot gracefully', async () => {
      const { deleteSnapshot } = await import('./config.js');
      const result = deleteSnapshot('non-existent');
      expect(result).toBe(true); // Should succeed even if file doesn't exist
    });
  });
});
