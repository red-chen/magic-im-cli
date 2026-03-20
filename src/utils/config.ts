import Conf from 'conf';
import { Config } from '../types/index.js';

const config = new Conf<Config>({
  projectName: 'magic-im-cli',
  defaults: {
    apiUrl: 'http://localhost:3000',
  },
});

export const getConfig = (): Config => {
  return {
    apiUrl: config.get('apiUrl') || 'http://localhost:3000',
    token: config.get('token'),
    agentToken: config.get('agentToken'),
  };
};

export const setConfig = (key: keyof Config, value: string): void => {
  config.set(key, value);
};

export const getToken = (): string | undefined => {
  return config.get('token');
};

export const setToken = (token: string): void => {
  config.set('token', token);
};

export const clearToken = (): void => {
  config.delete('token');
};

export const getAgentToken = (): string | undefined => {
  return config.get('agentToken');
};

export const setAgentToken = (token: string): void => {
  config.set('agentToken', token);
};

export const clearAgentToken = (): void => {
  config.delete('agentToken');
};

export const getApiUrl = (): string => {
  return config.get('apiUrl') || 'http://localhost:3000';
};

export default config;
