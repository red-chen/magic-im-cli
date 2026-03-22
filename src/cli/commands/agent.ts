import type { CommandModule } from 'yargs';
import { agentApi } from '../../core/api/index.js';
import type { AgentVisibility } from '../../core/types/index.js';
import { spinner } from '../utils/spinner.js';
import { println, printError, sectionHeader, divider, createSuccessBox, createErrorBox } from '../utils/output.js';
import { createAgentTable } from '../utils/format.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('agent');

const VISIBILITY_MAP: Record<string, AgentVisibility> = {
  public: 'PUBLIC',
  'semi-public': 'SEMI_PUBLIC',
  'friends-only': 'FRIENDS_ONLY',
  private: 'PRIVATE',
};

// Global JSON output mode
let isJsonMode = false;
export const setJsonMode = (value: boolean) => {
  isJsonMode = value;
};

// ─── agent create ────────────────────────────────────────────────────────────
const agentCreate: CommandModule<{}, { name: string; visibility: string }> = {
  command: 'create',
  describe: 'Create a new agent',
  builder: (yargs) =>
    yargs
      .option('name', { alias: 'n', type: 'string', demandOption: true, description: 'Agent name' })
      .option('visibility', {
        alias: 'v',
        type: 'string',
        default: 'public',
        choices: ['public', 'semi-public', 'friends-only', 'private'],
        description: 'Visibility',
      }),
  handler: async (argv) => {
    const stop = spinner('Creating agent...');
    try {
      const response = await agentApi.createAgent({
        name: argv.name,
        visibility: VISIBILITY_MAP[argv.visibility.toLowerCase()] ?? 'PUBLIC',
      });
      stop();
      if (response.success) {
        sectionHeader('Agent Created');
        println(createAgentTable([response.data]));
        divider();
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to create agent';
      logger.error('agent create failed', { message: msg });
      println(createErrorBox(msg));
      process.exit(1);
    }
  },
};

// ─── agent list ──────────────────────────────────────────────────────────────
const agentList: CommandModule = {
  command: 'list',
  describe: 'List all your agents',
  handler: async () => {
    const stop = spinner('Loading agents...');
    try {
      const response = await agentApi.listAgents();
      stop();
      if (response.success) {
        if (isJsonMode) {
          process.stdout.write(JSON.stringify({ success: true, data: response.data }) + '\n');
        } else {
          sectionHeader('Agent List');
          println(createAgentTable(response.data));
          divider();
        }
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to list agents';
      logger.error('agent list failed', { message: msg });
      if (isJsonMode) {
        process.stdout.write(JSON.stringify({ success: false, error: msg }) + '\n');
      } else {
        println(createErrorBox(msg));
      }
      process.exit(1);
    }
  },
};

// ─── agent get ───────────────────────────────────────────────────────────────
const agentGet: CommandModule<{}, { agent_id: string }> = {
  command: 'get <agent_id>',
  describe: 'Get agent details',
  builder: (yargs) =>
    yargs.positional('agent_id', { type: 'string', demandOption: true, description: 'Agent ID' }),
  handler: async (argv) => {
    const stop = spinner('Loading agent...');
    try {
      const response = await agentApi.getAgent(argv.agent_id);
      stop();
      if (response.success) {
        sectionHeader('Agent Details');
        println(createAgentTable([response.data]));
        divider();
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to get agent';
      logger.error('agent get failed', { message: msg });
      println(createErrorBox(msg));
      process.exit(1);
    }
  },
};

// ─── agent update ────────────────────────────────────────────────────────────
const agentUpdate: CommandModule<{}, { agent_id: string; name?: string; visibility?: string }> = {
  command: 'update <agent_id>',
  describe: 'Update an agent',
  builder: (yargs) =>
    yargs
      .positional('agent_id', { type: 'string', demandOption: true, description: 'Agent ID' })
      .option('name', { alias: 'n', type: 'string', description: 'New agent name' })
      .option('visibility', {
        alias: 'v',
        type: 'string',
        choices: ['public', 'semi-public', 'friends-only', 'private'],
        description: 'New visibility',
      }),
  handler: async (argv) => {
    const updates: { name?: string; visibility?: AgentVisibility } = {};
    if (argv.name) updates.name = argv.name;
    if (argv.visibility) updates.visibility = VISIBILITY_MAP[argv.visibility.toLowerCase()];

    if (Object.keys(updates).length === 0) {
      println(createErrorBox('No updates provided'));
      process.exit(1);
    }

    const stop = spinner('Updating agent...');
    try {
      const response = await agentApi.updateAgent(argv.agent_id, updates);
      stop();
      if (response.success) {
        sectionHeader('Agent Updated');
        println(createAgentTable([response.data]));
        divider();
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to update agent';
      logger.error('agent update failed', { message: msg });
      println(createErrorBox(msg));
      process.exit(1);
    }
  },
};

// ─── agent delete ────────────────────────────────────────────────────────────
const agentDelete: CommandModule<{}, { agent_id: string; force: boolean }> = {
  command: 'delete <agent_id>',
  describe: 'Delete an agent',
  builder: (yargs) =>
    yargs
      .positional('agent_id', { type: 'string', demandOption: true, description: 'Agent ID' })
      .option('force', { alias: 'f', type: 'boolean', default: false, description: 'Confirm deletion' }),
  handler: async (argv) => {
    if (!argv.force) {
      println(createErrorBox('Use --force to confirm deletion'));
      process.exit(1);
    }

    const stop = spinner('Deleting agent...');
    try {
      await agentApi.deleteAgent(argv.agent_id);
      stop();
      println(createSuccessBox('Agent deleted successfully!'));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to delete agent';
      logger.error('agent delete failed', { message: msg });
      println(createErrorBox(msg));
      process.exit(1);
    }
  },
};

// ─── agent group ─────────────────────────────────────────────────────────────
const agentCommands: CommandModule = {
  command: 'agent <command>',
  describe: 'Agent management commands',
  builder: (yargs) =>
    yargs
      .command(agentCreate)
      .command(agentList)
      .command(agentGet)
      .command(agentUpdate)
      .command(agentDelete)
      .demandCommand(1, 'Please specify an agent sub-command'),
  handler: () => {},
};

export default agentCommands;
