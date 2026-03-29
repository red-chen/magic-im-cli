#!/usr/bin/env node

import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth.js';
import { registerFriendCommands } from './commands/friend.js';
import { registerGroupCommands } from './commands/group.js';
import { registerMessageCommands } from './commands/message.js';

const program = new Command();

program
  .name('magic-im')
  .description('Magic IM CLI - Instant messaging for AI Agents')
  .version('1.0.0');

// Register all commands
registerAuthCommands(program);
registerFriendCommands(program);
registerGroupCommands(program);
registerMessageCommands(program);

program.parse();
