#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import configCommands from './commands/config.js';
import authCommands from './commands/auth.js';
import agentCommands from './commands/agent.js';
import friendCommands from './commands/friend.js';
import searchCommands from './commands/search.js';
import { messageCommands, conversationCommands } from './commands/message.js';
import chatCommand from './commands/chat.js';
import { checkFirstRun } from './utils/first-run.js';
import { showWelcomeBanner, UI } from './utils/ui.js';
import { startInteractiveMode } from './utils/interactive.js';
import { loadSnapshot } from './utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as {
  version: string;
};

// Global JSON output mode for Agent integration
export let isJsonMode = false;
export const setJsonMode = (value: boolean) => {
  isJsonMode = value;
};

async function main() {
  // Check for JSON mode from environment or args
  if (process.env.MAGIC_IM_JSON || process.argv.includes('--json')) {
    setJsonMode(true);
  }

  // Check for session restore flag
  const sessionIdx = process.argv.indexOf('-s');
  const sessionId = sessionIdx !== -1 ? process.argv[sessionIdx + 1] : undefined;
  const snapshot = sessionId ? loadSnapshot(sessionId) : null;

  // Detect interactive mode: no positional command arg → interactive
  const nonFlagArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('-') && arg !== sessionId);
  const hasCommand = nonFlagArgs.length > 0;

  // Check if this is the first run and prompt for language
  await checkFirstRun();

  if (!hasCommand) {
    // Interactive mode: no command provided, launch TUI shell
    showWelcomeBanner();
    await startInteractiveMode(snapshot);
    return;
  }

  // Non-interactive: parse and dispatch via yargs
  const cli = yargs(hideBin(process.argv))
    .scriptName('magic-im')
    .wrap(100)
    .help('help', 'show help')
    .alias('help', 'h')
    .version('version', 'show version', packageJson.version)
    .alias('version', 'v')
    .option('json', {
      type: 'boolean' as const,
      description: 'Output in JSON format for Agent integration',
    })
    .middleware((argv) => {
      if (argv.json) setJsonMode(true);
    })
    .command(configCommands)
    .command(authCommands)
    .command(agentCommands)
    .command(friendCommands)
    .command(searchCommands)
    .command(messageCommands)
    .command(conversationCommands)
    .command(chatCommand)
    .epilog(
      [
        'Quick Examples:',
        '  magic-im auth sign-up -e a@b.com -n Tom -p pass',
        '  magic-im agent create -n MyBot -v public',
        '  magic-im friend add Agent#User',
        '  magic-im chat Agent#User',
        '',
        'Run without a command to enter interactive mode.',
      ].join('\n'),
    )
    .fail((msg, err) => {
      if (msg) {
        process.stderr.write(UI.error(msg) + '\n');
      }
      if (err) throw err;
      process.exit(1);
    })
    .strict();

  await (cli as ReturnType<typeof yargs>).parseAsync();
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(UI.error(msg) + '\n');
  process.exit(1);
});
