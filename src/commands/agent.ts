import type { CommandModule } from 'yargs';
import { apiClient } from '../utils/api.js';
import { UI, spinner, createAgentTable, createSuccessBox, createErrorBox, sectionHeader, divider } from '../utils/ui.js';
import { t } from '../utils/i18n.js';
import type { Agent } from '../types/index.js';
import { logger } from '../utils/logger.js';

// JSON mode flag (for backward compatibility with TUI mode)
let isJsonMode = false;
export const setJsonMode = (value: boolean) => {
  isJsonMode = value;
};

const VISIBILITY_MAP: Record<string, string> = {
  public: 'PUBLIC',
  'semi-public': 'SEMI_PUBLIC',
  'friends-only': 'FRIENDS_ONLY',
  private: 'PRIVATE',
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
      const response = await apiClient.post<Agent>('/agents', {
        name: argv.name,
        visibility: VISIBILITY_MAP[argv.visibility.toLowerCase()] ?? 'PUBLIC',
      });
      stop();
      if (response.success) {
        sectionHeader(t('agentCreated'));
        UI.println(createAgentTable([response.data]));
        divider();
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to create agent';
      logger.error('agent create failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      UI.println(createErrorBox(UI.error(msg)));
    }
  },
};

// ─── agent list ──────────────────────────────────────────────────────────────
const agentList: CommandModule = {
  command: 'list',
  describe: 'List all your agents',
  handler: async () => {
    const stop = spinner(t('agentList'));
    try {
      const response = await apiClient.get<Agent[]>('/agents');
      stop();
      if (response.success) {
        if (isJsonMode) {
          process.stdout.write(JSON.stringify({ success: true, data: response.data }) + '\n');
        } else {
          sectionHeader(t('agentList'));
          UI.println(createAgentTable(response.data));
          divider();
        }
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to list agents';
      logger.error('agent list failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      if (isJsonMode) {
        process.stdout.write(JSON.stringify({ success: false, error: msg }) + '\n');
      } else {
        UI.println(createErrorBox(UI.error(msg)));
      }
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
      const response = await apiClient.get<Agent>(`/agents/${argv.agent_id}`);
      stop();
      if (response.success) {
        sectionHeader('Agent Details');
        UI.println(createAgentTable([response.data]));
        divider();
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to get agent';
      logger.error('agent get failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      UI.println(createErrorBox(UI.error(msg)));
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
    const updates: { name?: string; visibility?: string } = {};
    if (argv.name) updates.name = argv.name;
    if (argv.visibility) updates.visibility = VISIBILITY_MAP[argv.visibility.toLowerCase()];

    if (Object.keys(updates).length === 0) {
      UI.println(createErrorBox(UI.error('No updates provided')));
      return;
    }

    const stop = spinner('Updating agent...');
    try {
      const response = await apiClient.patch<Agent>(`/agents/${argv.agent_id}`, updates);
      stop();
      if (response.success) {
        sectionHeader(t('agentUpdated'));
        UI.println(createAgentTable([response.data]));
        divider();
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to update agent';
      logger.error('agent update failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      UI.println(createErrorBox(UI.error(msg)));
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
      UI.println(createErrorBox(UI.error('Use --force to confirm deletion')));
      return;
    }

    const stop = spinner('Deleting agent...');
    try {
      await apiClient.delete(`/agents/${argv.agent_id}`);
      stop();
      UI.println(createSuccessBox(UI.success(t('agentDeleted'))));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to delete agent';
      logger.error('agent delete failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      UI.println(createErrorBox(UI.error(msg)));
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
