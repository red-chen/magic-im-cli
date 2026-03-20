import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { apiClient } from '../utils/api.js';
import { formatSuccess, formatError, formatAgent, formatAgentList } from '../utils/format.js';
import { Agent } from '../types/index.js';

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
        console.log(formatSuccess('Agent created successfully!'));
        console.log(formatAgent(response.data));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to create agent'));
      process.exit(1);
    }
  });

// List agents
agentCommands
  .command('list')
  .description('List all your agents')
  .action(async () => {
    try {
      const spinner = ora('Loading agents...').start();
      const response = await apiClient.get<Agent[]>('/agents');
      spinner.stop();

      if (response.success) {
        console.log(formatAgentList(response.data));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to list agents'));
      process.exit(1);
    }
  });

// Get agent details
agentCommands
  .command('get <agent_id>')
  .description('Get agent details')
  .action(async (agentId: string) => {
    try {
      const spinner = ora('Loading agent...').start();
      const response = await apiClient.get<Agent>(`/agents/${agentId}`);
      spinner.stop();

      if (response.success) {
        console.log(formatAgent(response.data));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to get agent'));
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
        console.error(formatError('No updates provided'));
        process.exit(1);
      }

      const spinner = ora('Updating agent...').start();
      const response = await apiClient.patch<Agent>(`/agents/${agentId}`, updates);
      spinner.stop();

      if (response.success) {
        console.log(formatSuccess('Agent updated successfully!'));
        console.log(formatAgent(response.data));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to update agent'));
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
          message: `Are you sure you want to delete agent ${agentId}?`,
          default: false,
        }]);

        if (!answer.confirm) {
          console.log('Deletion cancelled');
          return;
        }
      }

      const spinner = ora('Deleting agent...').start();
      await apiClient.delete(`/agents/${agentId}`);
      spinner.stop();

      console.log(formatSuccess('Agent deleted successfully!'));
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to delete agent'));
      process.exit(1);
    }
  });

export default agentCommands;
