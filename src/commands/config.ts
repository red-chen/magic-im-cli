import type { CommandModule } from 'yargs';
import { getConfig, setConfig, setLanguage, getLanguage } from '../utils/config.js';
import { apiClient } from '../utils/api.js';
import { t, getAvailableLanguages } from '../utils/i18n.js';
import {
  UI,
  styles,
  createBox,
  createSuccessBox,
  createInfoBox,
  createConfigTable,
  sectionHeader,
  divider,
} from '../utils/ui.js';
import type { Language } from '../types/index.js';

// ─── config get ──────────────────────────────────────────────────────────────
const configGet: CommandModule<{}, { key: string }> = {
  command: 'get <key>',
  describe: 'Get configuration value',
  builder: (yargs) =>
    yargs.positional('key', { type: 'string', demandOption: true, description: 'Config key' }),
  handler: (argv) => {
    const config = getConfig();
    const value = config[argv.key as keyof typeof config];
    const content = value
      ? `${styles.bold(argv.key)}\n\n${styles.info(String(value))}`
      : `${styles.bold(argv.key)}\n\n${styles.dim('not set')}`;
    UI.println(createInfoBox(content));
  },
};

// ─── config set ──────────────────────────────────────────────────────────────
const configSet: CommandModule<{}, { key: string; value: string }> = {
  command: 'set <key> <value>',
  describe: 'Set configuration value',
  builder: (yargs) =>
    yargs
      .positional('key', { type: 'string', demandOption: true, description: 'Config key' })
      .positional('value', { type: 'string', demandOption: true, description: 'Config value' })
      .check((argv) => {
        const valid = ['apiUrl', 'token', 'agentToken', 'language'];
        if (!valid.includes(argv.key)) {
          throw new Error(`Invalid config key: ${argv.key}. Valid keys: ${valid.join(', ')}`);
        }
        return true;
      }),
  handler: (argv) => {
    setConfig(argv.key as 'apiUrl' | 'token' | 'agentToken' | 'language', argv.value);
    if (argv.key === 'apiUrl') {
      apiClient.updateBaseURL();
    }
    UI.println(createSuccessBox(`${styles.bold(argv.key)}\n\n${styles.success(`set to: ${argv.value}`)}`));
  },
};

// ─── config list ─────────────────────────────────────────────────────────────
const configList: CommandModule = {
  command: 'list',
  describe: 'List all configuration values',
  handler: () => {
    const config = getConfig();
    sectionHeader(t('configCurrent'));
    UI.println(createConfigTable(config));
    divider();
  },
};

// ─── config language ─────────────────────────────────────────────────────────
// The language command presents an inline selection in the TUI-style.
// Since we no longer use inquirer, we accept --lang <en|zh> directly.
const configLanguage: CommandModule<{}, { lang?: string }> = {
  command: 'language',
  describe: 'Change CLI language',
  builder: (yargs) => {
    const langs = getAvailableLanguages().map((l: { value: string }) => l.value);
    return yargs.option('lang', {
      alias: 'l',
      type: 'string',
      choices: langs,
      description: `Language code (${langs.join('|')})`,
    });
  },
  handler: (argv) => {
    if (!argv.lang) {
      // Show current languages when no --lang provided
      const languages = getAvailableLanguages();
      const currentLang = getLanguage();
      const lines = languages
        .map((l: { value: string; label: string }) => `  ${l.value === currentLang ? styles.success(l.value) : styles.dim(l.value)}  ${l.label}`)
        .join('\n');
      UI.println(
        createBox(
          `${styles.bold('Current: ' + currentLang)}\n\nAvailable:\n${lines}\n\nUse: magic-im config language --lang <code>`,
          { title: 'Language / 语言', borderColor: 'yellow' },
        ),
      );
      return;
    }
    setLanguage(argv.lang as Language);
    UI.println(createSuccessBox(styles.success(t('languageSet'))));
  },
};

// ─── config group ─────────────────────────────────────────────────────────────
const configCommands: CommandModule = {
  command: 'config <command>',
  describe: 'Manage CLI configuration',
  builder: (yargs) =>
    yargs
      .command(configGet)
      .command(configSet)
      .command(configList)
      .command(configLanguage)
      .demandCommand(1, 'Please specify a config sub-command'),
  handler: () => {},
};

export default configCommands;
