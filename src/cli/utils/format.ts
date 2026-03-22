import chalk from 'chalk';
import Table from 'cli-table3';
import type {
  Agent,
  Friend,
  FriendRequestWithNames,
  Message,
  ConversationWithDetails,
  User,
  Config,
} from '../../core/types/index.js';

// ─── Agent formatting ───────────────────────────────────────────────────────
export function formatAgent(agent: Agent): string {
  const visibilityColor =
    {
      PUBLIC: chalk.green,
      SEMI_PUBLIC: chalk.yellow,
      FRIENDS_ONLY: chalk.blue,
      PRIVATE: chalk.red,
    }[agent.visibility] || chalk.white;

  return `
${chalk.bold('ID:')} ${agent.id}
${chalk.bold('Name:')} ${agent.name}
${chalk.bold('Full Name:')} ${agent.full_name}
${chalk.bold('Visibility:')} ${visibilityColor(agent.visibility)}
${chalk.bold('Created:')} ${new Date(agent.created_at).toLocaleString()}
  `.trim();
}

export function formatAgentList(agents: Agent[]): string {
  if (agents.length === 0) {
    return chalk.gray('No agents found.');
  }

  return agents
    .map((agent, index) => {
      const visibilityColor =
        {
          PUBLIC: chalk.green,
          SEMI_PUBLIC: chalk.yellow,
          FRIENDS_ONLY: chalk.blue,
          PRIVATE: chalk.red,
        }[agent.visibility] || chalk.white;

      return `${index + 1}. ${chalk.bold(agent.full_name)} (${agent.name}) - ${visibilityColor(agent.visibility)}`;
    })
    .join('\n');
}

export function createAgentTable(agents: Agent[]): string {
  if (agents.length === 0) {
    return chalk.gray('No agents found.');
  }

  const table = new Table({
    head: ['ID', 'Name', 'Full Name', 'Visibility'],
    style: { head: ['cyan'] },
    colWidths: [36, 15, 25, 12],
  });

  agents.forEach((agent) => {
    const visCode = { PUBLIC: '32', SEMI_PUBLIC: '33', FRIENDS_ONLY: '34', PRIVATE: '31' }[agent.visibility] ?? '37';
    table.push([
      chalk.dim(agent.id.slice(0, 8) + '...'),
      agent.name,
      agent.full_name,
      `\x1b[${visCode}m${agent.visibility}\x1b[0m`,
    ]);
  });

  return table.toString();
}

// ─── Friend formatting ──────────────────────────────────────────────────────
export function formatFriend(friend: Friend): string {
  return `${chalk.bold(friend.friend_full_name)} (${friend.friend_name})`;
}

export function formatFriendList(friends: Friend[]): string {
  if (friends.length === 0) {
    return chalk.gray('No friends found.');
  }

  return friends.map((friend, index) => `${index + 1}. ${formatFriend(friend)}`).join('\n');
}

export function formatFriendRequest(request: FriendRequestWithNames): string {
  return `
${chalk.bold('ID:')} ${request.id}
${chalk.bold('From:')} ${request.requester_full_name || request.requester_agent_id}
${chalk.bold('To:')} ${request.target_full_name || request.target_agent_id}
${chalk.bold('Status:')} ${chalk.yellow(request.status)}
${chalk.bold('Created:')} ${new Date(request.created_at).toLocaleString()}
  `.trim();
}

export function formatFriendRequestList(requests: FriendRequestWithNames[]): string {
  if (requests.length === 0) {
    return chalk.gray('No pending friend requests.');
  }

  return requests
    .map((request, index) => {
      const from = request.requester_full_name || request.requester_agent_id;
      const to = request.target_full_name || request.target_agent_id;
      return `${index + 1}. ${chalk.bold(from)} → ${to} [${chalk.yellow(request.status)}]`;
    })
    .join('\n');
}

// ─── Message formatting ─────────────────────────────────────────────────────
export function formatMessage(message: Message, currentAgentId?: string): string {
  const isMe = message.sender_id === currentAgentId;
  const prefix = isMe ? chalk.blue('You') : chalk.green(message.sender_id);
  const time = chalk.gray(new Date(message.created_at).toLocaleTimeString());

  return `[${time}] ${prefix}: ${message.content}`;
}

export function formatConversation(conversation: ConversationWithDetails): string {
  const otherParty = conversation.other_party_name || 'Unknown';
  const lastMessage = conversation.last_message
    ? chalk.gray(` - ${conversation.last_message.substring(0, 50)}...`)
    : '';

  return `${chalk.bold(otherParty)}${lastMessage}`;
}

export function formatConversationList(conversations: ConversationWithDetails[]): string {
  if (conversations.length === 0) {
    return chalk.gray('No conversations found.');
  }

  return conversations.map((conversation, index) => `${index + 1}. ${formatConversation(conversation)}`).join('\n');
}

// ─── User formatting ────────────────────────────────────────────────────────
export function formatUser(user: User): string {
  return `
${chalk.bold('ID:')} ${user.id}
${chalk.bold('Nickname:')} ${user.nickname}
${chalk.bold('Created:')} ${new Date(user.created_at).toLocaleString()}
  `.trim();
}

export function formatUserList(users: User[]): string {
  if (users.length === 0) {
    return chalk.gray('No users found.');
  }

  return users
    .map((user, index) => `${index + 1}. ${chalk.bold(user.nickname)} (${chalk.gray(user.id.substring(0, 8) + '...')})`)
    .join('\n');
}

// ─── Config formatting ──────────────────────────────────────────────────────
export function createConfigTable(config: Config): string {
  const table = new Table({
    head: ['Setting', 'Value'],
    style: { head: ['cyan'] },
    colWidths: [20, 40],
  });

  table.push(
    ['API URL', chalk.blue(config.apiUrl)],
    ['User Token', config.token ? chalk.green('***') : chalk.dim('not set')],
    ['Agent Token', config.agentToken ? chalk.green('***') : chalk.dim('not set')],
    ['Language', config.language ?? 'en']
  );

  return table.toString();
}

// ─── Status formatting ──────────────────────────────────────────────────────
export function formatError(message: string): string {
  return chalk.red(`✖ ${message}`);
}

export function formatSuccess(message: string): string {
  return chalk.green(`✔ ${message}`);
}

export function formatInfo(message: string): string {
  return chalk.blue(`ℹ ${message}`);
}

export function formatWarning(message: string): string {
  return chalk.yellow(`⚠ ${message}`);
}
