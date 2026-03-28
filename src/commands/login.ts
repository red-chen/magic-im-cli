import type { CommandModule } from 'yargs';
import { login, type LoginParams } from '../core/api/auth.api.js';
import { listAgents } from '../core/api/agent.api.js';
import { setToken } from '../core/config/config.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Agent } from '../core/types/index.js';

interface LoginArgs {
  workspace?: string;
  mail?: string;
  password?: string;
}

/**
 * Login command - Authenticate user and save token to workspace config
 * 
 * Usage: /login --workspace ~/.im/t1/ --mail leo@magic-im.cc --password 12345678
 */
const loginCommand: CommandModule<{}, LoginArgs> = {
  command: 'login',
  describe: 'Sign in to your account and save credentials to workspace',
  builder: (yargs) =>
    yargs
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory path (default: ~/.magic-im/)',
        default: join(homedir(), '.magic-im'),
      })
      .option('mail', {
        alias: 'm',
        type: 'string',
        description: 'Email address',
      })
      .option('password', {
        alias: 'p',
        type: 'string',
        description: 'Password',
      }),
  handler: async (argv) => {
    try {
      // Validate required arguments
      if (!argv.mail) {
        logger.error('Login failed: email is required');
        process.stderr.write(UI.error('Email is required. Use --mail <email>') + '\n');
        process.exit(1);
      }

      if (!argv.password) {
        logger.error('Login failed: password is required');
        process.stderr.write(UI.error('Password is required. Use --password <password>') + '\n');
        process.exit(1);
      }

      // Determine workspace path (expand ~ to home directory, use default if not provided)
      const workspacePath = (argv.workspace || join(homedir(), '.magic-im')).replace(/^~/, homedir());

      logger.info('Attempting login', { email: argv.mail, workspace: workspacePath });

      // Call login API
      const loginParams: LoginParams = {
        email: argv.mail,
        password: argv.password,
      };

      const response = await login(loginParams);

      if (!response.success || !response.data) {
        const errorMsg = response.error 
          ? (typeof response.error === 'string' ? response.error : response.error.message)
          : 'Authentication failed';
        logger.error('Login failed', { error: errorMsg });
        process.stderr.write(UI.error(`Login failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      const { token, user } = response.data;

      // Get default agent after login
      let currentAgent: { id: string; name: string; full_name: string } | undefined;
      try {
        setToken(token);
        const agentsResponse = await listAgents();
        if (agentsResponse.success && agentsResponse.data && agentsResponse.data.length > 0) {
          const defaultAgent = agentsResponse.data.find((agent: Agent) => agent.is_default);
          const agentToUse = defaultAgent || agentsResponse.data[0];
          currentAgent = {
            id: agentToUse.id,
            name: agentToUse.name,
            full_name: agentToUse.full_name,
          };
        }
      } catch (error) {
        logger.warn('Failed to get default agent', { error: error instanceof Error ? error.message : String(error) });
      }

      // Save token to workspace config only (workspace-isolated)
      const workspaceConfigDir = workspacePath;
      const workspaceConfigFile = join(workspaceConfigDir, 'config.json');

      try {
        // Ensure workspace directory exists
        if (!existsSync(workspaceConfigDir)) {
          mkdirSync(workspaceConfigDir, { recursive: true });
        }

        // Write workspace config with current agent
        const workspaceConfig = {
          email: argv.mail,
          token: token,
          userId: user.id,
          nickname: user.nickname,
          createdAt: new Date().toISOString(),
          currentAgent: currentAgent,
        };

        writeFileSync(workspaceConfigFile, JSON.stringify(workspaceConfig, null, 2), 'utf-8');
        logger.info('Workspace config saved', { workspace: workspacePath, currentAgent: currentAgent?.full_name });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to save workspace config', { error: msg, workspace: workspacePath });
        process.stderr.write(UI.error(`Failed to save workspace config: ${msg}`) + '\n');
        process.exit(1);
      }

      // Success output
      UI.println(UI.success(`Successfully logged in as ${user.nickname} (${user.email})`));
      UI.println(UI.info(`Token saved to: ${workspaceConfigFile}`));
      UI.println(UI.info(`Workspace: ${workspacePath}`));
      if (currentAgent) {
        UI.println(UI.info(`Current Agent: ${currentAgent.full_name}`));
      }
      
      logger.info('Login successful', { 
        userId: user.id, 
        email: user.email, 
        workspace: workspacePath 
      });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Login command failed', { 
        error: msg,
        stack: error instanceof Error ? error.stack : undefined
      });
      process.stderr.write(UI.error(`Login failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

export default loginCommand;
