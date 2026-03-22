import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import configCommands from './commands/config.js';
import authCommands, { signinShortcut } from './commands/auth.js';
import agentCommands, { setJsonMode } from './commands/agent.js';
import friendCommands from './commands/friend.js';
import searchCommands from './commands/search.js';
import { messageCommands, conversationCommands } from './commands/message.js';
import { printError } from './utils/output.js';
import { logger } from './utils/logger.js';

// Version is injected at build time via define
declare const __VERSION__: string;
const version = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.1-dev';

// Global JSON output mode
export let isJsonMode = false;

export async function runCli(): Promise<void> {
  logger.info('CLI started', { args: process.argv.slice(2) });

  // Check for JSON mode from environment or args
  if (process.env.MAGIC_IM_JSON || process.argv.includes('--json')) {
    isJsonMode = true;
    setJsonMode(true);
    logger.info('JSON mode enabled');
  }

  const cli = yargs(hideBin(process.argv))
    .scriptName('magic-im')
    .wrap(100)
    .help('help', 'show help')
    .alias('help', 'h')
    .version('version', 'show version', version)
    .alias('version', 'v')
    .option('json', {
      type: 'boolean' as const,
      description: 'Output in JSON format for Agent integration',
    })
    .middleware((argv) => {
      if (argv.json) {
        isJsonMode = true;
        setJsonMode(true);
      }
    })
    .command(configCommands)
    .command(authCommands)
    .command(signinShortcut)
    .command(agentCommands)
    .command(friendCommands)
    .command(searchCommands)
    .command(messageCommands)
    .command(conversationCommands)
    .epilog(
      [
        'Quick Examples:',
        '  magic-im auth sign-up -e a@b.com -n Tom -p pass',
        '  magic-im agent create -n MyBot -v public',
        '  magic-im friend add Agent#User',
        '',
        'Run without a command to enter interactive mode.',
      ].join('\n')
    )
    .fail((msg, err) => {
      if (msg) {
        printError(msg);
      }
      if (err) throw err;
      process.exit(1);
    })
    .strict();

  await (cli as ReturnType<typeof yargs>).parseAsync();
}
