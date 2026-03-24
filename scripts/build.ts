#!/usr/bin/env bun
/**
 * Build script for magic-im-cli.
 *
 * Uses Bun.build() with the @opentui/solid Bun plugin so that:
 *  - JSX is transformed by the Solid renderer (not tsc)
 *  - .scm grammar files and .wasm binaries are handled natively by Bun
 *  - Output is a single-file ESM bundle that runs under `bun`
 */
import solidPlugin from '@opentui/solid/bun-plugin';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');

// Read version from package.json
const pkg = await Bun.file(resolve(root, 'package.json')).json();
const version = pkg.version || '0.0.1';
const buildTime = new Date().toISOString();

const result = await Bun.build({
  entrypoints: [resolve(root, 'src/index.ts')],
  outdir: resolve(root, 'dist'),
  target: 'node',
  format: 'esm',
  plugins: [solidPlugin],
  tsconfig: resolve(root, 'tsconfig.json'),
  external: [
    // keep heavy native/binary deps external so they're loaded from node_modules
    'bun:ffi',
    'tree-sitter',
    'tree-sitter-javascript',
    'tree-sitter-typescript',
    'tree-sitter-markdown',
    'tree-sitter-zig',
  ],
  sourcemap: 'external',
  define: {
    __VERSION__: JSON.stringify(version),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
});

if (!result.success) {
  console.error('Build failed:');
  for (const msg of result.logs) {
    console.error(msg);
  }
  process.exit(1);
}

console.log(`✔ Built ${result.outputs.length} file(s) to dist/`);
console.log(`  Version: ${version}`);
console.log(`  Build time: ${buildTime}`);
for (const out of result.outputs) {
  console.log(`  ${out.path}`);
}
