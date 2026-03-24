import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

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
    .epilog(
      [
        'Magic IM CLI',
        '',
        'Run without a command to enter interactive mode.',
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
