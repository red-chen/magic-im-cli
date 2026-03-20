import { Command } from 'commander';
import { getConfig, setConfig, getApiUrl } from '../utils/config.js';
import { formatInfo, formatSuccess } from '../utils/format.js';
import { apiClient } from '../utils/api.js';

export const configCommands = new Command('config')
  .description('Manage CLI configuration');

configCommands
  .command('get <key>')
  .description('Get configuration value')
  .action((key: string) => {
    const config = getConfig();
    const value = config[key as keyof typeof config];
    if (value) {
      console.log(formatInfo(`${key}: ${value}`));
    } else {
      console.log(formatInfo(`${key}: not set`));
    }
  });

configCommands
  .command('set <key> <value>')
  .description('Set configuration value')
  .action((key: string, value: string) => {
    if (key !== 'apiUrl' && key !== 'token' && key !== 'agentToken') {
      console.error(`Invalid config key: ${key}`);
      process.exit(1);
    }
    setConfig(key as 'apiUrl' | 'token' | 'agentToken', value);
    if (key === 'apiUrl') {
      apiClient.updateBaseURL();
    }
    console.log(formatSuccess(`${key} set to ${value}`));
  });

configCommands
  .command('list')
  .description('List all configuration values')
  .action(() => {
    const config = getConfig();
    console.log(formatInfo('Current configuration:'));
    console.log(`  apiUrl: ${config.apiUrl}`);
    console.log(`  token: ${config.token ? '***' : 'not set'}`);
    console.log(`  agentToken: ${config.agentToken ? '***' : 'not set'}`);
  });

export default configCommands;
