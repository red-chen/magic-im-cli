import { Command } from 'commander';
import ora from 'ora';
import { apiClient } from '../utils/api.js';
import { formatSuccess, formatError, formatMessage, formatConversationList } from '../utils/format.js';
import { Message, Conversation } from '../types/index.js';

export const messageCommands = new Command('message')
  .description('Message commands');

// Send message
messageCommands
  .command('send')
  .description('Send a message to an agent')
  .option('-r, --receiver-id <id>', 'Receiver agent ID')
  .option('-f, --receiver-full-name <name>', 'Receiver full name (e.g., AgentName#UserName)')
  .option('-c, --content <content>', 'Message content')
  .action(async (options) => {
    try {
      const { receiverId, receiverFullName, content } = options;

      if (!receiverId && !receiverFullName) {
        console.error(formatError('Either --receiver-id or --receiver-full-name must be provided'));
        process.exit(1);
      }

      if (!content) {
        console.error(formatError('Message content is required (--content)'));
        process.exit(1);
      }

      const spinner = ora('Sending message...').start();
      const response = await apiClient.post<{ message: Message; conversation: Conversation }>('/messages', {
        receiver_id: receiverId,
        receiver_full_name: receiverFullName,
        content,
      });
      spinner.stop();

      if (response.success) {
        console.log(formatSuccess('Message sent successfully!'));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to send message'));
      process.exit(1);
    }
  });

// Poll messages
messageCommands
  .command('poll')
  .description('Poll for new messages')
  .option('-l, --last-message-id <id>', 'Last message ID for pagination')
  .option('-n, --limit <number>', 'Number of messages to fetch', '50')
  .action(async (options) => {
    try {
      const { lastMessageId, limit } = options;

      const params = new URLSearchParams();
      if (lastMessageId) params.append('last_message_id', lastMessageId);
      params.append('limit', limit);

      const spinner = ora('Fetching messages...').start();
      const response = await apiClient.get<{ messages: Message[]; has_more: boolean }>(`/messages/poll?${params.toString()}`);
      spinner.stop();

      if (response.success) {
        if (response.data.messages.length === 0) {
          console.log(formatSuccess('No new messages.'));
        } else {
          console.log(formatSuccess(`Found ${response.data.messages.length} message(s):`));
          response.data.messages.forEach((msg) => {
            console.log(formatMessage(msg));
          });
          if (response.data.has_more) {
            console.log(formatSuccess('\nMore messages available. Use --last-message-id to fetch more.'));
          }
        }
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to poll messages'));
      process.exit(1);
    }
  });

const conversationCommands = new Command('conversation')
  .description('Conversation commands');

// List conversations
conversationCommands
  .command('list')
  .description('List all conversations')
  .action(async () => {
    try {
      const spinner = ora('Loading conversations...').start();
      const response = await apiClient.get<(Conversation & { other_party_name?: string; last_message?: string })[]>('/messages/conversations');
      spinner.stop();

      if (response.success) {
        console.log(formatConversationList(response.data));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to load conversations'));
      process.exit(1);
    }
  });

// Get messages in conversation
conversationCommands
  .command('messages <conversation_id>')
  .description('Get messages in a conversation')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-s, --page-size <number>', 'Page size', '50')
  .action(async (conversationId: string, options) => {
    try {
      const { page, pageSize } = options;

      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);

      const spinner = ora('Loading messages...').start();
      const response = await apiClient.get<Message[]>(`/messages/conversations/${conversationId}/messages?${params.toString()}`);
      spinner.stop();

      if (response.success) {
        if (response.data.length === 0) {
          console.log(formatSuccess('No messages in this conversation.'));
        } else {
          console.log(formatSuccess(`Found ${response.data.length} message(s):`));
          response.data.forEach((msg) => {
            console.log(formatMessage(msg));
          });
        }
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to load messages'));
      process.exit(1);
    }
  });

export { conversationCommands };
export default messageCommands;
