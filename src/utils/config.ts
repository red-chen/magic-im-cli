import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Config, Language, SessionSnapshot } from '../types/index.js';
import { logger } from './logger.js';

// Default config directory: ~/.magic-im
let CONFIG_DIR = join(homedir(), '.magic-im');
let CONFIG_FILE = join(CONFIG_DIR, 'settings.json');
let SNAPSHOT_DIR = join(CONFIG_DIR, 'snapshots');

// Set workspace directory (called from CLI middleware)
export const setWorkspace = (workspacePath: string): void => {
  CONFIG_DIR = workspacePath;
  CONFIG_FILE = join(CONFIG_DIR, 'settings.json');
  SNAPSHOT_DIR = join(CONFIG_DIR, 'snapshots');
  // Clear cache to force re-read from new location
  configCache = null;
  logger.info('Workspace set', { path: workspacePath });
};

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
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to create config directory', { path: CONFIG_DIR, error: msg });
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to read config file', { path: CONFIG_FILE, error: msg });
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to write config file', { path: CONFIG_FILE, error: msg });
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

export const getTheme = (): 'light' | 'dark' | undefined => {
  const config = getConfigInternal();
  return config.theme;
};

export const setTheme = (theme: 'light' | 'dark'): void => {
  setConfigValue('theme', theme);
};

export const setConfig = (key: keyof Config, value: string): void => {
  setConfigValue(key, value);
};

export const getToken = (): string | undefined => {
  // First try settings.json
  const config = getConfigInternal();
  if (config.token) {
    return config.token;
  }
  
  // Then try workspace config.json (where login saves token)
  const workspaceConfigFile = join(CONFIG_DIR, 'config.json');
  try {
    if (existsSync(workspaceConfigFile)) {
      const data = readFileSync(workspaceConfigFile, 'utf-8');
      const workspaceConfig = JSON.parse(data);
      if (workspaceConfig.token) {
        return workspaceConfig.token;
      }
    }
  } catch (error) {
    // Ignore read errors
  }
  
  return undefined;
};

export const setToken = (token: string): void => {
  setConfigValue('token', token);
};

export const clearToken = (): void => {
  setConfigValue('token', undefined);
};

export const getAgentId = (): string | undefined => {
  // First try settings.json
  const config = getConfigInternal();
  if (config.currentAgentId) {
    return config.currentAgentId;
  }
  
  // Then try workspace config.json (where login saves currentAgent)
  const workspaceConfigFile = join(CONFIG_DIR, 'config.json');
  try {
    if (existsSync(workspaceConfigFile)) {
      const data = readFileSync(workspaceConfigFile, 'utf-8');
      const workspaceConfig = JSON.parse(data);
      if (workspaceConfig.currentAgent?.id) {
        return workspaceConfig.currentAgent.id;
      }
    }
  } catch (error) {
    // Ignore read errors
  }
  
  return undefined;
};

export const saveCurrentAgent = (agent: { id: string; name: string; full_name: string }): boolean => {
  const workspaceConfigFile = join(CONFIG_DIR, 'config.json');
  try {
    let workspaceConfig: Record<string, unknown> = {};
    if (existsSync(workspaceConfigFile)) {
      const data = readFileSync(workspaceConfigFile, 'utf-8');
      workspaceConfig = JSON.parse(data);
    }
    workspaceConfig.currentAgent = agent;
    writeFileSync(workspaceConfigFile, JSON.stringify(workspaceConfig, null, 2), 'utf-8');
    logger.info('Current agent saved to config', { agentId: agent.id, fullName: agent.full_name });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to save current agent', { error: msg });
    return false;
  }
};

export const setAgentId = (agentId: string): void => {
  setConfigValue('currentAgentId', agentId);
};

export const clearAgentId = (): void => {
  setConfigValue('currentAgentId', undefined);
};

export const getApiUrl = (): string => {
  const config = getConfigInternal();
  return config.apiUrl || 'http://localhost:3000';
};

export const getConfigFilePath = (): string => {
  return CONFIG_FILE;
};

// ─── Session Snapshot Functions ───────────────────────────────────────────────

const ensureSnapshotDir = (): boolean => {
  try {
    if (!existsSync(SNAPSHOT_DIR)) {
      mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to create snapshot directory', { path: SNAPSHOT_DIR, error: msg });
    return false;
  }
};

export const saveSnapshot = (snapshot: SessionSnapshot): boolean => {
  try {
    if (!ensureSnapshotDir()) {
      return false;
    }
    const filePath = join(SNAPSHOT_DIR, `${snapshot.id}.json`);
    writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to save snapshot', { id: snapshot.id, error: msg });
    return false;
  }
};

export const loadSnapshot = (id: string): SessionSnapshot | null => {
  const filePath = join(SNAPSHOT_DIR, `${id}.json`);
  try {
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as SessionSnapshot;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to load snapshot', { id, path: filePath, error: msg });
  }
  return null;
};

export const deleteSnapshot = (id: string): boolean => {
  const filePath = join(SNAPSHOT_DIR, `${id}.json`);
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to delete snapshot', { id, path: filePath, error: msg });
    return false;
  }
};

export const listSnapshots = (): SessionSnapshot[] => {
  try {
    if (!existsSync(SNAPSHOT_DIR)) return [];
    const files = readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.json'));
    return files
      .map(f => {
        try {
          const data = readFileSync(join(SNAPSHOT_DIR, f), 'utf-8');
          return JSON.parse(data) as SessionSnapshot;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error('Failed to parse snapshot file', { file: f, error: msg });
          return null;
        }
      })
      .filter((s): s is SessionSnapshot => s !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to list snapshots', { path: SNAPSHOT_DIR, error: msg });
    return [];
  }
};

export const getSnapshotDirPath = (): string => {
  return SNAPSHOT_DIR;
};
