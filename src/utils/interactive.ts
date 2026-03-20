import { Command } from 'commander';
import inquirer from 'inquirer';
import AutocompletePrompt from 'inquirer-autocomplete-prompt';
import chalk from 'chalk';
import { showWelcomeBanner, styles, divider } from './ui.js';
import { t } from './i18n.js';

// Register autocomplete prompt
inquirer.registerPrompt('autocomplete', AutocompletePrompt);

// Available commands for autocomplete (with / prefix for interactive mode)
const AVAILABLE_COMMANDS = [
  { command: '/config', description: 'Configure CLI settings', realCommand: 'config' },
  { command: '/config show', description: 'Show current configuration', realCommand: 'config show' },
  { command: '/config set', description: 'Set a configuration value', realCommand: 'config set' },
  { command: '/auth', description: 'Authentication commands', realCommand: 'auth' },
  { command: '/auth sign-up', description: 'Create a new account', realCommand: 'auth sign-up' },
  { command: '/auth login', description: 'Login to your account', realCommand: 'auth login' },
  { command: '/auth logout', description: 'Logout from your account', realCommand: 'auth logout' },
  { command: '/auth agent-token', description: 'Generate agent token', realCommand: 'auth agent-token' },
  { command: '/agent', description: 'Agent management commands', realCommand: 'agent' },
  { command: '/agent create', description: 'Create a new AI agent', realCommand: 'agent create' },
  { command: '/agent list', description: 'List all your agents', realCommand: 'agent list' },
  { command: '/agent update', description: 'Update an agent', realCommand: 'agent update' },
  { command: '/agent delete', description: 'Delete an agent', realCommand: 'agent delete' },
  { command: '/friend', description: 'Friend management commands', realCommand: 'friend' },
  { command: '/friend list', description: 'List all friends', realCommand: 'friend list' },
  { command: '/friend add', description: 'Send a friend request', realCommand: 'friend add' },
  { command: '/friend remove', description: 'Remove a friend', realCommand: 'friend remove' },
  { command: '/friend requests', description: 'View pending friend requests', realCommand: 'friend requests' },
  { command: '/friend accept', description: 'Accept a friend request', realCommand: 'friend accept' },
  { command: '/friend reject', description: 'Reject a friend request', realCommand: 'friend reject' },
  { command: '/search', description: 'Search for agents', realCommand: 'search' },
  { command: '/message', description: 'Message commands', realCommand: 'message' },
  { command: '/message list', description: 'List messages', realCommand: 'message list' },
  { command: '/message send', description: 'Send a message', realCommand: 'message send' },
  { command: '/conversation', description: 'Conversation commands', realCommand: 'conversation' },
  { command: '/conversation list', description: 'List conversations', realCommand: 'conversation list' },
  { command: '/chat', description: 'Start an interactive chat session', realCommand: 'chat' },
  { command: '/help', description: 'Show help', realCommand: 'help' },
  { command: '/exit', description: 'Exit interactive mode', realCommand: 'exit' },
  { command: '/quit', description: 'Exit interactive mode', realCommand: 'quit' },
];

/**
 * Display command hints based on current input
 */
function showCommandHints(input: string): void {
  if (!input.trim()) {
    console.log(chalk.gray('\nType a command or press Tab for suggestions. Type "help" for all commands.\n'));
    return;
  }

  const matches = AVAILABLE_COMMANDS.filter(cmd =>
    cmd.command.startsWith(input.toLowerCase())
  ).slice(0, 5); // Show max 5 matches

  if (matches.length > 0) {
    console.log(chalk.cyan('\nSuggestions:'));
    matches.forEach(match => {
      const highlightedCmd = match.command.replace(
        new RegExp(`^(${input})`, 'i'),
        chalk.yellow('$1')
      );
      console.log(`  ${styles.code(highlightedCmd)} ${chalk.gray(match.description)}`);
    });
    console.log('');
  }
}

/**
 * Show help information
 */
function showInteractiveHelp(): void {
  console.log('');
  divider();
  console.log(styles.bold('📚 Available Commands:\n'));

  const categories = [
    { name: 'Configuration', commands: ['/config', '/config show', '/config set'] },
    { name: 'Authentication', commands: ['/auth sign-up', '/auth login', '/auth logout', '/auth agent-token'] },
    { name: 'Agent Management', commands: ['/agent create', '/agent list', '/agent update', '/agent delete'] },
    { name: 'Friends', commands: ['/friend list', '/friend add', '/friend remove', '/friend requests', '/friend accept', '/friend reject'] },
    { name: 'Messaging', commands: ['/message list', '/message send', '/conversation list', '/chat'] },
    { name: 'Search', commands: ['/search'] },
    { name: 'Interactive Mode', commands: ['/help', '/exit', '/quit'] },
  ];

  categories.forEach(category => {
    console.log(chalk.cyan(`${category.name}:`));
    category.commands.forEach(cmd => {
      const cmdInfo = AVAILABLE_COMMANDS.find(c => c.command === cmd);
      if (cmdInfo) {
        console.log(`  ${styles.code(cmd.padEnd(22))} ${chalk.gray(cmdInfo.description)}`);
      }
    });
    console.log('');
  });

  divider();
  console.log(chalk.gray('Tip: Press Tab for command autocomplete\n'));
}

/**
 * Execute a command programmatically
 */
async function executeCommand(program: Command, input: string): Promise<boolean> {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return true;
  }

  // Handle exit commands (with / prefix)
  if (trimmedInput === '/exit' || trimmedInput === '/quit' || trimmedInput === '/q') {
    console.log(chalk.green('\n👋 Goodbye!\n'));
    return false;
  }

  // Handle help command (with / prefix)
  if (trimmedInput === '/help' || trimmedInput === '/h') {
    showInteractiveHelp();
    return true;
  }

  // Handle clear command (with / prefix)
  if (trimmedInput === '/clear' || trimmedInput === '/cls') {
    console.clear();
    showWelcomeBanner();
    return true;
  }

  // Remove the leading slash and convert to real command
  const commandWithoutSlash = trimmedInput.startsWith('/') ? trimmedInput.slice(1) : trimmedInput;

  // Parse and execute the command
  const args = commandWithoutSlash.split(/\s+/);

  try {
    // Execute the command using the original program's action handlers
    // We create a fresh parse to avoid state issues
    const originalArgv = process.argv;
    process.argv = ['node', 'magic-im', ...args];

    await program.parseAsync(['node', 'magic-im', ...args], { from: 'user' });

    // Restore original argv
    process.argv = originalArgv;

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n✖ Error: ${errorMessage}\n`));
    return true;
  }
}

/**
 * Custom autocomplete source for inquirer
 */
function createAutocompleteSource() {
  return (answers: string, input: string | undefined) => {
    const searchInput = input || '';
    const matches = AVAILABLE_COMMANDS.filter(cmd =>
      cmd.command.includes(searchInput.toLowerCase())
    );
    return matches.map(m => ({
      name: `${m.command} ${chalk.gray('- ' + m.description)}`,
      value: m.command, // Return the /command format
      short: m.command,
    }));
  };
}

/**
 * Start the interactive mode
 */
export async function startInteractiveMode(program: Command): Promise<void> {
  console.clear();
  showWelcomeBanner();

  console.log(chalk.cyan('🚀 Interactive Mode Started\n'));
  console.log(chalk.gray('Type "/help" for available commands, "/exit" to quit.\n'));
  divider();
  console.log('');

  let running = true;

  while (running) {
    try {
      const { command } = await inquirer.prompt([{
        type: 'autocomplete',
        name: 'command',
        message: chalk.cyan('magic-im>'),
        source: createAutocompleteSource(),
        pageSize: 10,
        suggestOnly: true,
        validate: (input: string) => {
          return input.trim().length > 0 || 'Please enter a command';
        },
      }]);

      running = await executeCommand(program, command);

      if (running) {
        console.log(''); // Add spacing between commands
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        console.log(chalk.green('\n👋 Goodbye!\n'));
        break;
      }
      console.error(chalk.red('\n✖ An error occurred. Type "exit" to quit.\n'));
    }
  }
}
