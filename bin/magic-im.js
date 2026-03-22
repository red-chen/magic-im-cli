#!/usr/bin/env node
/**
 * magic-im CLI entry point
 *
 * @opentui/core and @opentui/solid are Bun-only packages (they use Bun-specific
 * import assertions for .scm grammar files and .wasm binaries). This shim
 * detects whether the process was launched by Bun; if not, it re-spawns itself
 * using the `bun` binary bundled in the project's .bun directory.
 */

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Log fatal errors to file (minimal logging before main app loads)
const logFatalError = (source, error) => {
  try {
    const logDir = join(homedir(), '.magic-im');
    const logFile = join(logDir, 'trace.log');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    const timestamp = new Date().toISOString();
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    const logLine = `[${timestamp}] [ERROR] [CLI] ${source}: ${msg} ${stack ? JSON.stringify({ stack }) : ''}\n`;
    appendFileSync(logFile, logLine, 'utf-8');
    process.stderr.write(`${source}: ${msg}\n`);
  } catch {
    // Ignore logging errors
    process.stderr.write(`${source}: ${error}\n`);
  }
  process.exit(1);
};

// Register global error handlers early
process.on('uncaughtException', (error) => {
  logFatalError('Uncaught Exception', error);
});

process.on('unhandledRejection', (reason) => {
  logFatalError('Unhandled Rejection', reason);
});

// Already running under Bun — import the compiled entry directly
if (typeof Bun !== 'undefined') {
  await import('../dist/index.js').catch((error) => {
    logFatalError('Failed to load CLI', error);
  });
} else {
  // Find bun: check local install first, then PATH
  const localBun = join(__dirname, '../.bun/bin/bun');
  const bunBin = existsSync(localBun) ? localBun : 'bun';

  const distEntry = resolve(__dirname, '../dist/index.js');

  try {
    execFileSync(bunBin, [distEntry, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (err) {
    // execFileSync throws when child exits with non-zero; exit code already
    // propagated via stdio:inherit, so mirror it here.
    const code = err && typeof err === 'object' && 'status' in err ? err.status : 1;
    process.exit(code ?? 1);
  }
}
