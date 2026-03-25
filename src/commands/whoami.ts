import type { CommandModule } from 'yargs';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface WhoamiArgs {
  workspace?: string;
}

interface WorkspaceConfig {
  email: string;
  token: string;
  userId: string;
  nickname: string;
  createdAt: string;
  currentAgent?: {
    id: string;
    name: string;
    full_name: string;
  };
}

/**
 * Whoami command - Display current logged-in user info
 * 
 * Usage: /whoami [--workspace ~/.im/t1/]
 */
const whoamiCommand: CommandModule<{}, WhoamiArgs> = {
  command: 'whoami',
  describe: 'Display current logged-in user information',
  builder: (yargs) =>
    yargs
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory path (default: ~/.magic-im/)',
        default: join(homedir(), '.magic-im'),
      }),
  handler: async (argv) => {
    try {
      // Determine workspace path (expand ~ to home directory, use default if not provided)
      const workspacePath = (argv.workspace || join(homedir(), '.magic-im')).replace(/^~/, homedir());
      const workspaceConfigFile = join(workspacePath, 'config.json');

      // Check if workspace config exists
      if (!existsSync(workspaceConfigFile)) {
        logger.error('No login session found', { workspace: workspacePath });
        process.stderr.write(UI.error(`Not logged in. Use "magic-im login" to authenticate.`) + '\n');
        process.stderr.write(UI.info(`Workspace: ${workspacePath}`) + '\n');
        process.exit(1);
      }

      // Read workspace config
      let config: WorkspaceConfig;
      try {
        const configData = readFileSync(workspaceConfigFile, 'utf-8');
        config = JSON.parse(configData) as WorkspaceConfig;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to read workspace config', { error: msg, workspace: workspacePath });
        process.stderr.write(UI.error(`Failed to read workspace config: ${msg}`) + '\n');
        process.exit(1);
      }

      // Validate config has required fields
      if (!config.email || !config.nickname || !config.userId) {
        logger.error('Invalid workspace config', { workspace: workspacePath });
        process.stderr.write(UI.error('Invalid workspace config. Please login again.') + '\n');
        process.exit(1);
      }

      // Display user info
      UI.println(UI.success(`Logged in as ${config.nickname} (${config.email})`));
      UI.println(UI.info(`User ID: ${config.userId}`));
      UI.println(UI.info(`Workspace: ${workspacePath}`));
      
      // Display current agent if set
      if (config.currentAgent) {
        UI.println(UI.info(`Current Agent: ${config.currentAgent.full_name} (${config.currentAgent.name})`));
      } else {
        UI.println(UI.info('Current Agent: (none selected)'));
      }
      
      if (config.createdAt) {
        const loginTime = new Date(config.createdAt).toLocaleString();
        UI.println(UI.info(`Login time: ${loginTime}`));
      }

      logger.info('Whoami successful', { 
        userId: config.userId, 
        email: config.email, 
        workspace: workspacePath 
      });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Whoami command failed', { 
        error: msg,
        stack: error instanceof Error ? error.stack : undefined
      });
      process.stderr.write(UI.error(`Whoami failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

export default whoamiCommand;
