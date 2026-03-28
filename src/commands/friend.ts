import type { CommandModule } from 'yargs';
import { 
  listFriends, 
  sendFriendRequest, 
  listFriendRequests, 
  acceptFriendRequest 
} from '../core/api/friend.api.js';
import { listAgents } from '../core/api/agent.api.js';
import type { Friend, Agent, FriendRequestWithNames } from '../core/types/index.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { setToken } from '../core/config/config.js';

interface FriendListArgs {
  workspace?: string;
  agent?: string;
}

interface FriendAddArgs {
  workspace?: string;
  agent?: string;
  target: string;
}

interface FriendRequestsArgs {
  workspace?: string;
  agent?: string;
}

interface FriendAcceptArgs {
  workspace?: string;
  agent?: string;
  target: string;
}

/**
 * Helper function to get workspace config and validate login
 */
async function getWorkspaceConfig(argv: { workspace?: string }): Promise<{ 
  workspacePath: string; 
  token: string; 
  currentAgentId?: string;
}> {
  const workspacePath = (argv.workspace || join(homedir(), '.magic-im')).replace(/^~/, homedir());
  const workspaceConfigFile = join(workspacePath, 'config.json');

  // Check if logged in
  if (!existsSync(workspaceConfigFile)) {
    logger.error('No login session found', { workspace: workspacePath });
    process.stderr.write(UI.error(`Not logged in. Use "magic-im login" to authenticate.`) + '\n');
    process.exit(1);
  }

  // Read workspace config for token and current agent
  try {
    const configData = readFileSync(workspaceConfigFile, 'utf-8');
    const config = JSON.parse(configData);
    const token = config.token;
    const currentAgentId = config.currentAgent?.id;
    if (!token) {
      throw new Error('Token not found in config');
    }
    return { workspacePath, token, currentAgentId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to read workspace config', { error: msg, workspace: workspacePath });
    process.stderr.write(UI.error(`Failed to read workspace config: ${msg}`) + '\n');
    process.exit(1);
  }
}

/**
 * Helper function to resolve agent ID
 * Priority: 1) specified agent, 2) current agent, 3) default agent, 4) first agent
 */
async function resolveAgentId(
  specifiedAgent: string | undefined, 
  currentAgentId: string | undefined,
  workspacePath: string
): Promise<string> {
  if (specifiedAgent) {
    return specifiedAgent;
  }
  
  if (currentAgentId) {
    return currentAgentId;
  }
  
  // No agent specified, get the default agent
  logger.info('No agent specified, fetching default agent', { workspace: workspacePath });
  
  const agentsResponse = await listAgents();
  if (!agentsResponse.success || !agentsResponse.data || agentsResponse.data.length === 0) {
    logger.error('No agents found for user', { workspace: workspacePath });
    process.stderr.write(UI.error(`No agents found. Use "magic-im agent create" to create an agent first.`) + '\n');
    process.exit(1);
  }
  
  // Find default agent or use the first one
  const defaultAgent = agentsResponse.data.find((agent: Agent) => agent.is_default);
  const agentId = defaultAgent?.id || agentsResponse.data[0].id;
  
  logger.info('Using default agent', { agentId });
  return agentId;
}

/**
 * Friend list command - List all friends for the current agent
 * 
 * Usage: magic-im friend list
 * 
 * Output format:
 *   - buxiao#buxiao
 *   - profile#yuanhao
 */
const friendListCommand: CommandModule<{}, FriendListArgs> = {
  command: 'list',
  describe: 'List all your friends',
  builder: (yargs) =>
    yargs
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory path (default: ~/.magic-im/)',
        default: join(homedir(), '.magic-im'),
      })
      .option('agent', {
        alias: 'a',
        type: 'string',
        description: 'Agent ID to list friends for (default: current agent)',
      }),
  handler: async (argv) => {
    try {
      // Get workspace config
      const { workspacePath, token, currentAgentId } = await getWorkspaceConfig(argv);

      // Set token for API client
      setToken(token);

      // Resolve agent ID
      const agentId = await resolveAgentId(argv.agent, currentAgentId, workspacePath);

      logger.info('Listing friends', { workspace: workspacePath, agentId });

      // Call list friends API
      const response = await listFriends(agentId);

      if (!response.success || !response.data) {
        const errorMsg = response.error
          ? (typeof response.error === 'string' ? response.error : response.error.message)
          : 'Failed to list friends';
        logger.error('List friends failed', { error: errorMsg });
        process.stderr.write(UI.error(`List friends failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      const friends: Friend[] = response.data;

      if (friends.length === 0) {
        UI.println(UI.warning('No friends found'));
        logger.info('Friends listed successfully', { count: 0 });
        return;
      }

      // Output format:
      //   - buxiao#buxiao
      //   - profile#yuanhao
      for (const friend of friends) {
        UI.println(`  - ${friend.friend_full_name}`);
      }

      logger.info('Friends listed successfully', { count: friends.length });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Friend list command failed', {
        error: msg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.stderr.write(UI.error(`List friends failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

/**
 * Friend add command - Send a friend request to an agent
 * 
 * Usage: magic-im friend add <target_full_name>
 * 
 * Example:
 *   magic-im friend add buxiao#buxiao
 */
const friendAddCommand: CommandModule<{}, FriendAddArgs> = {
  command: 'add <target>',
  describe: 'Send a friend request to an agent',
  builder: (yargs) =>
    yargs
      .positional('target', {
        type: 'string',
        description: 'Target agent full name (e.g., buxiao#buxiao)',
        demandOption: true,
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory path (default: ~/.magic-im/)',
        default: join(homedir(), '.magic-im'),
      })
      .option('agent', {
        alias: 'a',
        type: 'string',
        description: 'Agent ID to send friend request from (default: current agent)',
      }),
  handler: async (argv) => {
    try {
      // Get workspace config
      const { workspacePath, token, currentAgentId } = await getWorkspaceConfig(argv);

      // Set token for API client
      setToken(token);

      // Resolve agent ID
      const agentId = await resolveAgentId(argv.agent, currentAgentId, workspacePath);

      const targetFullName = argv.target;
      logger.info('Sending friend request', { workspace: workspacePath, agentId, target: targetFullName });

      // Call send friend request API
      const response = await sendFriendRequest(agentId, targetFullName);

      if (!response.success || !response.data) {
        const errorMsg = response.error
          ? (typeof response.error === 'string' ? response.error : response.error.message)
          : 'Failed to send friend request';
        logger.error('Send friend request failed', { error: errorMsg });
        process.stderr.write(UI.error(`Send friend request failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      UI.println(UI.success(`Friend request sent to ${targetFullName}`));
      logger.info('Friend request sent successfully', { target: targetFullName });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Friend add command failed', {
        error: msg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.stderr.write(UI.error(`Send friend request failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

/**
 * Friend requests command - List pending friend requests for the current agent
 * 
 * Usage: magic-im friend requests
 * 
 * Output format:
 *   - buxiao#buxiao
 */
const friendRequestsCommand: CommandModule<{}, FriendRequestsArgs> = {
  command: 'requests',
  describe: 'List pending friend requests',
  builder: (yargs) =>
    yargs
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory path (default: ~/.magic-im/)',
        default: join(homedir(), '.magic-im'),
      })
      .option('agent', {
        alias: 'a',
        type: 'string',
        description: 'Agent ID to list requests for (default: current agent)',
      }),
  handler: async (argv) => {
    try {
      // Get workspace config
      const { workspacePath, token, currentAgentId } = await getWorkspaceConfig(argv);

      // Set token for API client
      setToken(token);

      // Resolve agent ID
      const agentId = await resolveAgentId(argv.agent, currentAgentId, workspacePath);

      logger.info('Listing friend requests', { workspace: workspacePath, agentId });

      // Call list friend requests API
      const response = await listFriendRequests(agentId);

      if (!response.success || !response.data) {
        const errorMsg = response.error
          ? (typeof response.error === 'string' ? response.error : response.error.message)
          : 'Failed to list friend requests';
        logger.error('List friend requests failed', { error: errorMsg });
        process.stderr.write(UI.error(`List friend requests failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      const requests: FriendRequestWithNames[] = response.data;

      if (requests.length === 0) {
        UI.println(UI.warning('No pending friend requests'));
        logger.info('Friend requests listed successfully', { count: 0 });
        return;
      }

      // Output format:
      //   - buxiao#buxiao
      for (const request of requests) {
        const requesterName = request.requester_full_name || 'Unknown';
        UI.println(`  - ${requesterName}`);
      }

      logger.info('Friend requests listed successfully', { count: requests.length });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Friend requests command failed', {
        error: msg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.stderr.write(UI.error(`List friend requests failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

/**
 * Friend accept command - Accept a friend request
 * 
 * Usage: magic-im friend accept <target_full_name>
 * 
 * Example:
 *   magic-im friend accept buxiao#buxiao
 */
const friendAcceptCommand: CommandModule<{}, FriendAcceptArgs> = {
  command: 'accept <target>',
  describe: 'Accept a friend request from an agent',
  builder: (yargs) =>
    yargs
      .positional('target', {
        type: 'string',
        description: 'Requester agent full name (e.g., buxiao#buxiao)',
        demandOption: true,
      })
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory path (default: ~/.magic-im/)',
        default: join(homedir(), '.magic-im'),
      })
      .option('agent', {
        alias: 'a',
        type: 'string',
        description: 'Agent ID to accept request for (default: current agent)',
      }),
  handler: async (argv) => {
    try {
      // Get workspace config
      const { workspacePath, token, currentAgentId } = await getWorkspaceConfig(argv);

      // Set token for API client
      setToken(token);

      // Resolve agent ID
      const agentId = await resolveAgentId(argv.agent, currentAgentId, workspacePath);

      const targetFullName = argv.target;
      logger.info('Accepting friend request', { workspace: workspacePath, agentId, target: targetFullName });

      // First, get pending requests to find the request ID
      const requestsResponse = await listFriendRequests(agentId);
      
      if (!requestsResponse.success || !requestsResponse.data) {
        const errorMsg = requestsResponse.error
          ? (typeof requestsResponse.error === 'string' ? requestsResponse.error : requestsResponse.error.message)
          : 'Failed to list friend requests';
        logger.error('List friend requests failed', { error: errorMsg });
        process.stderr.write(UI.error(`Failed to find friend request: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      // Find the request with matching requester_full_name
      const matchingRequest = requestsResponse.data.find(
        (req: FriendRequestWithNames) => req.requester_full_name === targetFullName
      );

      if (!matchingRequest) {
        logger.error('Friend request not found', { target: targetFullName });
        process.stderr.write(UI.error(`No pending friend request found from ${targetFullName}`) + '\n');
        process.exit(1);
      }

      // Call accept friend request API
      const response = await acceptFriendRequest(matchingRequest.id, agentId);

      if (!response.success || !response.data) {
        const errorMsg = response.error
          ? (typeof response.error === 'string' ? response.error : response.error.message)
          : 'Failed to accept friend request';
        logger.error('Accept friend request failed', { error: errorMsg });
        process.stderr.write(UI.error(`Accept friend request failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      UI.println(UI.success(`Friend request from ${targetFullName} accepted`));
      logger.info('Friend request accepted successfully', { target: targetFullName });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Friend accept command failed', {
        error: msg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.stderr.write(UI.error(`Accept friend request failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

/**
 * Friend command group - Manage friends
 * 
 * Usage: magic-im friend <subcommand>
 */
const friendCommand: CommandModule = {
  command: 'friend',
  describe: 'Manage your friends',
  builder: (yargs) =>
    yargs
      .command(friendListCommand)
      .command(friendAddCommand)
      .command(friendRequestsCommand)
      .command(friendAcceptCommand)
      .demandCommand(1, 'You need to specify a subcommand (e.g., list, add, requests, accept)'),
  handler: () => {
    // This handler is called when no subcommand is provided
    // yargs will show help automatically due to demandCommand
  },
};

/**
 * Standalone /friends command - Composite command showing friends and pending requests
 * 
 * Usage: magic-im friends
 * 
 * Output format:
 * Friends:
 *   - buxiao#buxiao
 *   - profile#yuanhao
 * 
 * Pending Requests:
 *   - helper#alice
 */
const friendsCommand: CommandModule<{}, FriendListArgs> = {
  command: 'friends',
  describe: 'List friends and pending requests',
  builder: (yargs) =>
    yargs
      .option('workspace', {
        alias: 'w',
        type: 'string',
        description: 'Workspace directory path (default: ~/.magic-im/)',
        default: join(homedir(), '.magic-im'),
      })
      .option('agent', {
        alias: 'a',
        type: 'string',
        description: 'Agent ID to list friends for (default: current agent)',
      }),
  handler: async (argv) => {
    try {
      // Get workspace config
      const { workspacePath, token, currentAgentId } = await getWorkspaceConfig(argv);

      // Set token for API client
      setToken(token);

      // Resolve agent ID
      const agentId = await resolveAgentId(argv.agent, currentAgentId, workspacePath);

      logger.info('Listing friends and requests', { workspace: workspacePath, agentId });

      // Fetch friends and requests in parallel
      const [friendsResponse, requestsResponse] = await Promise.all([
        listFriends(agentId),
        listFriendRequests(agentId),
      ]);

      // Handle friends response
      if (!friendsResponse.success || !friendsResponse.data) {
        const errorMsg = friendsResponse.error
          ? (typeof friendsResponse.error === 'string' ? friendsResponse.error : friendsResponse.error.message)
          : 'Failed to list friends';
        logger.error('List friends failed', { error: errorMsg });
        process.stderr.write(UI.error(`List friends failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      // Handle requests response
      if (!requestsResponse.success || !requestsResponse.data) {
        const errorMsg = requestsResponse.error
          ? (typeof requestsResponse.error === 'string' ? requestsResponse.error : requestsResponse.error.message)
          : 'Failed to list friend requests';
        logger.error('List friend requests failed', { error: errorMsg });
        process.stderr.write(UI.error(`List friend requests failed: ${errorMsg}`) + '\n');
        process.exit(1);
      }

      const friends: Friend[] = friendsResponse.data;
      const requests: FriendRequestWithNames[] = requestsResponse.data;

      // Display friends section
      UI.println('Friends:');
      if (friends.length === 0) {
        UI.println('  (none)');
      } else {
        for (const friend of friends) {
          UI.println(`  - ${friend.friend_full_name}`);
        }
      }

      // Display pending requests section
      UI.println('');
      UI.println('Pending Requests:');
      if (requests.length === 0) {
        UI.println('  (none)');
      } else {
        for (const request of requests) {
          const requesterName = request.requester_full_name || 'Unknown';
          UI.println(`  - ${requesterName}`);
        }
      }

      logger.info('Friends and requests listed successfully', { 
        friendCount: friends.length, 
        requestCount: requests.length 
      });

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Friends command failed', {
        error: msg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.stderr.write(UI.error(`Friends command failed: ${msg}`) + '\n');
      process.exit(1);
    }
  },
};

export default friendCommand;
export { friendsCommand };
