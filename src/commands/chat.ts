import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { apiClient } from '../utils/api.js';
import { formatSuccess, formatError, formatMessage } from '../utils/format.js';
import { Message, Conversation, Agent } from '../types/index.js';
import { getAgentToken } from '../utils/config.js';

export const chatCommand = new Command('chat')
  .description('Start an interactive chat session with an agent')
  .argument('[target]', 'Target agent full name (e.g., AgentName#UserName) or agent ID')
  .option('-i, --agent-id <id>', 'Target agent ID')
  .action(async (target: string | undefined, options) => {
    try {
      // Check if we have agent token
      const agentToken = getAgentToken();
      if (!agentToken) {
        console.error(formatError('Agent token required. Use "magic-im auth agent-token <agent_id>" to generate one.'));
        process.exit(1);
      }

      let receiverId: string | undefined = options.agentId;
      let receiverFullName: string | undefined = target;

      // If target looks like a full name (contains #), use it as full name
      if (target && target.includes('#')) {
        receiverFullName = target;
        receiverId = undefined;
      } else if (target) {
        // Assume it's an ID
        receiverId = target;
        receiverFullName = undefined;
      }

      if (!receiverId && !receiverFullName) {
        console.error(formatError('Please provide a target agent (full name or ID)'));
        process.exit(1);
      }

      // Get receiver info
      let targetName = receiverFullName || receiverId;
      
      console.log(formatSuccess(`Starting chat with ${targetName}...`));
      console.log(formatSuccess('Type your message and press Enter to send.'));
      console.log(formatSuccess('Type "/quit" or "/q" to exit the chat.\n'));

      let lastMessageId: string | undefined;

      // Initial poll for existing messages
      await pollAndDisplayMessages(receiverId, receiverFullName, lastMessageId);

      // Chat loop
      while (true) {
        const { message } = await inquirer.prompt([{
          type: 'input',
          name: 'message',
          message: 'You:',
        }]);

        if (message.toLowerCase() === '/quit' || message.toLowerCase() === '/q') {
          console.log(formatSuccess('Chat ended.'));
          break;
        }

        if (!message.trim()) {
          continue;
        }

        // Send message
        try {
          await apiClient.post('/messages', {
            receiver_id: receiverId,
            receiver_full_name: receiverFullName,
            content: message,
          });
        } catch (error) {
          console.error(formatError(error instanceof Error ? error.message : 'Failed to send message'));
        }

        // Poll for new messages
        await pollAndDisplayMessages(receiverId, receiverFullName, lastMessageId);
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Chat failed'));
      process.exit(1);
    }
  });

async function pollAndDisplayMessages(
  receiverId: string | undefined,
  receiverFullName: string | undefined,
  lastMessageId: string | undefined
): Promise<string | undefined> {
  try {
    const params = new URLSearchParams();
    if (lastMessageId) params.append('last_message_id', lastMessageId);
    params.append('limit', '50');

    const response = await apiClient.get<{ messages: Message[]; has_more: boolean }>(`/messages/poll?${params.toString()}`);

    if (response.success && response.data.messages.length > 0) {
      // Filter messages related to this conversation
      const relevantMessages = response.data.messages.filter((msg) => {
        // Show messages from receiver or to receiver
        return true; // For now, show all messages
      });

      if (relevantMessages.length > 0) {
        relevantMessages.forEach((msg) => {
          console.log(formatMessage(msg));
        });
        return relevantMessages[relevantMessages.length - 1].id;
      }
    }
    return lastMessageId;
  } catch (error) {
    // Silently ignore polling errors
    return lastMessageId;
  }
}

export default chatCommand;
