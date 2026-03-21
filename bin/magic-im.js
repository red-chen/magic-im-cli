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
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Already running under Bun — import the compiled entry directly
if (typeof Bun !== 'undefined') {
  await import('../dist/index.js');
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
