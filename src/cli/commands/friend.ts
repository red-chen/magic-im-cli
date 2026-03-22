import type { CommandModule } from 'yargs';
import { friendApi } from '../../core/api/index.js';
import { spinner } from '../utils/spinner.js';
import { println, printError } from '../utils/output.js';
import { formatSuccess, formatError, formatFriendList, formatFriendRequestList } from '../utils/format.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('friend');

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
      const response = await friendApi.sendFriendRequest(argv.target_full_name);
      stop();
      if (response.success) {
        println(formatSuccess(`Friend request sent to ${argv.target_full_name}!`));
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to send friend request';
      logger.error('friend add failed', { message: msg });
      printError(msg);
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
      const response = await friendApi.listFriendRequests();
      stop();
      if (response.success) {
        println(formatFriendRequestList(response.data));
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to load friend requests';
      logger.error('friend requests failed', { message: msg });
      printError(msg);
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
      const response = await friendApi.acceptFriendRequest(argv.request_id);
      stop();
      if (response.success) println(formatSuccess('Friend request accepted!'));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to accept friend request';
      logger.error('friend accept failed', { message: msg });
      printError(msg);
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
      const response = await friendApi.rejectFriendRequest(argv.request_id);
      stop();
      if (response.success) println(formatSuccess('Friend request rejected!'));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to reject friend request';
      logger.error('friend reject failed', { message: msg });
      printError(msg);
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
      const response = await friendApi.listFriends();
      stop();
      if (response.success) println(formatFriendList(response.data));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to load friends';
      logger.error('friend list failed', { message: msg });
      printError(msg);
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
      await friendApi.removeFriend(argv.friend_id);
      stop();
      println(formatSuccess('Friend removed successfully!'));
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to remove friend';
      logger.error('friend remove failed', { message: msg });
      printError(msg);
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
