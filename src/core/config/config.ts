import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { Config, Language, ThemeMode } from '../types/index.js';

// Config file path: ~/.magic-im/settings.json
const CONFIG_DIR = join(homedir(), '.magic-im');
const CONFIG_FILE = join(CONFIG_DIR, 'settings.json');

// Default config
const defaultConfig: Config = {
  apiUrl: 'http://localhost:3000',
};

// Ensure config directory exists
const ensureConfigDir = (): boolean => {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
};

// Read config from file
const readConfig = (): Config => {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = readFileSync(CONFIG_FILE, 'utf-8');
      return { ...defaultConfig, ...JSON.parse(data) };
    }
  } catch {
    // Return default config on error
  }
  return { ...defaultConfig };
};

// Write config to file
const writeConfig = (config: Config): boolean => {
  try {
    if (!ensureConfigDir()) {
      return false;
    }
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
};

// In-memory cache
let configCache: Config | null = null;

const getConfigInternal = (): Config => {
  if (!configCache) {
    configCache = readConfig();
  }
  return configCache;
};

const setConfigValue = <K extends keyof Config>(key: K, value: Config[K]): void => {
  const config = getConfigInternal();
  config[key] = value;
  configCache = config;
  writeConfig(config);
};

// ─── Exported Functions ─────────────────────────────────────────────────────

export const getConfig = (): Config => {
  return getConfigInternal();
};

export const getLanguage = (): Language => {
  const config = getConfigInternal();
  return config.language || 'en';
};

export const getDefaultLanguage = (): Language => 'en';

export const setLanguage = (lang: Language): void => {
  setConfigValue('language', lang);
};

export const getTheme = (): ThemeMode | undefined => {
  const config = getConfigInternal();
  return config.theme;
};

export const setTheme = (theme: ThemeMode): void => {
  setConfigValue('theme', theme);
};

export const setConfig = (key: keyof Config, value: string): void => {
  setConfigValue(key, value);
};

export const getToken = (): string | undefined => {
  const config = getConfigInternal();
  return config.token;
};

export const setToken = (token: string): void => {
  setConfigValue('token', token);
};

export const clearToken = (): void => {
  setConfigValue('token', undefined);
};

export const getAgentToken = (): string | undefined => {
  const config = getConfigInternal();
  return config.agentToken;
};

export const setAgentToken = (token: string): void => {
  setConfigValue('agentToken', token);
};

export const clearAgentToken = (): void => {
  setConfigValue('agentToken', undefined);
};

export const getApiUrl = (): string => {
  const config = getConfigInternal();
  return config.apiUrl || 'http://localhost:3000';
};

export const getConfigFilePath = (): string => {
  return CONFIG_FILE;
};

export const getConfigDirPath = (): string => {
  return CONFIG_DIR;
};
