import { Command } from 'commander';
import ora from 'ora';
import { apiClient } from '../utils/api.js';
import { formatSuccess, formatError, formatAgentList } from '../utils/format.js';
import { Agent } from '../types/index.js';

export const searchCommands = new Command('search')
  .description('Search commands');

// Search agents
searchCommands
  .command('agents <keyword>')
  .description('Search for public/semi-public agents')
  .action(async (keyword: string) => {
    try {
      const spinner = ora('Searching agents...').start();
      const response = await apiClient.get<Agent[]>(`/search/agents?keyword=${encodeURIComponent(keyword)}`);
      spinner.stop();

      if (response.success) {
        if (response.data.length === 0) {
          console.log(formatSuccess('No agents found matching your search.'));
        } else {
          console.log(formatSuccess(`Found ${response.data.length} agent(s):`));
          console.log(formatAgentList(response.data));
        }
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Search failed'));
      process.exit(1);
    }
  });

export default searchCommands;
