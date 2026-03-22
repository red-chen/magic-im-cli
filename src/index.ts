#!/usr/bin/env node

/**
 * Magic IM CLI - Main Entry Point
 *
 * This file is the mode dispatcher:
 * - Non-interactive mode (with command) → cli module (English only)
 * - Interactive mode (no command) → tui module (supports i18n)
 */

import { createLogger } from './cli/utils/logger.js';
import { printError } from './cli/utils/output.js';

const logger = createLogger('main');

// Global error handler for uncaught exceptions
const handleFatalError = (error: unknown, source: string): void => {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(`${source}: ${msg}`, { stack });
  printError(`${source}: ${msg}`);
  process.exit(1);
};

// Register global error handlers early
process.on('uncaughtException', (error: Error) => {
  handleFatalError(error, 'Uncaught Exception');
});

process.on('unhandledRejection', (reason: unknown) => {
  handleFatalError(reason, 'Unhandled Rejection');
});

async function main() {
  logger.info('CLI started', { args: process.argv.slice(2) });

  // Check for session restore flag (for TUI mode)
  const sessionIdx = process.argv.indexOf('-s');
  const sessionId = sessionIdx !== -1 ? process.argv[sessionIdx + 1] : undefined;

  // Detect interactive mode: no positional command arg → interactive
  // But help/version flags should trigger CLI (yargs), not interactive mode
  const helpFlags = ['-h', '--help', '-v', '--version'];
  const hasHelpFlag = process.argv.slice(2).some((arg) => helpFlags.includes(arg));
  const nonFlagArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('-') && arg !== sessionId);
  const hasCommand = nonFlagArgs.length > 0 || hasHelpFlag;

  if (hasCommand) {
    // Non-interactive mode: import and run CLI module
    logger.info('Entering non-interactive CLI mode');
    const { runCli } = await import('./cli/index.js');
    await runCli();
  } else {
    // Interactive mode: import and run TUI module
    logger.info('Entering interactive TUI mode');

    // Show welcome banner before TUI
    const { showWelcomeBanner } = await import('./cli/utils/output.js');
    showWelcomeBanner();

    const { startTui } = await import('./tui/index.js');
    await startTui(sessionId);
  }
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  logger.error('CLI error', { message: msg, error: error instanceof Error ? error.stack : undefined });
  printError(msg);
  process.exit(1);
});
