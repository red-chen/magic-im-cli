import type { CommandModule } from 'yargs';
import { messageApi } from '../../core/api/index.js';
import { spinner } from '../utils/spinner.js';
import { println, printError } from '../utils/output.js';
import { formatSuccess, formatMessage, formatConversationList } from '../utils/format.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('message');

// ─── message send ────────────────────────────────────────────────────────────
const messageSend: CommandModule<{}, { 'receiver-id'?: string; 'receiver-full-name'?: string; content: string }> = {
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
      const response = await messageApi.sendMessage({
        receiverId: argv['receiver-id'],
        receiverFullName: argv['receiver-full-name'],
        content: argv.content,
      });
      stop();
      if (response.success) println(formatSuccess('Message sent successfully!'));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to send message';
      logger.error('message send failed', { message: msg });
      printError(msg);
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
    const stop = spinner('Fetching messages...');
    try {
      const response = await messageApi.pollMessages({
        lastMessageId: argv['last-message-id'],
        limit: argv.limit,
      });
      stop();
      if (response.success) {
        if (response.data.messages.length === 0) {
          println(formatSuccess('No new messages.'));
        } else {
          println(formatSuccess(`Found ${response.data.messages.length} message(s):`));
          response.data.messages.forEach((msg) => println(formatMessage(msg)));
          if (response.data.has_more) {
            println(formatSuccess('\nMore messages available. Use --last-message-id to fetch more.'));
          }
        }
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to poll messages';
      logger.error('message poll failed', { message: msg });
      printError(msg);
    }
  },
};

// ─── message group ───────────────────────────────────────────────────────────
export const messageCommands: CommandModule = {
  command: 'message <command>',
  describe: 'Message commands',
  builder: (yargs) =>
    yargs.command(messageSend).command(messagePoll).demandCommand(1, 'Please specify a message sub-command'),
  handler: () => {},
};

// ─── conversation list ───────────────────────────────────────────────────────
const conversationList: CommandModule = {
  command: 'list',
  describe: 'List all conversations',
  handler: async () => {
    const stop = spinner('Loading conversations...');
    try {
      const response = await messageApi.listConversations();
      stop();
      if (response.success) println(formatConversationList(response.data));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to load conversations';
      logger.error('conversation list failed', { message: msg });
      printError(msg);
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
    const stop = spinner('Loading messages...');
    try {
      const response = await messageApi.getConversationMessages({
        conversationId: argv.conversation_id,
        page: argv.page,
        pageSize: argv['page-size'],
      });
      stop();
      if (response.success) {
        if (response.data.length === 0) {
          println(formatSuccess('No messages in this conversation.'));
        } else {
          println(formatSuccess(`Found ${response.data.length} message(s):`));
          response.data.forEach((msg) => println(formatMessage(msg)));
        }
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to load messages';
      logger.error('conversation messages failed', { message: msg });
      printError(msg);
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
