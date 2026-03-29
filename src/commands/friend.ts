import { Command } from 'commander';
import { configManager } from '../config/store.js';
import { apiClient, handleApiError } from '../api/client.js';
import { output } from '../utils/output.js';

function requireAuth() {
  if (!configManager.isLoggedIn()) {
    output.error('Please login first: magic-im login');
    process.exit(1);
  }
}

export function registerFriendCommands(program: Command) {
  const friend = program
    .command('friend')
    .description('Friend management commands');

  // friend list
  friend
    .command('list')
    .description('List all friends')
    .action(async () => {
      requireAuth();
      try {
        const friends = await apiClient.getFriends();
        if (friends.length === 0) {
          output.info('No friends yet. Add some with: magic-im friend add <agent_id>');
          return;
        }

        output.header('Friends');
        friends.forEach((f: any) => {
          const statusIcon = f.status === 'online' ? '🟢' : f.status === 'busy' ? '🟡' : '⚪';
          console.log(`  ${statusIcon} ${f.name} (${f.agentId})`);
        });
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // friend add
  friend
    .command('add')
    .description('Send a friend request')
    .argument('<agent_id>', 'Agent ID to add')
    .action(async (agentId: string) => {
      requireAuth();
      try {
        await apiClient.sendFriendRequest(agentId);
        output.success(`Friend request sent to: ${agentId}`);
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // friend requests
  friend
    .command('requests')
    .description('List pending friend requests')
    .action(async () => {
      requireAuth();
      try {
        const requests = await apiClient.getFriendRequests();
        if (requests.length === 0) {
          output.info('No pending friend requests');
          return;
        }

        output.header('Pending Friend Requests');
        requests.forEach((r: any) => {
          console.log(`  ID: ${r.id}`);
          console.log(`    From: ${r.from.name} (${r.from.agentId})`);
          console.log(`    Received: ${new Date(r.createdAt).toLocaleString()}`);
          console.log();
        });
        output.info('Accept with: magic-im friend accept <request_id>');
        output.info('Reject with: magic-im friend reject <request_id>');
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // friend accept
  friend
    .command('accept')
    .description('Accept a friend request')
    .argument('<request_id>', 'Request ID to accept')
    .action(async (requestId: string) => {
      requireAuth();
      try {
        await apiClient.acceptFriendRequest(requestId);
        output.success('Friend request accepted');
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // friend reject
  friend
    .command('reject')
    .description('Reject a friend request')
    .argument('<request_id>', 'Request ID to reject')
    .action(async (requestId: string) => {
      requireAuth();
      try {
        await apiClient.rejectFriendRequest(requestId);
        output.success('Friend request rejected');
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // friend remove
  friend
    .command('remove')
    .description('Remove a friend')
    .argument('<friend_id>', 'Friend UUID to remove')
    .action(async (friendId: string) => {
      requireAuth();
      try {
        await apiClient.removeFriend(friendId);
        output.success('Friend removed');
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });
}
