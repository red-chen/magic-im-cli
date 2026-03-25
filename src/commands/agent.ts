import type { CommandModule } from 'yargs';
import { createAgent, listAgents, type CreateAgentParams } from '../core/api/agent.api.js';
import type { AgentVisibility } from '../core/types/index.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { setToken } from '../core/config/config.js';

const MAX_AGENTS_PER_USER = 10;

interface AgentCreateArgs {
  workspace?: string;
  name: string;
  desc?: string;
  visibility?: string;
}

// Visibility mapping: CLI input -> API value
const visibilityMap: Record<string, AgentVisibility> = {
  'public': 'PUBLIC',
  'private': 'PRIVATE',
  'semi_public': 'SEMI_PUBLIC',
};

/**
 * Agent create command - Create a new agent for the current user
 * 
 * Usage: /agent create <name> --desc "" --visibility public|private|semi_public
 */
const agentCreateCommand: CommandModule<{}, AgentCreateArgs> = {
  command: 'create <name>',
  describe: 'Create a new agent for your account',
  builder: (yargs) =>
    yargs
      .positional('name', {
        type: 'string',
        description: 'Agent name (unique per user)',
        demandOption: true,
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory path (default: ~/.magic-im/)',
        default: join(homedir(), '.magic-im'),
      })
      .option('desc', {
        alias: 'd',
        type: 'string',
        description: 'Agent description',
        default: '',
      })
      .option('visibility', {
        alias: 'V',
        type: 'string',
        description: 'Agent visibility: public, private (default), semi_public',
        default: 'private',
        choices: ['public', 'private', 'semi_public'],
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

      // Validate and map visibility
      const visibility = visibilityMap[argv.visibility || 'private'];
      if (!visibility) {
        logger.error('Invalid visibility option', { visibility: argv.visibility });
        process.stderr.write(UI.error(`Invalid visibility: ${argv.visibility}. Use public, private, or semi_public.`) + '\n');
        process.exit(1);
      }

      logger.info('Creating agent', { name: argv.name, visibility, workspace: workspacePath });

      // Call create agent API
      const params: CreateAgentParams = {
        name: argv.name,
        description: argv.desc,
        visibility,
      };

      const response = await createAgent(params);

      if (!response.success || !response.data) {
        const errorMsg = response.error
          ? (typeof response.error === 'string' ? response.error : response.error.message)
          : 'Failed to create agent';
        logger.error('Create agent failed', { error: errorMsg });
        process.stderr.write(UI.error(`Create agent failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      const agent = response.data;

      // Success output
      UI.println(UI.success(`Agent created successfully!`));
      UI.println(UI.info(`Name: ${agent.name}`));
      UI.println(UI.info(`Full Name: ${agent.full_name}`));
      UI.println(UI.info(`ID: ${agent.id}`));
      UI.println(UI.info(`Visibility: ${agent.visibility.toLowerCase()}`));
      if (agent.description) {
        UI.println(UI.info(`Description: ${agent.description}`));
      }

      logger.info('Agent created successfully', {
        agentId: agent.id,
        name: agent.name,
        fullName: agent.full_name,
        visibility: agent.visibility,
      });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Agent create command failed', {
        error: msg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.stderr.write(UI.error(`Create agent failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

interface AgentListArgs {
  workspace?: string;
}

/**
 * Agent list command - List all agents for the current user
 * 
 * Usage: /agent list or /agents
 */
const agentListCommand: CommandModule<{}, AgentListArgs> = {
  command: 'list',
  describe: 'List all your agents',
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

      logger.info('Listing agents', { workspace: workspacePath });

      // Call list agents API
      const response = await listAgents();

      if (!response.success || !response.data) {
        const errorMsg = response.error
          ? (typeof response.error === 'string' ? response.error : response.error.message)
          : 'Failed to list agents';
        logger.error('List agents failed', { error: errorMsg });
        process.stderr.write(UI.error(`List agents failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      const agents = response.data;

      // Output format: (X/10)\n - agent1#nick [visibility] (current)\n - agent2#nick [visibility]\n ...
      UI.println(`(${agents.length}/${MAX_AGENTS_PER_USER})`);
      for (const agent of agents) {
        const currentMark = agent.id === currentAgentId ? ' (current)' : '';
        const visibilityLabel = `[${agent.visibility.toLowerCase()}]`;
        UI.println(` - ${agent.full_name} ${visibilityLabel}${currentMark}`);
      }

      logger.info('Agents listed successfully', { count: agents.length });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Agent list command failed', {
        error: msg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.stderr.write(UI.error(`List agents failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

/**
 * Agent command group - Manage agents for your account
 * 
 * Usage: /agent <subcommand>
 */
const agentCommand: CommandModule = {
  command: 'agent',
  describe: 'Manage agents for your account',
  builder: (yargs) =>
    yargs
      .command(agentCreateCommand)
      .command(agentListCommand)
      .demandCommand(1, 'You need to specify a subcommand (e.g., create, list)'),
  handler: () => {
    // This handler is called when no subcommand is provided
    // yargs will show help automatically due to demandCommand
  },
};

/**
 * Standalone /agents command - shorthand for /agent list
 */
const agentsCommand: CommandModule<{}, AgentListArgs> = {
  command: 'agents',
  describe: 'List all your agents (shorthand for /agent list)',
  builder: agentListCommand.builder,
  handler: agentListCommand.handler,
};

export default agentCommand;
export { agentsCommand };
