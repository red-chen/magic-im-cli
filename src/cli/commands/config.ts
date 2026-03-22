import type { CommandModule } from 'yargs';
import {
  getConfig,
  setConfig,
  setLanguage,
  getLanguage,
} from '../../core/config/config.js';
import { apiClient } from '../../core/api/index.js';
import type { Language } from '../../core/types/index.js';
import {
  println,
  styles,
  createBox,
  createSuccessBox,
  createInfoBox,
  sectionHeader,
  divider,
} from '../utils/output.js';
import { createConfigTable } from '../utils/format.js';

// Available languages (hardcoded in English)
const AVAILABLE_LANGUAGES = [
  { value: 'zh' as const, label: '中文 (Chinese)' },
  { value: 'en' as const, label: 'English' },
];

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
    println(createInfoBox(content));
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
    println(createSuccessBox(`${styles.bold(argv.key)}\n\nset to: ${argv.value}`));
  },
};

// ─── config list ─────────────────────────────────────────────────────────────
const configList: CommandModule = {
  command: 'list',
  describe: 'List all configuration values',
  handler: () => {
    const config = getConfig();
    sectionHeader('Current Configuration');
    println(createConfigTable(config));
    divider();
  },
};

// ─── config language ─────────────────────────────────────────────────────────
const configLanguage: CommandModule<{}, { lang?: string }> = {
  command: 'language',
  describe: 'Change CLI language',
  builder: (yargs) => {
    const langs = AVAILABLE_LANGUAGES.map((l) => l.value);
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
      const currentLang = getLanguage();
      const lines = AVAILABLE_LANGUAGES.map(
        (l) => `  ${l.value === currentLang ? styles.success(l.value) : styles.dim(l.value)}  ${l.label}`
      ).join('\n');
      println(
        createBox(
          `${styles.bold('Current: ' + currentLang)}\n\nAvailable:\n${lines}\n\nUse: magic-im config language --lang <code>`,
          { title: 'Language', borderColor: 'yellow' }
        )
      );
      return;
    }
    setLanguage(argv.lang as Language);
    const langLabel = AVAILABLE_LANGUAGES.find((l) => l.value === argv.lang)?.label || argv.lang;
    println(createSuccessBox(`Language set to ${langLabel}`));
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
