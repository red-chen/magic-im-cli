import type { CommandModule } from 'yargs';
import { apiClient } from '../utils/api.js';
import { UI, spinner } from '../utils/ui.js';
import { getAgentId } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { Message } from '../types/index.js';

interface Conversation {
  id: string;
  agent1_id: string;
  agent2_id: string;
  created_at: string;
  updated_at: string;
  last_message_content: string | null;
  last_message_at: string | null;
  other_agent_id: string;
  other_agent_name: string;
  other_agent_full_name: string;
}

// ─── List conversations ───────────────────────────────────────────────────────

const listConversations = async (agentId: string, limit: number = 100): Promise<void> => {
  const stopSpinner = spinner('Loading conversations...');
  
  try {
    const response = await apiClient.get<Conversation[]>(
      `/messages/conversations?agent_id=${agentId}&limit=${limit}`
    );
    
    stopSpinner();
    
    if (!response.success) {
      UI.println(UI.error('Failed to load conversations'));
      return;
    }
    
    const conversations = response.data;
    
    if (conversations.length === 0) {
      UI.println(UI.info('No conversations yet'));
      return;
    }
    
    UI.println('');
    UI.println(UI.success(`Found ${conversations.length} conversation(s)`));
    UI.println('');
    
    conversations.forEach((conv, index) => {
      const time = conv.last_message_at 
        ? new Date(conv.last_message_at).toISOString()
        : 'No messages';
      UI.println(` ${index + 1}. ${conv.other_agent_full_name} 最新消息时间 ${time}`);
    });
    
    UI.println('');
  } catch (error) {
    stopSpinner();
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to list conversations', { error: msg });
    UI.println(UI.error(`Failed to load conversations: ${msg}`));
    process.exit(1);
  }
};

// ─── Show conversation messages ───────────────────────────────────────────────

const showConversation = async (agentId: string, otherAgentFullName: string): Promise<void> => {
  const stopSpinner = spinner('Loading messages...');
  
  try {
    const response = await apiClient.get<{
      messages: Message[];
      conversationId: string | null;
      otherAgentId: string | null;
    }>(
      `/messages/conversations/messages?agent_id=${agentId}&other_agent_full_name=${encodeURIComponent(otherAgentFullName)}&limit=20`
    );
    
    stopSpinner();
    
    if (!response.success) {
      UI.println(UI.error('Failed to load messages'));
      return;
    }
    
    const { messages, otherAgentId } = response.data;
    
    if (!otherAgentId) {
      UI.println(UI.error(`Agent "${otherAgentFullName}" not found`));
      process.exit(1);
    }
    
    UI.println('');
    UI.println(UI.success(`Conversation with ${otherAgentFullName}`));
    UI.println('');
    
    if (messages.length === 0) {
      UI.println(UI.info('No messages yet'));
    } else {
      messages.forEach((msg) => {
        const direction = msg.sender_id === agentId ? '>' : '<';
        const time = new Date(msg.created_at).toISOString();
        UI.println(`${direction} ${msg.content} - ${time}`);
      });
    }
    
    UI.println('');
    UI.println(UI.info('< 表示别的Agent发给我的消息，> 表示我发的消息'));
    UI.println('');
  } catch (error) {
    stopSpinner();
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to show conversation', { error: msg, otherAgentFullName });
    UI.println(UI.error(`Failed to load messages: ${msg}`));
    process.exit(1);
  }
};

// ─── Send message ─────────────────────────────────────────────────────────────

const sendMessage = async (agentId: string, content: string, to: string): Promise<void> => {
  const stopSpinner = spinner('Sending message...');
  
  try {
    // Determine receiver_id or receiver_full_name
    let receiverId: string | undefined;
    let receiverFullName: string | undefined;
    
    if (to.includes('#')) {
      receiverFullName = to;
    } else {
      receiverId = to;
    }
    
    const response = await apiClient.post('/messages', {
      agent_id: agentId,
      receiver_id: receiverId,
      receiver_full_name: receiverFullName,
      content: content,
    });
    
    stopSpinner();
    
    if (!response.success) {
      UI.println(UI.error('Failed to send message'));
      process.exit(1);
    }
    
    UI.println(UI.success(`Message sent to ${to}`));
  } catch (error) {
    stopSpinner();
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to send message', { error: msg, to, content });
    UI.println(UI.error(`Failed to send message: ${msg}`));
    process.exit(1);
  }
};

// ─── Yargs command module ─────────────────────────────────────────────────────

const conversationCommand: CommandModule<{}, { 
  agent?: string; 
  limit?: number;
  to?: string;
  message?: string;
}> = {
  command: 'conversation [action] [message]',
  describe: 'Manage conversations',
  builder: (yargs) =>
    yargs
      .positional('action', {
        type: 'string',
        description: 'Action to perform (list, send) or agent full name to view conversation',
      })
      .positional('message', {
        type: 'string',
        description: 'Message content (when action is "send")',
      })
      .option('agent', { 
        alias: 'a', 
        type: 'string', 
        description: 'Your agent ID (or use config default)' 
      })
      .option('limit', { 
        alias: 'l', 
        type: 'number', 
        description: 'Limit number of conversations',
        default: 100 
      })
      .option('to', { 
        alias: 't', 
        type: 'string', 
        description: 'Target agent full name (e.g., AgentName#UserName) or agent ID (required when action is "send")' 
      })
      .example('$0 conversation list', 'List all conversations')
      .example('$0 conversation list --limit 50', 'List top 50 conversations')
      .example('$0 conversation yuanhao#yuanhao', 'Show conversation with agent')
      .example('$0 conversation send "hello world" --to yuanhao#yuanhao', 'Send message to agent'),
  handler: async (argv) => {
    try {
      // Get agent ID from option or config (config reads from workspace config.json)
      const agentId = argv.agent || getAgentId();
      if (!agentId) {
        const errorMsg = 'Agent ID required. Use --agent or set default with "magic-im agent use <agent_id>"';
        logger.error('Conversation command failed: no agent ID');
        process.stderr.write(UI.error(errorMsg) + '\n');
        process.exit(1);
      }

      const action = argv.action as string | undefined;
      const message = argv.message as string | undefined;

      // Handle: conversation list
      if (action === 'list' || !action) {
        await listConversations(agentId, argv.limit);
        return;
      }

      // Handle: conversation send "message" --to agent
      if (action === 'send') {
        if (!message) {
          process.stderr.write(UI.error('Message content required') + '\n');
          process.exit(1);
        }
        if (!argv.to) {
          process.stderr.write(UI.error('--to option required for send action') + '\n');
          process.exit(1);
        }
        await sendMessage(agentId, message, argv.to);
        return;
      }

      // Handle: conversation <agent-full-name> (show conversation)
      // If action contains '#', treat it as agent full name
      if (action && action.includes('#')) {
        await showConversation(agentId, action);
        return;
      }

      // If we get here, the command was not understood
      process.stderr.write(UI.error('Invalid command. Use "magic-im conversation --help" for usage.') + '\n');
      process.exit(1);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Conversation command failed', { 
        error: msg, 
        stack: error instanceof Error ? error.stack : undefined 
      });
      process.stderr.write(UI.error(msg) + '\n');
      process.exit(1);
    }
  },
};

// Alias: conversations (plural) - same as conversation list
const conversationsCommand: CommandModule<{}, { agent?: string; limit?: number }> = {
  command: 'conversations',
  describe: 'List all conversations (alias for "conversation list")',
  builder: (yargs) =>
    yargs
      .option('agent', { 
        alias: 'a', 
        type: 'string', 
        description: 'Your agent ID (or use config default)' 
      })
      .option('limit', { 
        alias: 'l', 
        type: 'number', 
        description: 'Limit number of conversations',
        default: 100 
      }),
  handler: async (argv) => {
    try {
      const agentId = argv.agent || getAgentId();
      if (!agentId) {
        const errorMsg = 'Agent ID required. Use --agent or set default with "magic-im agent use <agent_id>"';
        logger.error('Conversations command failed: no agent ID');
        process.stderr.write(UI.error(errorMsg) + '\n');
        process.exit(1);
      }

      await listConversations(agentId, argv.limit);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Conversations command failed', { error: msg });
      process.stderr.write(UI.error(msg) + '\n');
      process.exit(1);
    }
  },
};

export default conversationCommand;
export { conversationsCommand };
