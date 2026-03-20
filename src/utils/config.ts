import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Config, Language } from '../types/index.js';

// Config file path: ~/.magic-im/settings.json
const CONFIG_DIR = join(homedir(), '.magic-im');
const CONFIG_FILE = join(CONFIG_DIR, 'settings.json');

// Default config
const defaultConfig: Config = {
  apiUrl: 'http://localhost:3000',
};

// Ensure config directory exists
const ensureConfigDir = (): void => {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
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
    // Ignore read errors
  }
  return { ...defaultConfig };
};

// Write config to file
const writeConfig = (config: Config): void => {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
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
