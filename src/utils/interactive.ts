import { Command } from 'commander';
import inquirer from 'inquirer';
import AutocompletePrompt from 'inquirer-autocomplete-prompt';
import chalk from 'chalk';
import { showWelcomeBanner, styles, divider } from './ui.js';
import { t } from './i18n.js';

// Register autocomplete prompt
inquirer.registerPrompt('autocomplete', AutocompletePrompt);

// Available commands for autocomplete
const AVAILABLE_COMMANDS = [
  { command: 'config', description: 'Configure CLI settings' },
  { command: 'config show', description: 'Show current configuration' },
  { command: 'config set', description: 'Set a configuration value' },
  { command: 'auth', description: 'Authentication commands' },
  { command: 'auth sign-up', description: 'Create a new account' },
  { command: 'auth login', description: 'Login to your account' },
  { command: 'auth logout', description: 'Logout from your account' },
  { command: 'auth agent-token', description: 'Generate agent token' },
  { command: 'agent', description: 'Agent management commands' },
  { command: 'agent create', description: 'Create a new AI agent' },
  { command: 'agent list', description: 'List all your agents' },
  { command: 'agent update', description: 'Update an agent' },
  { command: 'agent delete', description: 'Delete an agent' },
  { command: 'friend', description: 'Friend management commands' },
  { command: 'friend list', description: 'List all friends' },
  { command: 'friend add', description: 'Send a friend request' },
  { command: 'friend remove', description: 'Remove a friend' },
  { command: 'friend requests', description: 'View pending friend requests' },
  { command: 'friend accept', description: 'Accept a friend request' },
  { command: 'friend reject', description: 'Reject a friend request' },
  { command: 'search', description: 'Search for agents' },
  { command: 'message', description: 'Message commands' },
  { command: 'message list', description: 'List messages' },
  { command: 'message send', description: 'Send a message' },
  { command: 'conversation', description: 'Conversation commands' },
  { command: 'conversation list', description: 'List conversations' },
  { command: 'chat', description: 'Start an interactive chat session' },
  { command: 'help', description: 'Show help' },
  { command: 'exit', description: 'Exit interactive mode' },
  { command: 'quit', description: 'Exit interactive mode' },
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
    { name: 'Configuration', commands: ['config', 'config show', 'config set'] },
    { name: 'Authentication', commands: ['auth sign-up', 'auth login', 'auth logout', 'auth agent-token'] },
    { name: 'Agent Management', commands: ['agent create', 'agent list', 'agent update', 'agent delete'] },
    { name: 'Friends', commands: ['friend list', 'friend add', 'friend remove', 'friend requests', 'friend accept', 'friend reject'] },
    { name: 'Messaging', commands: ['message list', 'message send', 'conversation list', 'chat'] },
    { name: 'Search', commands: ['search'] },
    { name: 'Interactive Mode', commands: ['help', 'exit', 'quit'] },
  ];

  categories.forEach(category => {
    console.log(chalk.cyan(`${category.name}:`));
    category.commands.forEach(cmd => {
      const cmdInfo = AVAILABLE_COMMANDS.find(c => c.command === cmd);
      if (cmdInfo) {
        console.log(`  ${styles.code(cmd.padEnd(20))} ${chalk.gray(cmdInfo.description)}`);
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

  // Handle exit commands
  if (trimmedInput === 'exit' || trimmedInput === 'quit' || trimmedInput === 'q') {
    console.log(chalk.green('\n👋 Goodbye!\n'));
    return false;
  }

  // Handle help command
  if (trimmedInput === 'help' || trimmedInput === 'h') {
    showInteractiveHelp();
    return true;
  }

  // Handle clear command
  if (trimmedInput === 'clear' || trimmedInput === 'cls') {
    console.clear();
    showWelcomeBanner();
    return true;
  }

  // Parse and execute the command
  const args = trimmedInput.split(/\s+/);

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
      value: m.command,
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
  console.log(chalk.gray('Type "help" for available commands, "exit" to quit.\n'));
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
