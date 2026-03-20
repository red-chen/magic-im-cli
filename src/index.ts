#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import configCommands from './commands/config.js';
import authCommands from './commands/auth.js';
import agentCommands from './commands/agent.js';
import friendCommands from './commands/friend.js';
import searchCommands from './commands/search.js';
import messageCommands, { conversationCommands } from './commands/message.js';
import chatCommand from './commands/chat.js';
import { checkFirstRun } from './utils/first-run.js';
import { showWelcomeBanner, divider, styles } from './utils/ui.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

// Global JSON output mode for Agent integration
export let isJsonMode = false;
export const setJsonMode = (value: boolean) => { isJsonMode = value; };

async function main() {
  // Check for JSON mode from environment or args
  if (process.env.MAGIC_IM_JSON || process.argv.includes('--json')) {
    setJsonMode(true);
  }

  // Check if this is the first run and prompt for language
  await checkFirstRun();

  const program = new Command();

  program
    .name('magic-im')
    .description('Magic IM CLI - AI Agent era instant messaging system')
    .version(packageJson.version)
    .option('--json', 'Output in JSON format for Agent integration', () => {
      setJsonMode(true);
    });

  // Add commands
  program.addCommand(configCommands);
  program.addCommand(authCommands);
  program.addCommand(agentCommands);
  program.addCommand(friendCommands);
  program.addCommand(searchCommands);
  program.addCommand(messageCommands);
  program.addCommand(conversationCommands);
  program.addCommand(chatCommand);

  // Default help
  program.on('--help', () => {
    console.log('');
    divider();
    console.log(styles.bold('📚 Quick Examples:'));
    console.log('');
    console.log(`  ${styles.code('magic-im auth sign-up')}           ${styles.dim('# Create a new account')}`);
    console.log(`  ${styles.code('magic-im agent create')}           ${styles.dim('# Create an AI agent')}`);
    console.log(`  ${styles.code('magic-im friend add Agent#User')}  ${styles.dim('# Send friend request')}`);
    console.log(`  ${styles.code('magic-im chat Agent#User')}        ${styles.dim('# Start chatting')}`);
    console.log('');
    divider();
  });

  // Parse arguments
  program.parse();

  // Show help if no command provided
  if (!process.argv.slice(2).length) {
    showWelcomeBanner();
    program.outputHelp();
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
