import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { apiClient } from '../utils/api.js';
import { Agent } from '../types/index.js';
import { 
  styles, 
  createBox, 
  createSuccessBox, 
  createErrorBox,
  createAgentTable,
  sectionHeader,
  divider,
} from '../utils/ui.js';
import { t } from '../utils/i18n.js';

export const agentCommands = new Command('agent')
  .description('Agent management commands');

// Create agent
agentCommands
  .command('create')
  .description('Create a new agent')
  .option('-n, --name <name>', 'Agent name')
  .option('-v, --visibility <visibility>', 'Visibility (public, semi-public, friends-only, private)', 'public')
  .action(async (options) => {
    try {
      let { name, visibility } = options;

      if (!name) {
        const answer = await inquirer.prompt([{
          type: 'input',
          name: 'name',
          message: 'Agent name:',
          validate: (input) => input.length > 0 || 'Name is required',
        }]);
        name = answer.name;
      }

      // Map visibility options
      const visibilityMap: Record<string, string> = {
        'public': 'PUBLIC',
        'semi-public': 'SEMI_PUBLIC',
        'friends-only': 'FRIENDS_ONLY',
        'private': 'PRIVATE',
      };

      const apiVisibility = visibilityMap[visibility.toLowerCase()] || 'PUBLIC';

      const spinner = ora('Creating agent...').start();
      const response = await apiClient.post<Agent>('/agents', {
        name,
        visibility: apiVisibility,
      });
      spinner.stop();

      if (response.success) {
        sectionHeader(t('agentCreated'));
        console.log(createAgentTable([response.data]));
        divider();
      }
    } catch (error) {
      console.log(createErrorBox(styles.error(error instanceof Error ? error.message : 'Failed to create agent')));
      process.exit(1);
    }
  });

// List agents
agentCommands
  .command('list')
  .description('List all your agents')
  .action(async () => {
    try {
      const spinner = ora({ text: chalk.cyan(t('agentList')), spinner: 'dots' }).start();
      const response = await apiClient.get<Agent[]>('/agents');
      spinner.stop();

      if (response.success) {
        sectionHeader(t('agentList'));
        console.log(createAgentTable(response.data));
        divider();
      }
    } catch (error) {
      console.log(createErrorBox(styles.error(error instanceof Error ? error.message : 'Failed to list agents')));
      process.exit(1);
    }
  });

// Get agent details
agentCommands
  .command('get <agent_id>')
  .description('Get agent details')
  .action(async (agentId: string) => {
    try {
      const spinner = ora({ text: chalk.cyan('Loading agent...'), spinner: 'dots' }).start();
      const response = await apiClient.get<Agent>(`/agents/${agentId}`);
      spinner.stop();

      if (response.success) {
        sectionHeader('Agent Details');
        console.log(createAgentTable([response.data]));
        divider();
      }
    } catch (error) {
      console.log(createErrorBox(styles.error(error instanceof Error ? error.message : 'Failed to get agent')));
      process.exit(1);
    }
  });

// Update agent
agentCommands
  .command('update <agent_id>')
  .description('Update an agent')
  .option('-n, --name <name>', 'New agent name')
  .option('-v, --visibility <visibility>', 'New visibility (public, semi-public, friends-only, private)')
  .action(async (agentId: string, options) => {
    try {
      const updates: { name?: string; visibility?: string } = {};

      if (options.name) {
        updates.name = options.name;
      }

      if (options.visibility) {
        const visibilityMap: Record<string, string> = {
          'public': 'PUBLIC',
          'semi-public': 'SEMI_PUBLIC',
          'friends-only': 'FRIENDS_ONLY',
          'private': 'PRIVATE',
        };
        updates.visibility = visibilityMap[options.visibility.toLowerCase()];
      }

      if (Object.keys(updates).length === 0) {
        console.log(createErrorBox(styles.error('No updates provided')));
        process.exit(1);
      }

      const spinner = ora({ text: chalk.cyan('Updating agent...'), spinner: 'dots' }).start();
      const response = await apiClient.patch<Agent>(`/agents/${agentId}`, updates);
      spinner.stop();

      if (response.success) {
        sectionHeader(t('agentUpdated'));
        console.log(createAgentTable([response.data]));
        divider();
      }
    } catch (error) {
      console.log(createErrorBox(styles.error(error instanceof Error ? error.message : 'Failed to update agent')));
      process.exit(1);
    }
  });

// Delete agent
agentCommands
  .command('delete <agent_id>')
  .description('Delete an agent')
  .option('-f, --force', 'Force deletion without confirmation')
  .action(async (agentId: string, options) => {
    try {
      if (!options.force) {
        const answer = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: chalk.yellow(`⚠ Are you sure you want to delete agent ${agentId}?`),
          default: false,
        }]);

        if (!answer.confirm) {
          console.log(styles.dim('Deletion cancelled'));
          return;
        }
      }

      const spinner = ora({ text: chalk.cyan('Deleting agent...'), spinner: 'dots' }).start();
      await apiClient.delete(`/agents/${agentId}`);
      spinner.stop();

      console.log(createSuccessBox(styles.success(t('agentDeleted'))));
    } catch (error) {
      console.log(createErrorBox(styles.error(error instanceof Error ? error.message : 'Failed to delete agent')));
      process.exit(1);
    }
  });

export default agentCommands;
