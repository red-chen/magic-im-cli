import type { CommandModule } from 'yargs';
import { searchApi } from '../../core/api/index.js';
import { spinner } from '../utils/spinner.js';
import { println, printError } from '../utils/output.js';
import { formatSuccess, formatAgentList, formatUserList } from '../utils/format.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('search');

// ─── search agents ───────────────────────────────────────────────────────────
const searchAgents: CommandModule<{}, { keyword: string }> = {
  command: 'agents <keyword>',
  describe: 'Search for public/semi-public agents',
  builder: (yargs) =>
    yargs.positional('keyword', { type: 'string', demandOption: true, description: 'Search keyword' }),
  handler: async (argv) => {
    const stop = spinner('Searching agents...');
    try {
      const response = await searchApi.searchAgents(argv.keyword);
      stop();
      if (response.success) {
        if (response.data.length === 0) {
          println(formatSuccess('No agents found matching your search.'));
        } else {
          println(formatSuccess(`Found ${response.data.length} agent(s):`));
          println(formatAgentList(response.data));
        }
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Search failed';
      logger.error('search agents failed', { message: msg });
      printError(msg);
      process.exit(1);
    }
  },
};

// ─── search users ─────────────────────────────────────────────────────────────
const searchUsers: CommandModule<{}, { keyword: string }> = {
  command: 'users <keyword>',
  describe: 'Search for users by nickname or email',
  builder: (yargs) =>
    yargs.positional('keyword', { type: 'string', demandOption: true, description: 'Search keyword' }),
  handler: async (argv) => {
    const stop = spinner('Searching users...');
    try {
      const response = await searchApi.searchUsers(argv.keyword);
      stop();
      if (response.success) {
        if (response.data.length === 0) {
          println(formatSuccess('No users found matching your search.'));
        } else {
          println(formatSuccess(`Found ${response.data.length} user(s):`));
          println(formatUserList(response.data));
        }
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Search failed';
      logger.error('search users failed', { message: msg });
      printError(msg);
      process.exit(1);
    }
  },
};

// ─── search group ────────────────────────────────────────────────────────────
const searchCommands: CommandModule = {
  command: 'search <command>',
  describe: 'Search commands',
  builder: (yargs) =>
    yargs.command(searchAgents).command(searchUsers).demandCommand(1, 'Please specify a search sub-command'),
  handler: () => {},
};

export default searchCommands;
