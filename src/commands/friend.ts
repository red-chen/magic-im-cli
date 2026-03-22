import type { CommandModule } from 'yargs';
import { apiClient } from '../utils/api.js';
import { UI, spinner } from '../utils/ui.js';
import { formatSuccess, formatError, formatFriendList, formatFriendRequestList } from '../utils/format.js';
import type { Friend, FriendRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getAgentId } from '../utils/config.js';

// Helper to get agent ID from option or config
const resolveAgentId = (agentOpt?: string): string | undefined => {
  return agentOpt || getAgentId();
};

// ─── friend add ──────────────────────────────────────────────────────────────
const friendAdd: CommandModule<{}, { target_full_name: string; agent?: string }> = {
  command: 'add <target_full_name>',
  describe: 'Send a friend request to an agent',
  builder: (yargs) =>
    yargs
      .positional('target_full_name', {
        type: 'string',
        demandOption: true,
        description: 'Target agent full name (e.g., AgentName#UserName)',
      })
      .option('agent', { alias: 'a', type: 'string', description: 'Your agent ID (or use config default)' }),
  handler: async (argv) => {
    const agentId = resolveAgentId(argv.agent);
    if (!agentId) {
      UI.println(formatError('Agent ID required. Use --agent or set default with "magic-im agent use <agent_id>"'));
      return;
    }

    const stop = spinner('Sending friend request...');
    try {
      const response = await apiClient.post<Friend>('/friends/request', {
        agent_id: agentId,
        target_full_name: argv.target_full_name,
      });
      stop();
      if (response.success) {
        UI.println(formatSuccess(`Friend request sent to ${argv.target_full_name}!`));
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to send friend request';
      logger.error('friend add failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      UI.println(formatError(msg));
    }
  },
};

// ─── friend requests ─────────────────────────────────────────────────────────
const friendRequests: CommandModule<{}, { agent?: string }> = {
  command: 'requests',
  describe: 'List pending friend requests',
  builder: (yargs) =>
    yargs.option('agent', { alias: 'a', type: 'string', description: 'Your agent ID (or use config default)' }),
  handler: async (argv) => {
    const agentId = resolveAgentId(argv.agent);
    if (!agentId) {
      UI.println(formatError('Agent ID required. Use --agent or set default with "magic-im agent use <agent_id>"'));
      return;
    }

    const stop = spinner('Loading friend requests...');
    try {
      const response = await apiClient.get<(FriendRequest & { requester_full_name?: string; target_full_name?: string })[]>(
        `/friends/requests?agent_id=${agentId}`,
      );
      stop();
      if (response.success) {
        UI.println(formatFriendRequestList(response.data));
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to load friend requests';
      logger.error('friend requests failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      UI.println(formatError(msg));
    }
  },
};

// ─── friend accept ───────────────────────────────────────────────────────────
const friendAccept: CommandModule<{}, { request_id: string; agent?: string }> = {
  command: 'accept <request_id>',
  describe: 'Accept a friend request',
  builder: (yargs) =>
    yargs
      .positional('request_id', { type: 'string', demandOption: true, description: 'Request ID' })
      .option('agent', { alias: 'a', type: 'string', description: 'Your agent ID (or use config default)' }),
  handler: async (argv) => {
    const agentId = resolveAgentId(argv.agent);
    if (!agentId) {
      UI.println(formatError('Agent ID required. Use --agent or set default with "magic-im agent use <agent_id>"'));
      return;
    }

    const stop = spinner('Accepting friend request...');
    try {
      const response = await apiClient.post<Friend>(`/friends/accept/${argv.request_id}`, {
        agent_id: agentId,
      });
      stop();
      if (response.success) UI.println(formatSuccess('Friend request accepted!'));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to accept friend request';
      logger.error('friend accept failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      UI.println(formatError(msg));
    }
  },
};

// ─── friend reject ───────────────────────────────────────────────────────────
const friendReject: CommandModule<{}, { request_id: string; agent?: string }> = {
  command: 'reject <request_id>',
  describe: 'Reject a friend request',
  builder: (yargs) =>
    yargs
      .positional('request_id', { type: 'string', demandOption: true, description: 'Request ID' })
      .option('agent', { alias: 'a', type: 'string', description: 'Your agent ID (or use config default)' }),
  handler: async (argv) => {
    const agentId = resolveAgentId(argv.agent);
    if (!agentId) {
      UI.println(formatError('Agent ID required. Use --agent or set default with "magic-im agent use <agent_id>"'));
      return;
    }

    const stop = spinner('Rejecting friend request...');
    try {
      const response = await apiClient.post<Friend>(`/friends/reject/${argv.request_id}`, {
        agent_id: agentId,
      });
      stop();
      if (response.success) UI.println(formatSuccess('Friend request rejected!'));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to reject friend request';
      logger.error('friend reject failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      UI.println(formatError(msg));
    }
  },
};

// ─── friend list ─────────────────────────────────────────────────────────────
const friendList: CommandModule<{}, { agent?: string }> = {
  command: 'list',
  describe: 'List all friends',
  builder: (yargs) =>
    yargs.option('agent', { alias: 'a', type: 'string', description: 'Your agent ID (or use config default)' }),
  handler: async (argv) => {
    const agentId = resolveAgentId(argv.agent);
    if (!agentId) {
      UI.println(formatError('Agent ID required. Use --agent or set default with "magic-im agent use <agent_id>"'));
      return;
    }

    const stop = spinner('Loading friends...');
    try {
      const response = await apiClient.get<Friend[]>(`/friends?agent_id=${agentId}`);
      stop();
      if (response.success) UI.println(formatFriendList(response.data));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to load friends';
      logger.error('friend list failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      UI.println(formatError(msg));
    }
  },
};

// ─── friend remove ───────────────────────────────────────────────────────────
const friendRemove: CommandModule<{}, { friend_id: string; agent?: string }> = {
  command: 'remove <friend_id>',
  describe: 'Remove a friend',
  builder: (yargs) =>
    yargs
      .positional('friend_id', { type: 'string', demandOption: true, description: 'Friend ID' })
      .option('agent', { alias: 'a', type: 'string', description: 'Your agent ID (or use config default)' }),
  handler: async (argv) => {
    const agentId = resolveAgentId(argv.agent);
    if (!agentId) {
      UI.println(formatError('Agent ID required. Use --agent or set default with "magic-im agent use <agent_id>"'));
      return;
    }

    const stop = spinner('Removing friend...');
    try {
      await apiClient.delete(`/friends/${argv.friend_id}?agent_id=${agentId}`);
      stop();
      UI.println(formatSuccess('Friend removed successfully!'));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to remove friend';
      logger.error('friend remove failed', { message: msg, stack: error instanceof Error ? error.stack : undefined });
      UI.println(formatError(msg));
    }
  },
};

// ─── friend group ────────────────────────────────────────────────────────────
const friendCommands: CommandModule = {
  command: 'friend <command>',
  describe: 'Friend system commands',
  builder: (yargs) =>
    yargs
      .command(friendAdd)
      .command(friendRequests)
      .command(friendAccept)
      .command(friendReject)
      .command(friendList)
      .command(friendRemove)
      .demandCommand(1, 'Please specify a friend sub-command'),
  handler: () => {},
};

export default friendCommands;
