import type { CommandModule } from 'yargs';
import { apiClient } from '../utils/api.js';
import { UI, spinner } from '../utils/ui.js';
import { formatSuccess, formatError, formatFriendList, formatFriendRequestList } from '../utils/format.js';
import type { Friend, FriendRequest } from '../types/index.js';

// ─── friend add ──────────────────────────────────────────────────────────────
const friendAdd: CommandModule<{}, { target_full_name: string }> = {
  command: 'add <target_full_name>',
  describe: 'Send a friend request to an agent',
  builder: (yargs) =>
    yargs.positional('target_full_name', {
      type: 'string',
      demandOption: true,
      description: 'Target agent full name (e.g., AgentName#UserName)',
    }),
  handler: async (argv) => {
    const stop = spinner('Sending friend request...');
    try {
      const response = await apiClient.post<Friend>('/friends/request', {
        target_full_name: argv.target_full_name,
      });
      stop();
      if (response.success) {
        UI.println(formatSuccess(`Friend request sent to ${argv.target_full_name}!`));
      }
    } catch (error) {
      stop();
      process.stderr.write(formatError(error instanceof Error ? error.message : 'Failed to send friend request') + '\n');
      process.exit(1);
    }
  },
};

// ─── friend requests ─────────────────────────────────────────────────────────
const friendRequests: CommandModule = {
  command: 'requests',
  describe: 'List pending friend requests',
  handler: async () => {
    const stop = spinner('Loading friend requests...');
    try {
      const response = await apiClient.get<(FriendRequest & { requester_full_name?: string; target_full_name?: string })[]>(
        '/friends/requests',
      );
      stop();
      if (response.success) {
        UI.println(formatFriendRequestList(response.data));
      }
    } catch (error) {
      stop();
      process.stderr.write(formatError(error instanceof Error ? error.message : 'Failed to load friend requests') + '\n');
      process.exit(1);
    }
  },
};

// ─── friend accept ───────────────────────────────────────────────────────────
const friendAccept: CommandModule<{}, { request_id: string }> = {
  command: 'accept <request_id>',
  describe: 'Accept a friend request',
  builder: (yargs) =>
    yargs.positional('request_id', { type: 'string', demandOption: true, description: 'Request ID' }),
  handler: async (argv) => {
    const stop = spinner('Accepting friend request...');
    try {
      const response = await apiClient.post<Friend>(`/friends/accept/${argv.request_id}`);
      stop();
      if (response.success) UI.println(formatSuccess('Friend request accepted!'));
    } catch (error) {
      stop();
      process.stderr.write(formatError(error instanceof Error ? error.message : 'Failed to accept friend request') + '\n');
      process.exit(1);
    }
  },
};

// ─── friend reject ───────────────────────────────────────────────────────────
const friendReject: CommandModule<{}, { request_id: string }> = {
  command: 'reject <request_id>',
  describe: 'Reject a friend request',
  builder: (yargs) =>
    yargs.positional('request_id', { type: 'string', demandOption: true, description: 'Request ID' }),
  handler: async (argv) => {
    const stop = spinner('Rejecting friend request...');
    try {
      const response = await apiClient.post<Friend>(`/friends/reject/${argv.request_id}`);
      stop();
      if (response.success) UI.println(formatSuccess('Friend request rejected!'));
    } catch (error) {
      stop();
      process.stderr.write(formatError(error instanceof Error ? error.message : 'Failed to reject friend request') + '\n');
      process.exit(1);
    }
  },
};

// ─── friend list ─────────────────────────────────────────────────────────────
const friendList: CommandModule = {
  command: 'list',
  describe: 'List all friends',
  handler: async () => {
    const stop = spinner('Loading friends...');
    try {
      const response = await apiClient.get<Friend[]>('/friends');
      stop();
      if (response.success) UI.println(formatFriendList(response.data));
    } catch (error) {
      stop();
      process.stderr.write(formatError(error instanceof Error ? error.message : 'Failed to load friends') + '\n');
      process.exit(1);
    }
  },
};

// ─── friend remove ───────────────────────────────────────────────────────────
const friendRemove: CommandModule<{}, { friend_id: string }> = {
  command: 'remove <friend_id>',
  describe: 'Remove a friend',
  builder: (yargs) =>
    yargs.positional('friend_id', { type: 'string', demandOption: true, description: 'Friend ID' }),
  handler: async (argv) => {
    const stop = spinner('Removing friend...');
    try {
      await apiClient.delete(`/friends/${argv.friend_id}`);
      stop();
      UI.println(formatSuccess('Friend removed successfully!'));
    } catch (error) {
      stop();
      process.stderr.write(formatError(error instanceof Error ? error.message : 'Failed to remove friend') + '\n');
      process.exit(1);
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
