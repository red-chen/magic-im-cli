// ─── ANSI helper ────────────────────────────────────────────────────────────
function ansi(text: string, code: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

// ─── Text styles ────────────────────────────────────────────────────────────
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

// ─── Output functions ───────────────────────────────────────────────────────
export function println(...parts: string[]): void {
  process.stdout.write(parts.join(' ') + '\n');
}

export function printError(msg: string): void {
  process.stderr.write(styles.error(msg) + '\n');
}

export function printSuccess(msg: string): void {
  println(styles.success(msg));
}

export function printInfo(msg: string): void {
  println(styles.info(msg));
}

export function printWarning(msg: string): void {
  println(styles.warning(msg));
}

// ─── Strip ANSI codes ───────────────────────────────────────────────────────
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// ─── Box rendering ──────────────────────────────────────────────────────────
function renderBox(content: string, borderColor: string = '36', title?: string): string {
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

export function createBox(content: string, opts?: { borderColor?: string; title?: string }): string {
  const colorCode =
    opts?.borderColor === 'green'
      ? '32'
      : opts?.borderColor === 'red'
        ? '31'
        : opts?.borderColor === 'yellow'
          ? '33'
          : opts?.borderColor === 'blue'
            ? '34'
            : '36';
  return renderBox(content, colorCode, opts?.title);
}

export function createSuccessBox(content: string): string {
  return renderBox(content, '32');
}

export function createErrorBox(content: string): string {
  return renderBox(content, '31');
}

export function createInfoBox(content: string): string {
  return renderBox(content, '34');
}

// ─── Divider ────────────────────────────────────────────────────────────────
export function divider(): void {
  println(ansi('─'.repeat(60), '2'));
}

// ─── Section header ─────────────────────────────────────────────────────────
export function sectionHeader(title: string): void {
  println('\n' + ansi(` ${title} `, '1;30;46'));
  divider();
}

// ─── Welcome banner ─────────────────────────────────────────────────────────
export function showWelcomeBanner(): void {
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
}
