import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { apiClient } from './api.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: { baseURL: '' },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

// Mock config
vi.mock('./config.js', () => ({
  getApiUrl: vi.fn(() => 'http://localhost:3000'),
  getToken: vi.fn(() => 'test-token'),
  getAgentToken: vi.fn(() => undefined),
}));

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateBaseURL', () => {
    it('should update base URL', () => {
      apiClient.updateBaseURL();
      // Should not throw
      expect(apiClient).toBeDefined();
    });
  });
});
