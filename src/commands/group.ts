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

export function registerGroupCommands(program: Command) {
  const group = program
    .command('group')
    .description('Group management commands');

  // group create
  group
    .command('create')
    .description('Create a new group')
    .argument('<name>', 'Group name')
    .action(async (name: string) => {
      requireAuth();
      try {
        const newGroup = await apiClient.createGroup(name);
        output.success(`Group created: ${newGroup.name}`);
        output.keyValue({
          'Group ID': newGroup.groupId,
          'Name': newGroup.name,
        });
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // group list
  group
    .command('list')
    .description('List joined groups')
    .action(async () => {
      requireAuth();
      try {
        const groups = await apiClient.getGroups();
        if (groups.length === 0) {
          output.info('No groups yet. Create one with: magic-im group create <name>');
          return;
        }

        output.header('Groups');
        groups.forEach((g: any) => {
          const roleIcon = g.role === 'owner' ? '👑' : g.role === 'admin' ? '⭐' : '👤';
          console.log(`  ${roleIcon} ${g.name} (${g.groupId})`);
        });
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // group info
  group
    .command('info')
    .description('Get group details')
    .argument('<group_id>', 'Group UUID')
    .action(async (groupId: string) => {
      requireAuth();
      try {
        const groupInfo = await apiClient.getGroup(groupId);
        output.header(`Group: ${groupInfo.name}`);
        output.keyValue({
          'Group ID': groupInfo.groupId,
          'Name': groupInfo.name,
          'Created': new Date(groupInfo.createdAt).toLocaleString(),
        });
        
        console.log('\n  Members:');
        groupInfo.members.forEach((m: any) => {
          const roleIcon = m.role === 'owner' ? '👑' : m.role === 'admin' ? '⭐' : '👤';
          const statusIcon = m.status === 'online' ? '🟢' : m.status === 'busy' ? '🟡' : '⚪';
          console.log(`    ${roleIcon} ${statusIcon} ${m.name} (${m.agentId})`);
        });
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // group invite
  group
    .command('invite')
    .description('Invite a member to group')
    .argument('<group_id>', 'Group UUID')
    .argument('<agent_id>', 'Agent ID to invite')
    .action(async (groupId: string, agentId: string) => {
      requireAuth();
      try {
        await apiClient.inviteToGroup(groupId, agentId);
        output.success(`Invited ${agentId} to the group`);
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // group leave
  group
    .command('leave')
    .description('Leave a group')
    .argument('<group_id>', 'Group UUID')
    .action(async (groupId: string) => {
      requireAuth();
      try {
        await apiClient.leaveGroup(groupId);
        output.success('Left the group');
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // group kick
  group
    .command('kick')
    .description('Kick a member from group')
    .argument('<group_id>', 'Group UUID')
    .argument('<agent_id>', 'Agent UUID to kick')
    .action(async (groupId: string, agentId: string) => {
      requireAuth();
      try {
        await apiClient.kickFromGroup(groupId, agentId);
        output.success('Member kicked from group');
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // group disband
  group
    .command('disband')
    .description('Disband a group (owner only)')
    .argument('<group_id>', 'Group UUID')
    .action(async (groupId: string) => {
      requireAuth();
      try {
        await apiClient.deleteGroup(groupId);
        output.success('Group disbanded');
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });
}
