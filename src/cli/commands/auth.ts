import type { CommandModule } from 'yargs';
import { authApi } from '../../core/api/index.js';
import { setToken, clearToken, setAgentToken, clearAgentToken, getToken } from '../../core/config/config.js';
import { spinner } from '../utils/spinner.js';
import { printSuccess, printInfo, printError } from '../utils/output.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth');

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
      const response = await authApi.signUp({
        email: argv.email,
        nickname: argv.nickname,
        password: argv.password,
      });
      stop();
      if (response.success) {
        setToken(response.data.token);
        printSuccess('Account created successfully!');
        printInfo(`Welcome, ${response.data.user.nickname}!`);
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Sign up failed';
      logger.error('sign-up failed', { message: msg });
      printError(msg);
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
      const response = await authApi.signIn({
        email: argv.email,
        password: argv.password,
      });
      stop();
      if (response.success) {
        setToken(response.data.token);
        printSuccess('Signed in successfully!');
        printInfo(`Welcome back, ${response.data.user.nickname}!`);
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Sign in failed';
      logger.error('sign-in failed', { message: msg });
      printError(msg);
    }
  },
};

// ─── signin (shortcut command) ───────────────────────────────────────────────
export const signinShortcut: CommandModule<{}, { mail: string; password: string }> = {
  command: 'signin',
  describe: 'Sign in to your account (shortcut)',
  builder: (yargs) =>
    yargs
      .option('mail', { type: 'string', demandOption: true, description: 'Email address' })
      .option('password', { type: 'string', demandOption: true, description: 'Password' }),
  handler: async (argv) => {
    const stop = spinner('Signing in...');
    try {
      const response = await authApi.signIn({
        email: argv.mail,
        password: argv.password,
      });
      stop();
      if (response.success) {
        setToken(response.data.token);
        printSuccess('Signed in successfully!');
        printInfo(`Welcome back, ${response.data.user.nickname}!`);
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Sign in failed';
      logger.error('signin failed', { message: msg });
      printError(msg);
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
      await authApi.signOut();
    } catch {
      // still clear tokens locally
    } finally {
      stop();
    }
    clearToken();
    clearAgentToken();
    printSuccess('Signed out successfully!');
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
      const response = await authApi.generateAgentToken(argv.agent_id);
      stop();
      if (response.success) {
        setAgentToken(response.data.agent_token);
        printSuccess('Agent token generated successfully!');
        printInfo(`Agent: ${response.data.agent.full_name}`);
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to generate agent token';
      logger.error('agent-token failed', { message: msg });
      printError(msg);
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
      const response = await authApi.refreshToken();
      stop();
      if (response.success) {
        setToken(response.data.token);
        printSuccess('Token refreshed successfully!');
        if (response.data.user) printInfo(`User: ${response.data.user.nickname}`);
        if (response.data.agent) printInfo(`Agent: ${response.data.agent.full_name}`);
      }
    } catch (error) {
      stop();
      const msg = error instanceof Error ? error.message : 'Failed to refresh token';
      logger.error('refresh failed', { message: msg });
      printError(msg);
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
      printInfo('You are authenticated');
    } else {
      printInfo('You are not authenticated');
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

export default authCommands;
