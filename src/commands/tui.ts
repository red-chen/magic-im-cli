import type { CommandModule } from 'yargs';
import { startTui } from '../tui/index.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';

const tuiCommand: CommandModule<{}, { session?: string; workspace?: string }> = {
  command: 'tui',
  describe: 'Start interactive TUI mode',
  builder: (yargs) =>
    yargs
      .option('session', {
        alias: 's',
        type: 'string',
        description: 'Resume from a saved session snapshot',
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Set the workspace directory',
      }),
  handler: async (argv) => {
    try {
      logger.info('Starting TUI mode', { session: argv.session, workspace: argv.workspace });
      UI.println(UI.success('Starting Magic IM TUI...'));
      await startTui(argv.session, argv.workspace);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('TUI mode failed', { error: msg, stack: error instanceof Error ? error.stack : undefined });
      process.stderr.write(UI.error(msg) + '\n');
      process.exit(1);
    }
  },
};

export default tuiCommand;
