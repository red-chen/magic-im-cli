import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';

// Mock dependencies
vi.mock('inquirer', () => ({
  default: {
    registerPrompt: vi.fn(),
    prompt: vi.fn(),
  },
}));

vi.mock('inquirer-autocomplete-prompt', () => ({
  default: vi.fn(),
}));

vi.mock('./ui.js', () => ({
  showWelcomeBanner: vi.fn(),
  styles: {
    code: vi.fn((text: string) => text),
    bold: vi.fn((text: string) => text),
  },
  divider: vi.fn(),
}));

vi.mock('./i18n.js', () => ({
  t: vi.fn((key: string) => key),
}));

describe('Interactive Mode', () => {
  let program: Command;
  let consoleLogSpy: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.fn>;
  let consoleClearSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    program = new Command();
    program.name('magic-im');

    // Add a mock command
    const mockCommand = new Command('test')
      .description('Test command')
      .action(() => {
        console.log('Test command executed');
      });
    program.addCommand(mockCommand);

    consoleLogSpy = vi.fn();
    consoleErrorSpy = vi.fn();
    consoleClearSpy = vi.fn();

    vi.spyOn(console, 'log').mockImplementation(consoleLogSpy);
    vi.spyOn(console, 'error').mockImplementation(consoleErrorSpy);
    vi.spyOn(console, 'clear').mockImplementation(consoleClearSpy);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Execution', () => {
    it('should exit when "exit" command is entered', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ command: 'exit' });

      await startInteractiveMode(program);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Goodbye'));
    });

    it('should exit when "quit" command is entered', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ command: 'quit' });

      await startInteractiveMode(program);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Goodbye'));
    });

    it('should exit when "q" command is entered', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ command: 'q' });

      await startInteractiveMode(program);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Goodbye'));
    });

    it('should show help when "help" command is entered', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ command: 'help' })
        .mockResolvedValueOnce({ command: 'exit' });

      await startInteractiveMode(program);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Available Commands'));
    });

    it('should show help when "h" command is entered', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ command: 'h' })
        .mockResolvedValueOnce({ command: 'exit' });

      await startInteractiveMode(program);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Available Commands'));
    });

    it('should clear screen when "clear" command is entered', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ command: 'clear' })
        .mockResolvedValueOnce({ command: 'exit' });

      await startInteractiveMode(program);

      expect(consoleClearSpy).toHaveBeenCalled();
    });

    it('should clear screen when "cls" command is entered', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ command: 'cls' })
        .mockResolvedValueOnce({ command: 'exit' });

      await startInteractiveMode(program);

      expect(consoleClearSpy).toHaveBeenCalled();
    });

    it('should handle empty input gracefully', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ command: '   ' })
        .mockResolvedValueOnce({ command: 'exit' });

      await startInteractiveMode(program);

      // Should continue running after empty input
      expect(inquirer.prompt).toHaveBeenCalledTimes(2);
    });

    it('should handle command execution errors gracefully', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      const errorCommand = new Command('error-cmd')
        .action(() => {
          throw new Error('Test error');
        });
      program.addCommand(errorCommand);

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ command: 'error-cmd' })
        .mockResolvedValueOnce({ command: 'exit' });

      await startInteractiveMode(program);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error'));
    });
  });

  describe('Autocomplete Source', () => {
    it('should filter commands based on input', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      // Capture the autocomplete source function
      let autocompleteSource: Function | undefined;
      vi.mocked(inquirer.prompt).mockImplementation((questions: any) => {
        if (Array.isArray(questions) && questions[0]?.source) {
          autocompleteSource = questions[0].source;
        }
        return Promise.resolve({ command: 'exit' });
      });

      await startInteractiveMode(program);

      expect(autocompleteSource).toBeDefined();

      // Test filtering
      const results = autocompleteSource!({}, 'auth');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r: any) => r.value.includes('auth'))).toBe(true);
    });

    it('should return all commands when input is empty', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      let autocompleteSource: Function | undefined;
      vi.mocked(inquirer.prompt).mockImplementation((questions: any) => {
        if (Array.isArray(questions) && questions[0]?.source) {
          autocompleteSource = questions[0].source;
        }
        return Promise.resolve({ command: 'exit' });
      });

      await startInteractiveMode(program);

      expect(autocompleteSource).toBeDefined();

      const results = autocompleteSource!({}, '');
      expect(results.length).toBeGreaterThan(10); // Should have many commands
    });
  });

  describe('User Interrupt', () => {
    it('should handle user force close (Ctrl+C)', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      vi.mocked(inquirer.prompt).mockRejectedValue(
        new Error('User force closed the prompt')
      );

      await startInteractiveMode(program);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Goodbye'));
    });
  });

  describe('Multiple Commands', () => {
    it('should process multiple commands before exit', async () => {
      const { startInteractiveMode } = await import('./interactive.js');

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ command: 'help' })
        .mockResolvedValueOnce({ command: 'clear' })
        .mockResolvedValueOnce({ command: 'exit' });

      await startInteractiveMode(program);

      expect(inquirer.prompt).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Available Commands'));
      expect(consoleClearSpy).toHaveBeenCalled();
    });
  });
});
