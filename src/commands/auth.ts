import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { apiClient } from '../utils/api.js';
import { setToken, clearToken, setAgentToken, clearAgentToken, getToken } from '../utils/config.js';
import { formatSuccess, formatError, formatInfo } from '../utils/format.js';
import { User, Agent } from '../types/index.js';

export const authCommands = new Command('auth')
  .description('Authentication commands');

// Sign up
authCommands
  .command('sign-up')
  .description('Register a new user account')
  .option('-e, --email <email>', 'Email address')
  .option('-n, --nickname <nickname>', 'Nickname')
  .option('-p, --password <password>', 'Password')
  .action(async (options) => {
    try {
      let { email, nickname, password } = options;

      // Interactive prompts for missing values
      if (!email) {
        const answer = await inquirer.prompt([{
          type: 'input',
          name: 'email',
          message: 'Email:',
          validate: (input) => input.includes('@') || 'Please enter a valid email',
        }]);
        email = answer.email;
      }

      if (!nickname) {
        const answer = await inquirer.prompt([{
          type: 'input',
          name: 'nickname',
          message: 'Nickname:',
          validate: (input) => input.length > 0 || 'Nickname is required',
        }]);
        nickname = answer.nickname;
      }

      if (!password) {
        const answer = await inquirer.prompt([{
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
          validate: (input) => input.length >= 6 || 'Password must be at least 6 characters',
        }]);
        password = answer.password;
      }

      const spinner = ora('Creating account...').start();
      const response = await apiClient.post<{ user: User; token: string }>('/auth/sign-up', {
        email,
        nickname,
        password,
      });
      spinner.stop();

      if (response.success) {
        setToken(response.data.token);
        console.log(formatSuccess('Account created successfully!'));
        console.log(formatInfo(`Welcome, ${response.data.user.nickname}!`));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Sign up failed'));
      process.exit(1);
    }
  });

// Sign in
authCommands
  .command('sign-in')
  .description('Sign in to your account')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --password <password>', 'Password')
  .action(async (options) => {
    try {
      let { email, password } = options;

      if (!email) {
        const answer = await inquirer.prompt([{
          type: 'input',
          name: 'email',
          message: 'Email:',
        }]);
        email = answer.email;
      }

      if (!password) {
        const answer = await inquirer.prompt([{
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*',
        }]);
        password = answer.password;
      }

      const spinner = ora('Signing in...').start();
      const response = await apiClient.post<{ user: User; token: string }>('/auth/sign-in', {
        email,
        password,
      });
      spinner.stop();

      if (response.success) {
        setToken(response.data.token);
        console.log(formatSuccess('Signed in successfully!'));
        console.log(formatInfo(`Welcome back, ${response.data.user.nickname}!`));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Sign in failed'));
      process.exit(1);
    }
  });

// Sign out
authCommands
  .command('sign-out')
  .description('Sign out from your account')
  .action(async () => {
    try {
      const spinner = ora('Signing out...').start();
      await apiClient.post('/auth/sign-out');
      clearToken();
      clearAgentToken();
      spinner.stop();
      console.log(formatSuccess('Signed out successfully!'));
    } catch (error) {
      // Still clear tokens locally even if API call fails
      clearToken();
      clearAgentToken();
      console.log(formatSuccess('Signed out locally'));
    }
  });

// Generate agent token
authCommands
  .command('agent-token <agent_id>')
  .description('Generate an access token for an agent')
  .action(async (agentId: string) => {
    try {
      const spinner = ora('Generating agent token...').start();
      const response = await apiClient.post<{ agent_token: string; agent: Agent }>('/auth/agent-token', {
        agent_id: agentId,
      });
      spinner.stop();

      if (response.success) {
        setAgentToken(response.data.agent_token);
        console.log(formatSuccess('Agent token generated successfully!'));
        console.log(formatInfo(`Agent: ${response.data.agent.full_name}`));
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to generate agent token'));
      process.exit(1);
    }
  });

// Refresh token
authCommands
  .command('refresh')
  .description('Refresh your authentication token')
  .action(async () => {
    try {
      const spinner = ora('Refreshing token...').start();
      const response = await apiClient.post<{ token: string; user?: User; agent?: Agent }>('/auth/refresh');
      spinner.stop();

      if (response.success) {
        setToken(response.data.token);
        console.log(formatSuccess('Token refreshed successfully!'));
        if (response.data.user) {
          console.log(formatInfo(`User: ${response.data.user.nickname}`));
        }
        if (response.data.agent) {
          console.log(formatInfo(`Agent: ${response.data.agent.full_name}`));
        }
      }
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Failed to refresh token'));
      process.exit(1);
    }
  });

// Verify token (check status)
authCommands
  .command('status')
  .description('Check authentication status')
  .action(() => {
    const token = getToken();
    if (token) {
      console.log(formatInfo('You are authenticated'));
    } else {
      console.log(formatInfo('You are not authenticated'));
    }
  });

export default authCommands;
