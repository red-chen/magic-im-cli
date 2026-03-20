import { describe, it, expect, beforeEach, vi } from 'vitest';
import Conf from 'conf';
import {
  getConfig,
  setConfig,
  getToken,
  setToken,
  clearToken,
  getAgentToken,
  setAgentToken,
  clearAgentToken,
  getApiUrl,
} from './config.js';

// Create a mock store that gets reset for each test
let mockStore: Record<string, string> = {};

// Mock Conf
vi.mock('conf', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn((key: string) => mockStore[key]),
    set: vi.fn((key: string, value: string) => {
      mockStore[key] = value;
    }),
    delete: vi.fn((key: string) => {
      delete mockStore[key];
    }),
  })),
}));

describe('config', () => {
  beforeEach(() => {
    mockStore = {}; // Reset store before each test
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return default config when no values are set', () => {
      const config = getConfig();
      expect(config.apiUrl).toBe('http://localhost:3000');
      expect(config.token).toBeUndefined();
      expect(config.agentToken).toBeUndefined();
    });
  });

  describe('setConfig', () => {
    it('should set apiUrl config', () => {
      setConfig('apiUrl', 'https://api.example.com');
      const config = getConfig();
      expect(config.apiUrl).toBe('https://api.example.com');
    });

    it('should set token config', () => {
      setConfig('token', 'test-token');
      expect(getToken()).toBe('test-token');
    });

    it('should set agentToken config', () => {
      setConfig('agentToken', 'test-agent-token');
      expect(getAgentToken()).toBe('test-agent-token');
    });
  });

  describe('token management', () => {
    it('should set and get token', () => {
      setToken('my-token');
      expect(getToken()).toBe('my-token');
    });

    it('should clear token', () => {
      setToken('my-token');
      clearToken();
      expect(getToken()).toBeUndefined();
    });

    it('should set and get agent token', () => {
      setAgentToken('my-agent-token');
      expect(getAgentToken()).toBe('my-agent-token');
    });

    it('should clear agent token', () => {
      setAgentToken('my-agent-token');
      clearAgentToken();
      expect(getAgentToken()).toBeUndefined();
    });
  });

  describe('getApiUrl', () => {
    it('should return default API URL', () => {
      expect(getApiUrl()).toBe('http://localhost:3000');
    });

    it('should return custom API URL when set', () => {
      setConfig('apiUrl', 'https://custom-api.example.com');
      expect(getApiUrl()).toBe('https://custom-api.example.com');
    });
  });
});
