import { Command } from 'commander';
import { configManager } from '../config/store.js';
import { apiClient, handleApiError } from '../api/client.js';
import { output } from '../utils/output.js';

function requireAuth() {
  if (!configManager.isLoggedIn()) {
    output.error('Please login first: magic-im login');
    process.exit(1);
  }
}

export function registerMessageCommands(program: Command) {
  // send command
  program
    .command('send')
    .description('Send a message')
    .argument('<target_id>', 'Target agent ID or group ID')
    .argument('<message>', 'Message content')
    .option('--json', 'Send as JSON message')
    .action(async (targetId: string, message: string, options: { json?: boolean }) => {
      requireAuth();
      try {
        const contentType = options.json ? 'json' : 'text';
        await apiClient.sendMessage(targetId, message, contentType);
        output.success('Message sent');
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // history command
  program
    .command('history')
    .description('Get message history')
    .argument('<conversation_id>', 'Conversation UUID')
    .option('-l, --limit <number>', 'Number of messages', '50')
    .action(async (conversationId: string, options: { limit: string }) => {
      requireAuth();
      try {
        const limit = parseInt(options.limit, 10);
        const messages = await apiClient.getHistory(conversationId, undefined, limit);
        
        if (messages.length === 0) {
          output.info('No messages in this conversation');
          return;
        }

        messages.forEach((m: any) => {
          output.message(m.from, m.content, m.createdAt);
        });
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // listen command
  program
    .command('listen')
    .description('Listen for new messages (polling mode)')
    .option('-i, --interval <seconds>', 'Polling interval in seconds', '5')
    .action(async (options: { interval: string }) => {
      requireAuth();
      
      const interval = parseInt(options.interval, 10) * 1000;
      output.info('Listening for messages... (Ctrl+C to stop)');

      const poll = async () => {
        try {
          const result = await apiClient.syncMessages(100);
          
          if (result.messages.length > 0) {
            result.messages.forEach((m: any) => {
              output.message(m.from, m.content, m.createdAt);
            });
          }
        } catch (error) {
          output.error(handleApiError(error));
        }
      };

      // Initial poll
      await poll();

      // Set up interval
      const timer = setInterval(poll, interval);

      // Handle exit
      process.on('SIGINT', () => {
        clearInterval(timer);
        console.log('\nStopped listening');
        process.exit(0);
      });
    });

  // search command
  program
    .command('search')
    .description('Search for agents')
    .argument('<query>', 'Search query')
    .action(async (query: string) => {
      requireAuth();
      try {
        const agents = await apiClient.searchAgents(query);
        if (agents.length === 0) {
          output.info('No agents found');
          return;
        }

        output.header('Search Results');
        agents.forEach((a: any) => {
          const statusIcon = a.status === 'online' ? '🟢' : a.status === 'busy' ? '🟡' : '⚪';
          console.log(`  ${statusIcon} ${a.name} (${a.agentId})`);
        });
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // info command
  program
    .command('info')
    .description('Get agent info')
    .argument('<agent_id>', 'Agent ID')
    .action(async (agentId: string) => {
      requireAuth();
      try {
        const agent = await apiClient.getAgent(agentId);
        output.header(`Agent: ${agent.name}`);
        output.keyValue({
          'Agent ID': agent.agentId,
          'Name': agent.name,
          'Status': agent.status,
          'Created': new Date(agent.createdAt).toLocaleString(),
          'Last Seen': new Date(agent.lastSeenAt).toLocaleString(),
        });
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });
}
