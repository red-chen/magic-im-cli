import { RGBA, TextAttributes } from '@opentui/core';
import type { SpinnerRenderable } from 'opentui-spinner';
import Table from 'cli-table3';
import { t } from './i18n.js';

// ─── Color palette (opencode dark theme) ─────────────────────────────────────
const Colors = {
  // Primary accent (opencode orange/peach)
  primary: RGBA.fromInts(250, 178, 131),   // #fab283
  // Accent (purple)
  accent: RGBA.fromInts(157, 124, 216),    // #9d7cd8
  // Semantic colors
  success: RGBA.fromInts(127, 216, 143),   // #7fd88f
  warning: RGBA.fromInts(245, 167, 66),    // #f5a742
  error: RGBA.fromInts(224, 108, 117),     // #e06c75
  info: RGBA.fromInts(86, 182, 194),       // #56b6c2
  // Interactive (cyan)
  interactive: RGBA.fromInts(86, 182, 194), // #56b6c2
  // Text colors
  text: RGBA.fromInts(238, 238, 238),      // #eeeeee
  textStrong: RGBA.fromInts(255, 255, 255), // #ffffff
  textWeak: RGBA.fromInts(128, 128, 128),  // #808080
  textMuted: RGBA.fromInts(99, 110, 114),  // #636e72
  // Background colors
  background: RGBA.fromInts(10, 10, 10),   // #0a0a0a
  backgroundPanel: RGBA.fromInts(17, 17, 17), // #111111
  backgroundElement: RGBA.fromInts(26, 26, 26), // #1a1a1a
  // Legacy aliases
  cyan: RGBA.fromInts(86, 182, 194),
  green: RGBA.fromInts(127, 216, 143),
  red: RGBA.fromInts(224, 108, 117),
  yellow: RGBA.fromInts(245, 167, 66),
  blue: RGBA.fromInts(86, 182, 194),
  magenta: RGBA.fromInts(157, 124, 216),
  white: RGBA.fromInts(255, 255, 255),
  gray: RGBA.fromInts(128, 128, 128),
  orange: RGBA.fromInts(250, 178, 131),
  dim: RGBA.fromInts(128, 128, 128),
};

// ─── Low-level ANSI helper (used when opentui renderer is not active) ─────────
function ansi(text: string, code: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

// ─── Fallback text styles (chalk-compatible ANSI escapes) ─────────────────────
// These are used for non-TUI output (banners, table captions, etc.)
export const styles = {
  title: (text: string): string => ansi(text, '1;36'), // bold cyan
  subtitle: (text: string): string => ansi(text, '1;36'),
  success: (text: string): string => ansi('✔ ' + text, '32'),
  error: (text: string): string => ansi('✖ ' + text, '31'),
  warning: (text: string): string => ansi('⚠ ' + text, '33'),
  info: (text: string): string => ansi('ℹ ' + text, '34'),
  dim: (text: string): string => ansi(text, '2'),
  bold: (text: string): string => ansi(text, '1'),
  italic: (text: string): string => ansi(text, '3'),
  code: (text: string): string => ansi(` ${text} `, '7'),
  link: (text: string): string => ansi(text, '4;34'),
};

// ─── UI namespace — structured helpers for printing ──────────────────────────
export const UI = {
  /** print a success message (no newline) */
  success: (text: string): string => styles.success(text),
  /** print an error message (no newline) */
  error: (text: string): string => styles.error(text),
  /** print an info message */
  info: (text: string): string => styles.info(text),
  /** print a warning message */
  warning: (text: string): string => styles.warning(text),
  /** print text to stdout */
  println: (...parts: string[]): void => {
    process.stdout.write(parts.join(' ') + '\n');
  },
  /** print empty line */
  empty: (): void => {
    process.stdout.write('\n');
  },
  Colors,
  TextAttributes,
};

// ─── Box rendering (using ANSI borders) ──────────────────────────────────────
function renderBox(
  content: string,
  borderColor: string = '36',
  title?: string,
): string {
  const lines = content.split('\n');
  const maxLen = Math.max(...lines.map((l) => stripAnsi(l).length), title ? stripAnsi(title).length + 4 : 0);
  const width = maxLen + 4;

  const top = title
    ? `\x1b[${borderColor}m╭─ ${title} ${'─'.repeat(Math.max(0, width - stripAnsi(title).length - 5))}╮\x1b[0m`
    : `\x1b[${borderColor}m╭${'─'.repeat(width)}╮\x1b[0m`;
  const bottom = `\x1b[${borderColor}m╰${'─'.repeat(width)}╯\x1b[0m`;
  const rows = lines.map((l) => {
    const pad = width - 2 - stripAnsi(l).length;
    return `\x1b[${borderColor}m│\x1b[0m  ${l}${' '.repeat(Math.max(0, pad))}  \x1b[${borderColor}m│\x1b[0m`;
  });

  return ['\n', top, ...rows, bottom, ''].join('\n');
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export const createBox = (content: string, opts?: { borderColor?: string; title?: string }): string =>
  renderBox(content, opts?.borderColor === 'green' ? '32' : opts?.borderColor === 'red' ? '31' : opts?.borderColor === 'yellow' ? '33' : opts?.borderColor === 'blue' ? '34' : '36', opts?.title);

export const createSuccessBox = (content: string): string => renderBox(content, '32');
export const createErrorBox = (content: string): string => renderBox(content, '31');
export const createInfoBox = (content: string): string => renderBox(content, '34');

// ─── Welcome banner ───────────────────────────────────────────────────────────
export const showWelcomeBanner = (): void => {
  const banner = [
    '',
    ansi('  ███╗   ███╗ █████╗  ██████╗ ██╗ ██████╗    ██╗███╗   ███╗', '1;38;2;250;178;131'),
    ansi('  ████╗ ████║██╔══██╗██╔════╝ ██║██╔════╝    ██║████╗ ████║', '1;38;2;250;178;131'),
    ansi('  ██╔████╔██║███████║██║  ███╗██║██║         ██║██╔████╔██║', '38;2;250;178;131'),
    ansi('  ██║╚██╔╝██║██╔══██║██║   ██║██║██║         ██║██║╚██╔╝██║', '38;2;250;178;131'),
    ansi('  ██║ ╚═╝ ██║██║  ██║╚██████╔╝██║╚██████╗    ██║██║ ╚═╝ ██║', '1;38;2;245;167;66'),
    ansi('  ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝ ╚═════╝    ╚═╝╚═╝     ╚═╝', '1;38;2;245;167;66'),
    '',
    ansi('  AI Agent Era Instant Messaging CLI', '1;38;2;250;178;131'),
    ansi('  ' + '━'.repeat(58), '38;2;128;128;128'),
    '',
  ].join('\n');
  process.stdout.write(banner);
};

// ─── Divider ──────────────────────────────────────────────────────────────────
export const divider = (): void => {
  process.stdout.write(ansi('─'.repeat(60), '2') + '\n');
};

// ─── Section header ───────────────────────────────────────────────────────────
export const sectionHeader = (title: string): void => {
  process.stdout.write('\n' + ansi(` ${title} `, '1;30;46') + '\n');
  divider();
};

// ─── Tables ───────────────────────────────────────────────────────────────────
export const createConfigTable = (config: {
  apiUrl: string;
  token?: string;
  agentToken?: string;
  language?: string;
}): string => {
  const table = new Table({
    head: [t('configSetting'), t('configValue')],
    style: { head: ['cyan'] },
    colWidths: [20, 40],
  });

  table.push(
    [t('configApiUrl'), ansi(config.apiUrl, '34')],
    [t('configToken'), config.token ? ansi('***', '32') : ansi('not set', '2')],
    [t('configAgentToken'), config.agentToken ? ansi('***', '32') : ansi('not set', '2')],
    [t('configLanguage'), config.language ?? 'en'],
  );

  return table.toString();
};

export const createAgentTable = (
  agents: Array<{
    id: string;
    name: string;
    full_name: string;
    visibility: string;
  }>,
): string => {
  if (agents.length === 0) {
    return ansi(t('noAgents'), '2');
  }

  const table = new Table({
    head: ['ID', t('agentName'), t('agentFullName'), t('agentVisibility')],
    style: { head: ['cyan'] },
    colWidths: [36, 15, 25, 12],
  });

  agents.forEach((agent) => {
    const visCode =
      { PUBLIC: '32', SEMI_PUBLIC: '33', FRIENDS_ONLY: '34', PRIVATE: '31' }[agent.visibility] ?? '37';

    table.push([
      ansi(agent.id.slice(0, 8) + '...', '2'),
      agent.name,
      agent.full_name,
      ansi(agent.visibility, visCode),
    ]);
  });

  return table.toString();
};

export const createFriendTable = (
  friends: Array<{
    id: string;
    friend_full_name: string;
    friend_name: string;
  }>,
): string => {
  if (friends.length === 0) {
    return ansi(t('noFriends'), '2');
  }

  const table = new Table({
    head: ['ID', t('friend'), t('friendName')],
    style: { head: ['green'] },
    colWidths: [36, 25, 15],
  });

  friends.forEach((friend) => {
    table.push([ansi(friend.id.slice(0, 8) + '...', '2'), ansi(friend.friend_full_name, '36'), friend.friend_name]);
  });

  return table.toString();
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
// opentui-spinner exports SpinnerRenderable class only; for CLI usage we
// keep a simple ora-compatible shim using process.stdout + interval.
export function spinner(text: string): () => void {
  let i = 0;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  process.stdout.write('\x1b[?25l'); // hide cursor
  process.stdout.write(`${frames[0]} ${text}`);
  const id = setInterval(() => {
    i = (i + 1) % frames.length;
    process.stdout.write(`\r${frames[i]} ${text}`);
  }, 80);
  return () => {
    clearInterval(id);
    process.stdout.write('\r\x1b[K\x1b[?25h'); // clear line + show cursor
  };
}

// SpinnerRenderable export for TUI contexts (used inside @opentui/solid renders)
export type { SpinnerRenderable };
