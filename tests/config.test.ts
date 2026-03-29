import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { configManager } from '../src/config/store.js';

describe('Config Store', () => {
  const originalServerUrl = configManager.getServerUrl();

  afterAll(() => {
    // Restore original config
    configManager.setServerUrl(originalServerUrl);
  });

  describe('Server URL', () => {
    it('should get default server URL', () => {
      const url = configManager.getServerUrl();
      expect(typeof url).toBe('string');
      expect(url).toContain('http');
    });

    it('should set and get server URL', () => {
      configManager.setServerUrl('http://test-server:4000');
      expect(configManager.getServerUrl()).toBe('http://test-server:4000');
    });
  });

  describe('Credentials', () => {
    it('should return null when not logged in', () => {
      configManager.clearCredentials();
      expect(configManager.getCredentials()).toBeNull();
    });

    it('should set and get credentials', () => {
      configManager.setCredentials('test-token', 'test-agent', 'Test Name');
      const creds = configManager.getCredentials();
      
      expect(creds).not.toBeNull();
      expect(creds?.token).toBe('test-token');
      expect(creds?.agentId).toBe('test-agent');
      expect(creds?.name).toBe('Test Name');
    });

    it('should clear credentials', () => {
      configManager.setCredentials('test-token', 'test-agent', 'Test Name');
      configManager.clearCredentials();
      expect(configManager.getCredentials()).toBeNull();
    });

    it('should check login status', () => {
      configManager.clearCredentials();
      expect(configManager.isLoggedIn()).toBe(false);
      
      configManager.setCredentials('token', 'agent', 'name');
      expect(configManager.isLoggedIn()).toBe(true);
      
      configManager.clearCredentials();
    });
  });

  describe('Sync Cursors', () => {
    it('should return 0 for unknown conversation', () => {
      expect(configManager.getSyncCursor('unknown-conv')).toBe(0);
    });

    it('should set and get sync cursor', () => {
      configManager.setSyncCursor('conv-1', 10);
      expect(configManager.getSyncCursor('conv-1')).toBe(10);
      
      configManager.setSyncCursor('conv-1', 20);
      expect(configManager.getSyncCursor('conv-1')).toBe(20);
    });
  });
});
