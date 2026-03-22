import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Container for interceptors that can be modified
const interceptorContainer = vi.hoisted(() => ({
  requestInterceptor: undefined as ((config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>) | undefined,
  requestErrorInterceptor: undefined as ((error: unknown) => unknown) | undefined,
  responseInterceptor: undefined as ((response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>) | undefined,
  responseErrorInterceptor: undefined as ((error: AxiosError) => unknown) | undefined,
}));

// Mock axios - define mock before importing apiClient
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: { baseURL: '' },
      interceptors: {
        request: {
          use: vi.fn((onFulfilled, onRejected) => {
            interceptorContainer.requestInterceptor = onFulfilled;
            interceptorContainer.requestErrorInterceptor = onRejected;
          }),
        },
        response: {
          use: vi.fn((onFulfilled, onRejected) => {
            interceptorContainer.responseInterceptor = onFulfilled;
            interceptorContainer.responseErrorInterceptor = onRejected;
          }),
        },
      },
    })),
  },
}));

// Import apiClient after mock is set up
import { apiClient } from './api.js';

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

  describe('response error interceptor', () => {
    it('should extract message from string error', () => {
      expect(interceptorContainer.responseErrorInterceptor).toBeDefined();

      const axiosError = {
        response: {
          data: {
            success: false,
            error: 'String error message',
          },
        },
      } as AxiosError;

      expect(() => interceptorContainer.responseErrorInterceptor!(axiosError)).toThrow('String error message');
    });

    it('should extract message from object error {code, message}', () => {
      expect(interceptorContainer.responseErrorInterceptor).toBeDefined();

      const axiosError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'SEARCH_ERROR',
              message: 'Search operation failed',
            },
          },
        },
      } as AxiosError;

      expect(() => interceptorContainer.responseErrorInterceptor!(axiosError)).toThrow('Search operation failed');
    });

    it('should use message field when error is not present', () => {
      expect(interceptorContainer.responseErrorInterceptor).toBeDefined();

      const axiosError = {
        response: {
          data: {
            success: false,
            message: 'General error message',
          },
        },
      } as AxiosError;

      expect(() => interceptorContainer.responseErrorInterceptor!(axiosError)).toThrow('General error message');
    });

    it('should throw original error when no error or message in response', () => {
      expect(interceptorContainer.responseErrorInterceptor).toBeDefined();

      const axiosError = new Error('Original axios error') as AxiosError;

      expect(() => interceptorContainer.responseErrorInterceptor!(axiosError)).toThrow('Original axios error');
    });

    it('should handle error with empty object error field', () => {
      expect(interceptorContainer.responseErrorInterceptor).toBeDefined();

      const axiosError = {
        response: {
          data: {
            success: false,
            error: {},
          },
        },
      } as AxiosError;

      // When error object has no message, Error constructor converts undefined to empty string
      expect(() => interceptorContainer.responseErrorInterceptor!(axiosError)).toThrow('');
    });
  });
});
