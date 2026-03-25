import type { CommandModule } from 'yargs';
import { agentApi } from '../core/api/index.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { setToken } from '../core/config/config.js';
import type { Agent } from '../core/types/index.js';

interface SwitchArgs {
  workspace?: string;
  agent?: string;
}

/**
 * Switch command - Switch to a specific agent for interactions
 * 
 * Usage: 
 *   magic-im switch --agent coding     # Switch to agent by name
 *   magic-im switch                    # Interactive selection
 */
const switchCommand: CommandModule<{}, SwitchArgs> = {
  command: 'switch',
  describe: 'Switch to a specific agent for interactions',
  builder: (yargs) =>
    yargs
      .option('agent', {
        alias: 'a',
        type: 'string',
        description: 'Agent name to switch to (e.g., coding)',
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
        process.stderr.write(UI.error('Not logged in. Use "magic-im login" to authenticate.') + '\n');
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

      // Get list of agents
      logger.info('Fetching agents list', { workspace: workspacePath });
      const agentsResponse = await agentApi.listAgents();

      if (!agentsResponse.success || !agentsResponse.data) {
        const errorMsg = agentsResponse.error
          ? (typeof agentsResponse.error === 'string' ? agentsResponse.error : agentsResponse.error.message)
          : 'Failed to fetch agents';
        logger.error('Failed to fetch agents', { error: errorMsg });
        process.stderr.write(UI.error(`Failed to fetch agents: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      const agents = agentsResponse.data;

      if (agents.length === 0) {
        UI.println(UI.warning('No agents found. Create one with "magic-im agent create <name>"'));
        logger.info('No agents available');
        process.exit(0);
      }

      let selectedAgent: Agent | undefined;

      // If agent name is provided, find it
      if (argv.agent) {
        selectedAgent = agents.find(a => a.name === argv.agent);
        if (!selectedAgent) {
          logger.error('Agent not found', { agentName: argv.agent });
          process.stderr.write(UI.error(`Agent "${argv.agent}" not found. Available agents:`) + '\n');
          agents.forEach(agent => {
            UI.println(`  - ${agent.name} (${agent.full_name})`);
          });
          process.exit(1);
        }
      } else {
        // Interactive selection - show list and let user choose
        UI.println(UI.info('Available agents:'));
        UI.println('');
        
        agents.forEach((agent, index) => {
          const marker = agent.is_default ? ' [default]' : '';
          UI.println(`  ${index + 1}. ${agent.name} (${agent.full_name})${marker}`);
          if (agent.description) {
            UI.println(`     ${agent.description}`);
          }
        });
        
        UI.println('');
        UI.println(UI.info('Use "magic-im switch --agent <name>" to select an agent'));
        process.exit(0);
      }

      // Update workspace config with current agent info
      try {
        const configData = readFileSync(workspaceConfigFile, 'utf-8');
        const config = JSON.parse(configData);
        
        config.currentAgent = {
          id: selectedAgent.id,
          name: selectedAgent.name,
          full_name: selectedAgent.full_name,
        };
        
        writeFileSync(workspaceConfigFile, JSON.stringify(config, null, 2), 'utf-8');
        logger.info('Workspace config updated with current agent', { agentId: selectedAgent.id });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to update workspace config', { error: msg });
        process.stderr.write(UI.error(`Failed to save agent configuration: ${msg}`) + '\n');
        process.exit(1);
      }

      // Success output
      UI.println(UI.success(`Switched to agent: ${selectedAgent.full_name}`));
      UI.println(UI.info(`Agent ID: ${selectedAgent.id}`));
      UI.println(UI.info(`All subsequent operations will use this agent`));
      
      logger.info('Agent switch successful', { 
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        workspace: workspacePath 
      });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Switch command failed', { 
        error: msg,
        stack: error instanceof Error ? error.stack : undefined
      });
      process.stderr.write(UI.error(`Switch failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

export default switchCommand;
