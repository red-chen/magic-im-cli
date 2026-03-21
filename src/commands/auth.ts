import type { CommandModule } from 'yargs';
import { apiClient } from '../utils/api.js';
import { setToken, clearToken, setAgentToken, clearAgentToken, getToken } from '../utils/config.js';
import { UI, spinner } from '../utils/ui.js';
import type { User, Agent } from '../types/index.js';

// ─── sign-up ─────────────────────────────────────────────────────────────────
const signUp: CommandModule<{}, { email: string; nickname: string; password: string }> = {
  command: 'sign-up',
  describe: 'Register a new user account',
  builder: (yargs) =>
    yargs
      .option('email', { alias: 'e', type: 'string', demandOption: true, description: 'Email address' })
      .option('nickname', { alias: 'n', type: 'string', demandOption: true, description: 'Nickname' })
      .option('password', { alias: 'p', type: 'string', demandOption: true, description: 'Password' }),
  handler: async (argv) => {
    const stop = spinner('Creating account...');
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/sign-up', {
        email: argv.email,
        nickname: argv.nickname,
        password: argv.password,
      });
      stop();
      if (response.success) {
        setToken(response.data.token);
        UI.println(UI.success('Account created successfully!'));
        UI.println(UI.info(`Welcome, ${response.data.user.nickname}!`));
      }
    } catch (error) {
      stop();
      process.stderr.write(UI.error(error instanceof Error ? error.message : 'Sign up failed') + '\n');
      process.exit(1);
    }
  },
};

// ─── sign-in ─────────────────────────────────────────────────────────────────
const signIn: CommandModule<{}, { email: string; password: string }> = {
  command: 'sign-in',
  describe: 'Sign in to your account',
  builder: (yargs) =>
    yargs
      .option('email', { alias: 'e', type: 'string', demandOption: true, description: 'Email address' })
      .option('password', { alias: 'p', type: 'string', demandOption: true, description: 'Password' }),
  handler: async (argv) => {
    const stop = spinner('Signing in...');
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/sign-in', {
        email: argv.email,
        password: argv.password,
      });
      stop();
      if (response.success) {
        setToken(response.data.token);
        UI.println(UI.success('Signed in successfully!'));
        UI.println(UI.info(`Welcome back, ${response.data.user.nickname}!`));
      }
    } catch (error) {
      stop();
      process.stderr.write(UI.error(error instanceof Error ? error.message : 'Sign in failed') + '\n');
      process.exit(1);
    }
  },
};

// ─── signin (shortcut command) ───────────────────────────────────────────────
const signinShortcut: CommandModule<{}, { mail: string; password: string }> = {
  command: 'signin',
  describe: 'Sign in to your account (shortcut)',
  builder: (yargs) =>
    yargs
      .option('mail', { type: 'string', demandOption: true, description: 'Email address' })
      .option('password', { type: 'string', demandOption: true, description: 'Password' }),
  handler: async (argv) => {
    const stop = spinner('Signing in...');
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/sign-in', {
        email: argv.mail,
        password: argv.password,
      });
      stop();
      if (response.success) {
        setToken(response.data.token);
        UI.println(UI.success('Signed in successfully!'));
        UI.println(UI.info(`Welcome back, ${response.data.user.nickname}!`));
      }
    } catch (error) {
      stop();
      process.stderr.write(UI.error(error instanceof Error ? error.message : 'Sign in failed') + '\n');
      process.exit(1);
    }
  },
};

// ─── sign-out ─────────────────────────────────────────────────────────────────
const signOut: CommandModule = {
  command: 'sign-out',
  describe: 'Sign out from your account',
  handler: async () => {
    const stop = spinner('Signing out...');
    try {
      await apiClient.post('/auth/sign-out');
    } catch {
      // still clear tokens locally
    } finally {
      stop();
    }
    clearToken();
    clearAgentToken();
    UI.println(UI.success('Signed out successfully!'));
  },
};

// ─── agent-token ─────────────────────────────────────────────────────────────
const agentToken: CommandModule<{}, { agent_id: string }> = {
  command: 'agent-token <agent_id>',
  describe: 'Generate an access token for an agent',
  builder: (yargs) =>
    yargs.positional('agent_id', { type: 'string', demandOption: true, description: 'Agent ID' }),
  handler: async (argv) => {
    const stop = spinner('Generating agent token...');
    try {
      const response = await apiClient.post<{ agent_token: string; agent: Agent }>('/auth/agent-token', {
        agent_id: argv.agent_id,
      });
      stop();
      if (response.success) {
        setAgentToken(response.data.agent_token);
        UI.println(UI.success('Agent token generated successfully!'));
        UI.println(UI.info(`Agent: ${response.data.agent.full_name}`));
      }
    } catch (error) {
      stop();
      process.stderr.write(UI.error(error instanceof Error ? error.message : 'Failed to generate agent token') + '\n');
      process.exit(1);
    }
  },
};

// ─── refresh ─────────────────────────────────────────────────────────────────
const refresh: CommandModule = {
  command: 'refresh',
  describe: 'Refresh your authentication token',
  handler: async () => {
    const stop = spinner('Refreshing token...');
    try {
      const response = await apiClient.post<{ token: string; user?: User; agent?: Agent }>('/auth/refresh');
      stop();
      if (response.success) {
        setToken(response.data.token);
        UI.println(UI.success('Token refreshed successfully!'));
        if (response.data.user) UI.println(UI.info(`User: ${response.data.user.nickname}`));
        if (response.data.agent) UI.println(UI.info(`Agent: ${response.data.agent.full_name}`));
      }
    } catch (error) {
      stop();
      process.stderr.write(UI.error(error instanceof Error ? error.message : 'Failed to refresh token') + '\n');
      process.exit(1);
    }
  },
};

// ─── status ──────────────────────────────────────────────────────────────────
const status: CommandModule = {
  command: 'status',
  describe: 'Check authentication status',
  handler: () => {
    const token = getToken();
    if (token) {
      UI.println(UI.info('You are authenticated'));
    } else {
      UI.println(UI.info('You are not authenticated'));
    }
  },
};

// ─── auth group ──────────────────────────────────────────────────────────────
const authCommands: CommandModule = {
  command: 'auth <command>',
  describe: 'Authentication commands',
  builder: (yargs) =>
    yargs
      .command(signUp)
      .command(signIn)
      .command(signOut)
      .command(agentToken)
      .command(refresh)
      .command(status)
      .demandCommand(1, 'Please specify an auth sub-command'),
  handler: () => {},
};

// Export both the auth command group and the shortcut command
export { signinShortcut };
export default authCommands;
