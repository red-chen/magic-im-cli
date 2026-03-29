import { Command } from 'commander';
import * as readline from 'readline';
import { configManager } from '../config/store.js';
import { apiClient, handleApiError } from '../api/client.js';
import { output } from '../utils/output.js';

function question(prompt: string, isPassword = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (isPassword) {
      process.stdout.write(prompt);
      const stdin = process.stdin;
      stdin.setRawMode?.(true);
      let password = '';
      
      stdin.on('data', (char) => {
        const c = char.toString();
        if (c === '\n' || c === '\r') {
          stdin.setRawMode?.(false);
          console.log();
          rl.close();
          resolve(password);
        } else if (c === '\u0003') {
          process.exit();
        } else if (c === '\u007F') {
          password = password.slice(0, -1);
          process.stdout.clearLine?.(0);
          process.stdout.cursorTo?.(0);
          process.stdout.write(prompt + '*'.repeat(password.length));
        } else {
          password += c;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

export function registerAuthCommands(program: Command) {
  // init command
  program
    .command('init')
    .description('Initialize configuration (set server URL)')
    .argument('[url]', 'Server URL')
    .action(async (url?: string) => {
      try {
        if (!url) {
          url = await question('Server URL (default: http://localhost:3000): ');
          if (!url) url = 'http://localhost:3000';
        }
        
        configManager.setServerUrl(url);
        output.success(`Server URL set to: ${url}`);
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // register command
  program
    .command('register')
    .description('Register a new agent')
    .action(async () => {
      try {
        const agentId = await question('Agent ID: ');
        const name = await question('Name: ');
        const secretKey = await question('Secret Key: ', true);

        if (!agentId || !name || !secretKey) {
          output.error('All fields are required');
          process.exit(1);
        }

        if (secretKey.length < 6) {
          output.error('Secret key must be at least 6 characters');
          process.exit(1);
        }

        const agent = await apiClient.register(agentId, name, secretKey);
        output.success(`Agent registered: ${agent.agentId}`);
        output.info('You can now login with: magic-im login');
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // login command
  program
    .command('login')
    .description('Login to the server')
    .action(async () => {
      try {
        const agentId = await question('Agent ID: ');
        const secretKey = await question('Secret Key: ', true);

        if (!agentId || !secretKey) {
          output.error('Agent ID and secret key are required');
          process.exit(1);
        }

        const result = await apiClient.login(agentId, secretKey);
        configManager.setCredentials(result.token, result.agent.agentId, result.agent.name);
        output.success(`Logged in as: ${result.agent.name} (${result.agent.agentId})`);
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });

  // logout command
  program
    .command('logout')
    .description('Logout from the server')
    .action(async () => {
      try {
        if (!configManager.isLoggedIn()) {
          output.warn('Not logged in');
          return;
        }

        await apiClient.logout();
        configManager.clearCredentials();
        output.success('Logged out');
      } catch (error) {
        // Still clear credentials even if server call fails
        configManager.clearCredentials();
        output.success('Logged out');
      }
    });

  // whoami command
  program
    .command('whoami')
    .description('Show current logged-in agent')
    .action(async () => {
      try {
        if (!configManager.isLoggedIn()) {
          output.info('Not logged in');
          return;
        }

        const agent = await apiClient.getMe();
        output.header('Current Agent');
        output.keyValue({
          'Agent ID': agent.agentId,
          'Name': agent.name,
          'Status': agent.status,
          'Created': new Date(agent.createdAt).toLocaleString(),
          'Last Seen': new Date(agent.lastSeenAt).toLocaleString(),
        });
      } catch (error) {
        output.error(handleApiError(error));
        process.exit(1);
      }
    });
}
