import type { CommandModule } from 'yargs';
import { listFriends } from '../core/api/friend.api.js';
import { listAgents } from '../core/api/agent.api.js';
import type { Friend, Agent } from '../core/types/index.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { setToken } from '../core/config/config.js';

interface FriendListArgs {
  workspace?: string;
  agent?: string;
}

/**
 * Friend list command - List all friends for the current agent
 * 
 * Usage: magic-im friend list
 * 
 * Output format:
 *   - buxiao#buxiao
 *   - profile#yuanhao
 */
const friendListCommand: CommandModule<{}, FriendListArgs> = {
  command: 'list',
  describe: 'List all your friends',
  builder: (yargs) =>
    yargs
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory path (default: ~/.magic-im/)',
        default: join(homedir(), '.magic-im'),
      })
      .option('agent', {
        alias: 'a',
        type: 'string',
        description: 'Agent ID to list friends for (default: current agent)',
      }),
  handler: async (argv) => {
    try {
      // Determine workspace path
      const workspacePath = (argv.workspace || join(homedir(), '.magic-im')).replace(/^~/, homedir());
      const workspaceConfigFile = join(workspacePath, 'config.json');

      // Check if logged in
      if (!existsSync(workspaceConfigFile)) {
        logger.error('No login session found', { workspace: workspacePath });
        process.stderr.write(UI.error(`Not logged in. Use "magic-im login" to authenticate.`) + '\n');
        process.exit(1);
      }

      // Read workspace config for token and current agent
      let token: string;
      let currentAgentId: string | undefined;
      try {
        const configData = readFileSync(workspaceConfigFile, 'utf-8');
        const config = JSON.parse(configData);
        token = config.token;
        currentAgentId = config.currentAgent?.id;
        if (!token) {
          throw new Error('Token not found in config');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to read workspace config', { error: msg, workspace: workspacePath });
        process.stderr.write(UI.error(`Failed to read workspace config: ${msg}`) + '\n');
        process.exit(1);
      }

      // Set token for API client
      setToken(token);

      // Determine which agent to use
      let agentId = argv.agent || currentAgentId;
      
      // If no agent specified, get the default agent
      if (!agentId) {
        logger.info('No agent specified, fetching default agent', { workspace: workspacePath });
        
        const agentsResponse = await listAgents();
        if (!agentsResponse.success || !agentsResponse.data || agentsResponse.data.length === 0) {
          logger.error('No agents found for user', { workspace: workspacePath });
          process.stderr.write(UI.error(`No agents found. Use "magic-im agent create" to create an agent first.`) + '\n');
          process.exit(1);
        }
        
        // Find default agent or use the first one
        const defaultAgent = agentsResponse.data.find((agent: Agent) => agent.is_default);
        agentId = defaultAgent?.id || agentsResponse.data[0].id;
        
        logger.info('Using default agent', { agentId });
      }

      logger.info('Listing friends', { workspace: workspacePath, agentId });

      // Call list friends API
      const response = await listFriends(agentId);

      if (!response.success || !response.data) {
        const errorMsg = response.error
          ? (typeof response.error === 'string' ? response.error : response.error.message)
          : 'Failed to list friends';
        logger.error('List friends failed', { error: errorMsg });
        process.stderr.write(UI.error(`List friends failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      const friends: Friend[] = response.data;

      if (friends.length === 0) {
        UI.println(UI.warning('No friends found'));
        logger.info('Friends listed successfully', { count: 0 });
        return;
      }

      // Output format:
      //   - buxiao#buxiao
      //   - profile#yuanhao
      for (const friend of friends) {
        UI.println(`  - ${friend.friend_full_name}`);
      }

      logger.info('Friends listed successfully', { count: friends.length });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Friend list command failed', {
        error: msg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.stderr.write(UI.error(`List friends failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

/**
 * Friend command group - Manage friends
 * 
 * Usage: magic-im friend <subcommand>
 */
const friendCommand: CommandModule = {
  command: 'friend',
  describe: 'Manage your friends',
  builder: (yargs) =>
    yargs
      .command(friendListCommand)
      .demandCommand(1, 'You need to specify a subcommand (e.g., list)'),
  handler: () => {
    // This handler is called when no subcommand is provided
    // yargs will show help automatically due to demandCommand
  },
};

/**
 * Standalone /friends command - shorthand for /friend list
 */
const friendsCommand: CommandModule<{}, FriendListArgs> = {
  command: 'friends',
  describe: 'List all your friends (shorthand for /friend list)',
  builder: friendListCommand.builder,
  handler: friendListCommand.handler,
};

export default friendCommand;
export { friendsCommand };
