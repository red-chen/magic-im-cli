#!/usr/bin/env node

/**
 * Magic IM CLI - Main Entry Point
 *
 * This file is the mode dispatcher:
 * - Non-interactive mode (with command) → cli module
 * - Interactive mode (no command) → tui module
 */

// Global error handler for uncaught exceptions
const handleFatalError = (error: unknown, source: string): void => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`${source}: ${msg}`);
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
  // Check for session restore flag (for TUI mode)
  const sessionIdx = process.argv.indexOf('-s');
  const sessionId = sessionIdx !== -1 ? process.argv[sessionIdx + 1] : undefined;

  // Check for workspace flag (for TUI mode)
  const workspaceIdx = process.argv.findIndex((arg) => arg === '-w' || arg === '--workspace');
  const workspace = workspaceIdx !== -1 ? process.argv[workspaceIdx + 1] : undefined;

  // Detect interactive mode: no positional command arg → interactive
  // But help/version flags should trigger CLI (yargs), not interactive mode
  const helpFlags = ['-h', '--help', '-v', '--version'];
  const hasHelpFlag = process.argv.slice(2).some((arg) => helpFlags.includes(arg));
  const nonFlagArgs = process.argv.slice(2).filter((arg) => 
    !arg.startsWith('-') && arg !== sessionId && arg !== workspace
  );
  const hasCommand = nonFlagArgs.length > 0 || hasHelpFlag;

  if (hasCommand) {
    // Non-interactive mode: import and run CLI module
    const { runCli } = await import('./cli/index.js');
    await runCli();
  } else {
    // Interactive mode: import and run TUI module
    const { startTui } = await import('./tui/index.js');
    await startTui(sessionId, workspace);
  }
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(msg);
  process.exit(1);
});
