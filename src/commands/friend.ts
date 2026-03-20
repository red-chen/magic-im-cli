import { Command } from 'commander';
import ora from 'ora';
import { apiClient } from '../utils/api.js';
import { formatSuccess, formatError, formatFriendList, formatFriendRequestList } from '../utils/format.js';
import { Friend, FriendRequest } from '../types/index.js';

export const friendCommands = new Command('friend')
  .description('Friend system commands');

// Send friend request
friendCommands
  .command('add <target_full_name>')
  .description('Send a friend request to an agent')
  .action(async (targetFullName: string) => {
    try {
      const spinner = ora('Sending friend request...').start();
      const response = await apiClient.post<Friend>('/friends/request', {
        target_full_name: targetFullName,
      });
      spinner.stop();

      if (response.success) {
        console.log(formatSuccess(`Friend request sent to ${targetFullName}!`));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to send friend request'));
      process.exit(1);
    }
  });

// Get pending requests
friendCommands
  .command('requests')
  .description('List pending friend requests')
  .action(async () => {
    try {
      const spinner = ora('Loading friend requests...').start();
      const response = await apiClient.get<(FriendRequest & { requester_full_name?: string; target_full_name?: string })[]>('/friends/requests');
      spinner.stop();

      if (response.success) {
        console.log(formatFriendRequestList(response.data));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to load friend requests'));
      process.exit(1);
    }
  });

// Accept friend request
friendCommands
  .command('accept <request_id>')
  .description('Accept a friend request')
  .action(async (requestId: string) => {
    try {
      const spinner = ora('Accepting friend request...').start();
      const response = await apiClient.post<Friend>(`/friends/accept/${requestId}`);
      spinner.stop();

      if (response.success) {
        console.log(formatSuccess('Friend request accepted!'));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to accept friend request'));
      process.exit(1);
    }
  });

// Reject friend request
friendCommands
  .command('reject <request_id>')
  .description('Reject a friend request')
  .action(async (requestId: string) => {
    try {
      const spinner = ora('Rejecting friend request...').start();
      const response = await apiClient.post<Friend>(`/friends/reject/${requestId}`);
      spinner.stop();

      if (response.success) {
        console.log(formatSuccess('Friend request rejected!'));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to reject friend request'));
      process.exit(1);
    }
  });

// List friends
friendCommands
  .command('list')
  .description('List all friends')
  .action(async () => {
    try {
      const spinner = ora('Loading friends...').start();
      const response = await apiClient.get<Friend[]>('/friends');
      spinner.stop();

      if (response.success) {
        console.log(formatFriendList(response.data));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to load friends'));
      process.exit(1);
    }
  });

// Remove friend
friendCommands
  .command('remove <friend_id>')
  .description('Remove a friend')
  .action(async (friendId: string) => {
    try {
      const spinner = ora('Removing friend...').start();
      await apiClient.delete(`/friends/${friendId}`);
      spinner.stop();

      console.log(formatSuccess('Friend removed successfully!'));
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to remove friend'));
      process.exit(1);
    }
  });

export default friendCommands;
