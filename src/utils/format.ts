import chalk from 'chalk';
import { Agent, Friend, FriendRequest, Message, Conversation, User } from '../types/index.js';

export const formatAgent = (agent: Agent): string => {
  const visibilityColor = {
    'PUBLIC': chalk.green,
    'SEMI_PUBLIC': chalk.yellow,
    'FRIENDS_ONLY': chalk.blue,
    'PRIVATE': chalk.red,
  }[agent.visibility] || chalk.white;

  return `
${chalk.bold('ID:')} ${agent.id}
${chalk.bold('Name:')} ${agent.name}
${chalk.bold('Full Name:')} ${agent.full_name}
${chalk.bold('Visibility:')} ${visibilityColor(agent.visibility)}
${chalk.bold('Created:')} ${new Date(agent.created_at).toLocaleString()}
  `.trim();
};

export const formatAgentList = (agents: Agent[]): string => {
  if (agents.length === 0) {
    return chalk.gray('No agents found.');
  }

  return agents.map((agent, index) => {
    const visibilityColor = {
      'PUBLIC': chalk.green,
      'SEMI_PUBLIC': chalk.yellow,
      'FRIENDS_ONLY': chalk.blue,
      'PRIVATE': chalk.red,
    }[agent.visibility] || chalk.white;

    return `${index + 1}. ${chalk.bold(agent.full_name)} (${agent.name}) - ${visibilityColor(agent.visibility)}`;
  }).join('\n');
};

export const formatFriend = (friend: Friend): string => {
  return `${chalk.bold(friend.friend_full_name)} (${friend.friend_name})`;
};

export const formatFriendList = (friends: Friend[]): string => {
  if (friends.length === 0) {
    return chalk.gray('No friends found.');
  }

  return friends.map((friend, index) => {
    return `${index + 1}. ${formatFriend(friend)}`;
  }).join('\n');
};

export const formatFriendRequest = (request: FriendRequest & { requester_full_name?: string; target_full_name?: string }): string => {
  return `
${chalk.bold('ID:')} ${request.id}
${chalk.bold('From:')} ${request.requester_full_name || request.requester_agent_id}
${chalk.bold('To:')} ${request.target_full_name || request.target_agent_id}
${chalk.bold('Status:')} ${chalk.yellow(request.status)}
${chalk.bold('Created:')} ${new Date(request.created_at).toLocaleString()}
  `.trim();
};

export const formatFriendRequestList = (requests: (FriendRequest & { requester_full_name?: string; target_full_name?: string })[]): string => {
  if (requests.length === 0) {
    return chalk.gray('No pending friend requests.');
  }

  return requests.map((request, index) => {
    return `${index + 1}. ${chalk.bold(request.requester_full_name || request.requester_agent_id)} → ${request.target_full_name || request.target_agent_id} [${chalk.yellow(request.status)}]`;
  }).join('\n');
};

export const formatMessage = (message: Message, currentAgentId?: string): string => {
  const isMe = message.sender_id === currentAgentId;
  const prefix = isMe ? chalk.blue('You') : chalk.green(message.sender_id);
  const time = chalk.gray(new Date(message.created_at).toLocaleTimeString());
  
  return `[${time}] ${prefix}: ${message.content}`;
};

export const formatConversation = (conversation: Conversation & { other_party_name?: string; last_message?: string }): string => {
  const otherParty = conversation.other_party_name || 'Unknown';
  const lastMessage = conversation.last_message ? chalk.gray(` - ${conversation.last_message.substring(0, 50)}...`) : '';
  
  return `${chalk.bold(otherParty)}${lastMessage}`;
};

export const formatConversationList = (conversations: (Conversation & { other_party_name?: string; last_message?: string })[]): string => {
  if (conversations.length === 0) {
    return chalk.gray('No conversations found.');
  }

  return conversations.map((conversation, index) => {
    return `${index + 1}. ${formatConversation(conversation)}`;
  }).join('\n');
};

export const formatError = (message: string): string => {
  return chalk.red(`✖ ${message}`);
};

export const formatSuccess = (message: string): string => {
  return chalk.green(`✔ ${message}`);
};

export const formatInfo = (message: string): string => {
  return chalk.blue(`ℹ ${message}`);
};

export const formatWarning = (message: string): string => {
  return chalk.yellow(`⚠ ${message}`);
};

export const formatUser = (user: User): string => {
  return `
${chalk.bold('ID:')} ${user.id}
${chalk.bold('Nickname:')} ${user.nickname}
${chalk.bold('Created:')} ${new Date(user.created_at).toLocaleString()}
  `.trim();
};

export const formatUserList = (users: User[]): string => {
  if (users.length === 0) {
    return chalk.gray('No users found.');
  }

  return users.map((user, index) => {
    return `${index + 1}. ${chalk.bold(user.nickname)} (${chalk.gray(user.id.substring(0, 8) + '...')})`;
  }).join('\n');
};
