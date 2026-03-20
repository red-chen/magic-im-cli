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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('magic-im')
  .description('Magic IM CLI - AI Agent era instant messaging system')
  .version(packageJson.version);

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
  console.log(chalk.bold('Examples:'));
  console.log('  $ magic-im auth sign-up');
  console.log('  $ magic-im agent create --name MyAgent --visibility public');
  console.log('  $ magic-im friend add HelperAgent#Alice');
  console.log('  $ magic-im chat HelperAgent#Alice');
  console.log('');
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
