import type { CommandModule } from 'yargs';
import { searchUsersWithAgents } from '../core/api/search.api.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { setToken } from '../core/config/config.js';

interface SearchArgs {
  workspace?: string;
  keyword: string;
}

/**
 * Search command - Search users and their agents
 * 
 * Usage: /search <keyword>
 * 
 * Output format:
 * nickname (***********)
 *   - agent1#nickname
 *   - agent2#nickname
 */
const searchCommand: CommandModule<{}, SearchArgs> = {
  command: 'search <keyword>',
  describe: 'Search users and their agents',
  builder: (yargs) =>
    yargs
      .positional('keyword', {
        type: 'string',
        description: 'Search keyword (nickname or email)',
        demandOption: true,
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory path (default: ~/.magic-im/)',
        default: join(homedir(), '.magic-im'),
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

      // Read workspace config for token
      let token: string;
      try {
        const configData = readFileSync(workspaceConfigFile, 'utf-8');
        const config = JSON.parse(configData);
        token = config.token;
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

      logger.info('Searching users', { keyword: argv.keyword, workspace: workspacePath });

      // Call search API
      const response = await searchUsersWithAgents(argv.keyword);

      if (!response.success || !response.data) {
        const errorMsg = response.error
          ? (typeof response.error === 'string' ? response.error : response.error.message)
          : 'Search failed';
        logger.error('Search failed', { error: errorMsg });
        process.stderr.write(UI.error(`Search failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      const results = response.data;

      if (results.length === 0) {
        UI.println(UI.warning('No users found'));
        logger.info('Search completed', { count: 0 });
        return;
      }

      // Output format:
      // nickname (***********)
      //   - agent1#nickname
      //   - agent2#nickname
      for (const result of results) {
        const user = result.user;
        const agents = result.agents;
        
        // Print user line with masked ID (show first 3 and last 3 chars)
        const maskedId = maskId(user.id);
        UI.println(`${user.nickname}（${maskedId}）`);
        
        // Print agents
        if (agents.length > 0) {
          for (const agent of agents) {
            UI.println(`  - ${agent.full_name}`);
          }
        } else {
          UI.println(`  - ${user.nickname}#${user.nickname} (default)`);
        }
        
        // Empty line between users
        UI.println('');
      }

      logger.info('Search completed', { count: results.length });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Search command failed', {
        error: msg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.stderr.write(UI.error(`Search failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

/**
 * Mask ID for privacy display
 * e.g., "550e8400-e29b-41d4-a716-446655440000" -> "550***000" or "***********"
 */
function maskId(id: string): string {
  if (!id || id.length < 6) {
    return '***********';
  }
  
  // Show first 3 chars and last 3 chars, mask the middle
  const first = id.substring(0, 3);
  const last = id.substring(id.length - 3);
  return `${first}***${last}`;
}

export default searchCommand;
