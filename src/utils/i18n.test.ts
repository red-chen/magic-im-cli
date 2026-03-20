import { describe, it, expect, vi, beforeEach } from 'vitest';
import { t, getAvailableLanguages } from './i18n.js';

// Mock config
vi.mock('./config.js', () => ({
  getLanguage: vi.fn(() => 'zh'),
}));

describe('i18n', () => {
  describe('t', () => {
    it('should return Chinese translation when language is zh', () => {
      const result = t('welcome');
      expect(result).toBe('欢迎使用 Magic IM CLI!');
    });

    it('should return translation for config keys', () => {
      expect(t('configApiUrl')).toBe('API 地址');
      expect(t('configToken')).toBe('用户令牌');
    });

    it('should return translation for success messages', () => {
      expect(t('signUpSuccess')).toBe('注册成功!');
      expect(t('agentCreated')).toBe('Agent 创建成功!');
    });
  });

  describe('getAvailableLanguages', () => {
    it('should return available languages', () => {
      const languages = getAvailableLanguages();
      expect(languages).toHaveLength(2);
      expect(languages).toContainEqual({ value: 'zh', label: '中文 (Chinese)' });
      expect(languages).toContainEqual({ value: 'en', label: 'English' });
    });
  });
});
