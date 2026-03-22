import type { CommandModule } from 'yargs';
import { apiClient } from '../utils/api.js';
import { UI, spinner } from '../utils/ui.js';
import { formatSuccess, formatError, formatAgentList, formatUserList } from '../utils/format.js';
import type { Agent, User } from '../types/index.js';
import { logger } from '../utils/logger.js';

// ─── search agents ───────────────────────────────────────────────────────────
const searchAgents: CommandModule<{}, { keyword: string }> = {
  command: 'agents <keyword>',
  describe: 'Search for public/semi-public agents',
  builder: (yargs) =>
    yargs.positional('keyword', { type: 'string', demandOption: true, description: 'Search keyword' }),
  handler: async (argv) => {
    const stop = spinner('Searching agents...');
    try {
      const response = await apiClient.get<Agent[]>(`/search/agents?keyword=${encodeURIComponent(argv.keyword)}`);
      stop();
      if (response.success) {
        if (response.data.length === 0) {
          UI.println(formatSuccess('No agents found matching your search.'));
        } else {
          UI.println(formatSuccess(`Found ${response.data.length} agent(s):`));
          UI.println(formatAgentList(response.data));
        }
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Search failed';
      logger.error('search agents failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      process.stderr.write(formatError(msg) + '\n');
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
      const response = await apiClient.get<User[]>(`/search/users?keyword=${encodeURIComponent(argv.keyword)}`);
      stop();
      if (response.success) {
        if (response.data.length === 0) {
          UI.println(formatSuccess('No users found matching your search.'));
        } else {
          UI.println(formatSuccess(`Found ${response.data.length} user(s):`));
          UI.println(formatUserList(response.data));
        }
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Search failed';
      logger.error('search users failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      process.stderr.write(formatError(msg) + '\n');
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
