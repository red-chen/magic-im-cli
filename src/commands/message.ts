import type { CommandModule } from 'yargs';
import { apiClient } from '../utils/api.js';
import { UI, spinner } from '../utils/ui.js';
import {
  formatSuccess,
  formatError,
  formatMessage,
  formatConversationList,
} from '../utils/format.js';
import type { Message, Conversation } from '../types/index.js';
import { logger } from '../utils/logger.js';

// ─── message send ────────────────────────────────────────────────────────────
const messageSend: CommandModule<
  {},
  { 'receiver-id'?: string; 'receiver-full-name'?: string; content: string }
> = {
  command: 'send',
  describe: 'Send a message to an agent',
  builder: (yargs) =>
    yargs
      .option('receiver-id', { alias: 'r', type: 'string', description: 'Receiver agent ID' })
      .option('receiver-full-name', {
        alias: 'f',
        type: 'string',
        description: 'Receiver full name (e.g., AgentName#UserName)',
      })
      .option('content', { alias: 'c', type: 'string', demandOption: true, description: 'Message content' })
      .check((argv) => {
        if (!argv['receiver-id'] && !argv['receiver-full-name']) {
          throw new Error('Either --receiver-id or --receiver-full-name must be provided');
        }
        return true;
      }),
  handler: async (argv) => {
    const stop = spinner('Sending message...');
    try {
      const response = await apiClient.post<{ message: Message; conversation: Conversation }>('/messages', {
        receiver_id: argv['receiver-id'],
        receiver_full_name: argv['receiver-full-name'],
        content: argv.content,
      });
      stop();
      if (response.success) UI.println(formatSuccess('Message sent successfully!'));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to send message';
      logger.error('message send failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      process.stderr.write(formatError(msg) + '\n');
      process.exit(1);
    }
  },
};

// ─── message poll ────────────────────────────────────────────────────────────
const messagePoll: CommandModule<{}, { 'last-message-id'?: string; limit: number }> = {
  command: 'poll',
  describe: 'Poll for new messages',
  builder: (yargs) =>
    yargs
      .option('last-message-id', { alias: 'l', type: 'string', description: 'Last message ID for pagination' })
      .option('limit', { alias: 'n', type: 'number', default: 50, description: 'Number of messages to fetch' }),
  handler: async (argv) => {
    const params = new URLSearchParams();
    if (argv['last-message-id']) params.append('last_message_id', argv['last-message-id']);
    params.append('limit', String(argv.limit));

    const stop = spinner('Fetching messages...');
    try {
      const response = await apiClient.get<{ messages: Message[]; has_more: boolean }>(
        `/messages/poll?${params.toString()}`,
      );
      stop();
      if (response.success) {
        if (response.data.messages.length === 0) {
          UI.println(formatSuccess('No new messages.'));
        } else {
          UI.println(formatSuccess(`Found ${response.data.messages.length} message(s):`));
          response.data.messages.forEach((msg) => UI.println(formatMessage(msg)));
          if (response.data.has_more) {
            UI.println(formatSuccess('\nMore messages available. Use --last-message-id to fetch more.'));
          }
        }
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to poll messages';
      logger.error('message poll failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      process.stderr.write(formatError(msg) + '\n');
      process.exit(1);
    }
  },
};

// ─── message group ───────────────────────────────────────────────────────────
export const messageCommands: CommandModule = {
  command: 'message <command>',
  describe: 'Message commands',
  builder: (yargs) =>
    yargs
      .command(messageSend)
      .command(messagePoll)
      .demandCommand(1, 'Please specify a message sub-command'),
  handler: () => {},
};

// ─── conversation list ───────────────────────────────────────────────────────
const conversationList: CommandModule = {
  command: 'list',
  describe: 'List all conversations',
  handler: async () => {
    const stop = spinner('Loading conversations...');
    try {
      const response = await apiClient.get<
        (Conversation & { other_party_name?: string; last_message?: string })[]
      >('/messages/conversations');
      stop();
      if (response.success) UI.println(formatConversationList(response.data));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to load conversations';
      logger.error('conversation list failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      process.stderr.write(formatError(msg) + '\n');
      process.exit(1);
    }
  },
};

// ─── conversation messages ───────────────────────────────────────────────────
const conversationMessages: CommandModule<{}, { conversation_id: string; page: number; 'page-size': number }> = {
  command: 'messages <conversation_id>',
  describe: 'Get messages in a conversation',
  builder: (yargs) =>
    yargs
      .positional('conversation_id', { type: 'string', demandOption: true, description: 'Conversation ID' })
      .option('page', { alias: 'p', type: 'number', default: 1, description: 'Page number' })
      .option('page-size', { alias: 's', type: 'number', default: 50, description: 'Page size' }),
  handler: async (argv) => {
    const params = new URLSearchParams();
    params.append('page', String(argv.page));
    params.append('page_size', String(argv['page-size']));

    const stop = spinner('Loading messages...');
    try {
      const response = await apiClient.get<Message[]>(
        `/messages/conversations/${argv.conversation_id}/messages?${params.toString()}`,
      );
      stop();
      if (response.success) {
        if (response.data.length === 0) {
          UI.println(formatSuccess('No messages in this conversation.'));
        } else {
          UI.println(formatSuccess(`Found ${response.data.length} message(s):`));
          response.data.forEach((msg) => UI.println(formatMessage(msg)));
        }
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to load messages';
      logger.error('conversation messages failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      process.stderr.write(formatError(msg) + '\n');
      process.exit(1);
    }
  },
};

// ─── conversation group ──────────────────────────────────────────────────────
export const conversationCommands: CommandModule = {
  command: 'conversation <command>',
  describe: 'Conversation commands',
  builder: (yargs) =>
    yargs
      .command(conversationList)
      .command(conversationMessages)
      .demandCommand(1, 'Please specify a conversation sub-command'),
  handler: () => {},
};

export default messageCommands;
