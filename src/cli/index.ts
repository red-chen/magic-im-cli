import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import loginCommand from '../commands/login.js';
import whoamiCommand from '../commands/whoami.js';
import agentCommand, { agentsCommand } from '../commands/agent.js';
import searchCommand from '../commands/search.js';
import tuiCommand from '../commands/tui.js';
import switchCommand from '../commands/switch.js';

// Version is injected at build time via define
declare const __VERSION__: string;
const version = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.1-dev';

export async function runCli(): Promise<void> {
  const cli = yargs(hideBin(process.argv))
    .scriptName('magic-im')
    .wrap(100)
    .help('help', 'show help')
    .alias('help', 'h')
    .version('version', 'show version', version)
    .alias('version', 'v')
    .command(loginCommand)
    .command(whoamiCommand)
    .command(agentCommand)
    .command(agentsCommand)
    .command(searchCommand)
    .command(switchCommand)
    .command(tuiCommand)
    .epilog(
      [
        'Magic IM CLI',
        '',
        'Run "magic-im tui" to enter interactive mode.',
      ].join('\n')
    )
    .fail((msg, err) => {
      if (msg) {
        console.error(msg);
      }
      if (err) throw err;
      process.exit(1);
    })
    .strict();

  await (cli as ReturnType<typeof yargs>).parseAsync();
}
