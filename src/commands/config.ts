import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getConfig, setConfig, getApiUrl, setLanguage, getLanguage } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
import { t, getAvailableLanguages } from '../utils/i18n.js';
import { Language } from '../types/index.js';
import { 
  styles, 
  createBox, 
  createSuccessBox, 
  createInfoBox,
  createConfigTable,
  sectionHeader,
  divider,
} from '../utils/ui.js';

export const configCommands = new Command('config')
  .description('Manage CLI configuration');

configCommands
  .command('get <key>')
  .description('Get configuration value')
  .action((key: string) => {
    const config = getConfig();
    const value = config[key as keyof typeof config];
    
    const content = value 
      ? `${styles.bold(key)}\n\n${chalk.cyan(value)}`
      : `${styles.bold(key)}\n\n${chalk.gray('not set')}`;
    
    console.log(createInfoBox(content));
  });

configCommands
  .command('set <key> <value>')
  .description('Set configuration value')
  .action((key: string, value: string) => {
    if (key !== 'apiUrl' && key !== 'token' && key !== 'agentToken' && key !== 'language') {
      console.log(createBox(styles.error(`Invalid config key: ${key}`), { borderColor: 'red' }));
      process.exit(1);
    }
    setConfig(key as 'apiUrl' | 'token' | 'agentToken' | 'language', value);
    if (key === 'apiUrl') {
      apiClient.updateBaseURL();
    }
    console.log(createSuccessBox(`${styles.bold(key)}\n\n${styles.success(`set to: ${value}`)}`));
  });

configCommands
  .command('list')
  .description('List all configuration values')
  .action(() => {
    const config = getConfig();
    sectionHeader(t('configCurrent'));
    console.log(createConfigTable(config));
    divider();
  });

// Language selection command
configCommands
  .command('language')
  .description('Change CLI language')
  .action(async () => {
    const languages = getAvailableLanguages();
    const currentLang = getLanguage();
    
    console.log(createBox(
      `${styles.bold('🌐 ' + t('selectLanguage'))}\n\n${styles.dim('Current: ' + currentLang)}`,
      { borderColor: 'yellow', title: 'Language / 语言', titleAlignment: 'center' }
    ));
    
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'language',
      message: chalk.cyan('➜'),
      choices: languages.map(lang => ({
        name: lang.value === 'en' 
          ? `  🇺🇸  ${lang.label} ${lang.value === currentLang ? chalk.green('(current)') : ''}`
          : `  🇨🇳  ${lang.label} ${lang.value === currentLang ? chalk.green('(current)') : ''}`,
        value: lang.value,
      })),
      default: currentLang,
      prefix: '',
    }]);

    const selectedLang = answer.language as Language;
    setLanguage(selectedLang);
    console.log(createSuccessBox(styles.success(t('languageSet'))));
  });

export default configCommands;
