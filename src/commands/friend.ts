import type { CommandModule } from 'yargs';
import { apiClient } from '../utils/api.js';
import { UI, spinner } from '../utils/ui.js';
import { formatSuccess, formatError, formatFriendList, formatFriendRequestList } from '../utils/format.js';
import type { Friend, FriendRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getAgentId } from '../utils/config.js';

// Helper to resolve entity ID from options
// Returns format: user_id or "agent:{agent_id}"
const resolveEntityId = (asOpt?: string): { entityId: string; isAgent: boolean } | null => {
  // If --as agent:xxx is specified
  if (asOpt?.startsWith('agent:')) {
    return { entityId: asOpt, isAgent: true };
  }
  // If --as user or no --as specified, we need user ID from token
  // The API will extract user ID from the JWT token, so we pass "user" as placeholder
  // Actually, we need to pass the actual user ID - this will be handled by the API
  // For now, return a special marker that tells the API to use the token's user
  return { entityId: 'user', isAgent: false };
};

// ─── friend add ──────────────────────────────────────────────────────────────
// Support: user+user, user+agent, agent+agent
// Examples:
//   magic-im friend add yuanhao              # user + user
//   magic-im friend add coding#yuanhao       # user + agent
//   magic-im friend add coding#yuanhao --as agent:myAgent  # agent + agent
const friendAdd: CommandModule<{}, { target_full_name: string; as?: string }> = {
  command: 'add <target_full_name>',
  describe: 'Send a friend request (user or agent)',
  builder: (yargs) =>
    yargs
      .positional('target_full_name', {
        type: 'string',
        demandOption: true,
        description: 'Target identifier (user nickname or AgentName#UserName for agent)',
      })
      .option('as', {
        type: 'string',
        description: 'Send as user or agent (format: "user" or "agent:{agent_id}")',
        default: 'user',
      }),
  handler: async (argv) => {
    const entity = resolveEntityId(argv.as);
    if (!entity) {
      UI.println(formatError('Invalid --as format. Use "user" or "agent:{agent_id}"'));
      return;
    }

    // If sending as agent, validate we have the agent ID
    if (entity.isAgent) {
      const configuredAgentId = getAgentId();
      const requestedAgentId = argv.as?.slice(6); // Remove "agent:" prefix
      if (configuredAgentId && configuredAgentId !== requestedAgentId) {
        UI.println(formatError(`Agent ${requestedAgentId} is not your default agent. Use "agent use ${requestedAgentId}" first.`));
        return;
      }
    }

    const stop = spinner(`Sending friend request to ${argv.target_full_name}...`);
    try {
      const response = await apiClient.post<Friend>('/friends/request', {
        entity_id: entity.entityId,
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
const friendRequests: CommandModule<{}, { as?: string }> = {
  command: 'requests',
  describe: 'List pending friend requests',
  builder: (yargs) =>
    yargs.option('as', {
      type: 'string',
      description: 'View requests for user or agent (format: "user" or "agent:{agent_id}")',
      default: 'user',
    }),
  handler: async (argv) => {
    const entity = resolveEntityId(argv.as);
    if (!entity) {
      UI.println(formatError('Invalid --as format. Use "user" or "agent:{agent_id}"'));
      return;
    }

    const stop = spinner('Loading friend requests...');
    try {
      const response = await apiClient.get<(FriendRequest & { requester_info?: { type: string; full_name: string } })[]>(
        `/friends/requests?entity_id=${encodeURIComponent(entity.entityId)}`,
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
const friendAccept: CommandModule<{}, { request_id: string; as?: string }> = {
  command: 'accept <request_id>',
  describe: 'Accept a friend request',
  builder: (yargs) =>
    yargs
      .positional('request_id', { type: 'string', demandOption: true, description: 'Request ID' })
      .option('as', {
        type: 'string',
        description: 'Accept as user or agent (format: "user" or "agent:{agent_id}")',
        default: 'user',
      }),
  handler: async (argv) => {
    const entity = resolveEntityId(argv.as);
    if (!entity) {
      UI.println(formatError('Invalid --as format. Use "user" or "agent:{agent_id}"'));
      return;
    }

    const stop = spinner('Accepting friend request...');
    try {
      const response = await apiClient.post<Friend>(`/friends/accept/${argv.request_id}`, {
        entity_id: entity.entityId,
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
const friendReject: CommandModule<{}, { request_id: string; as?: string }> = {
  command: 'reject <request_id>',
  describe: 'Reject a friend request',
  builder: (yargs) =>
    yargs
      .positional('request_id', { type: 'string', demandOption: true, description: 'Request ID' })
      .option('as', {
        type: 'string',
        description: 'Reject as user or agent (format: "user" or "agent:{agent_id}")',
        default: 'user',
      }),
  handler: async (argv) => {
    const entity = resolveEntityId(argv.as);
    if (!entity) {
      UI.println(formatError('Invalid --as format. Use "user" or "agent:{agent_id}"'));
      return;
    }

    const stop = spinner('Rejecting friend request...');
    try {
      const response = await apiClient.post<Friend>(`/friends/reject/${argv.request_id}`, {
        entity_id: entity.entityId,
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
const friendList: CommandModule<{}, { as?: string }> = {
  command: 'list',
  describe: 'List all friends',
  builder: (yargs) =>
    yargs.option('as', {
      type: 'string',
      description: 'List friends for user or agent (format: "user" or "agent:{agent_id}")',
      default: 'user',
    }),
  handler: async (argv) => {
    const entity = resolveEntityId(argv.as);
    if (!entity) {
      UI.println(formatError('Invalid --as format. Use "user" or "agent:{agent_id}"'));
      return;
    }

    const stop = spinner('Loading friends...');
    try {
      const response = await apiClient.get<Friend[]>(`/friends?entity_id=${encodeURIComponent(entity.entityId)}`);
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
const friendRemove: CommandModule<{}, { friend_id: string; as?: string }> = {
  command: 'remove <friend_id>',
  describe: 'Remove a friend',
  builder: (yargs) =>
    yargs
      .positional('friend_id', { type: 'string', demandOption: true, description: 'Friendship ID' })
      .option('as', {
        type: 'string',
        description: 'Remove as user or agent (format: "user" or "agent:{agent_id}")',
        default: 'user',
      }),
  handler: async (argv) => {
    const entity = resolveEntityId(argv.as);
    if (!entity) {
      UI.println(formatError('Invalid --as format. Use "user" or "agent:{agent_id}"'));
      return;
    }

    const stop = spinner('Removing friend...');
    try {
      await apiClient.delete(`/friends/${argv.friend_id}?entity_id=${encodeURIComponent(entity.entityId)}`);
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
  describe: 'Friend system commands (supports user+user, user+agent, agent+agent)',
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
