import { render, useKeyboard, useTerminalDimensions } from '@opentui/solid';
import { createSignal, For, Show, onMount, createMemo } from 'solid-js';
import type { KeyEvent, TextareaRenderable } from '@opentui/core';
import { styles } from './ui.js';

// ─── Theme definitions (opencode) ─────────────────────────────────────────────
// Based on opencode/packages/ui/src/theme/themes/opencode.json
const themes = {
  // Dark theme (default)
  dark: {
    background:        '#0a0a0a',
    backgroundPanel:   '#111111',
    backgroundElement: '#1a1a1a',
    backgroundWeak:    '#141414',
    text:              '#eeeeee',
    textStrong:        '#ffffff',
    textWeak:          '#808080',
    textMuted:         '#636e72',
    border:            '#2a2a2a',
    borderWeak:        '#1f1f1f',
    borderActive:      '#4a4a4a',
    borderInteractive: '#56b6c2',
    primary:           '#fab283',
    accent:            '#9d7cd8',
    success:           '#7fd88f',
    warning:           '#f5a742',
    error:             '#e06c75',
    info:              '#56b6c2',
    interactive:       '#56b6c2',
    interactiveHover:  '#6bc9d5',
  },
  // Light theme
  light: {
    background:        '#ffffff',
    backgroundPanel:   '#f8f8f8',
    backgroundElement: '#f0f0f0',
    backgroundWeak:    '#f5f5f5',
    text:              '#1a1a1a',
    textStrong:        '#000000',
    textWeak:          '#666666',
    textMuted:         '#888888',
    border:            '#e0e0e0',
    borderWeak:        '#f0f0f0',
    borderActive:      '#c0c0c0',
    borderInteractive: '#318795',
    primary:           '#3b7dd8',
    accent:            '#d68c27',
    success:           '#3d9a57',
    warning:           '#d68c27',
    error:             '#d1383d',
    info:              '#318795',
    interactive:       '#3b7dd8',
    interactiveHover:  '#4a8ce8',
  },
};

// Detect system color scheme preference
function getSystemTheme(): 'light' | 'dark' {
  if (process.env.MAGIC_IM_THEME === 'light') return 'light';
  if (process.env.MAGIC_IM_THEME === 'dark') return 'dark';
  
  const colorFgBg = process.env.COLORFGBG;
  if (colorFgBg) {
    const bg = parseInt(colorFgBg.split(';')[1] ?? '0', 10);
    if (bg >= 7 && bg <= 15) return 'light';
  }
  
  return 'dark';
}

// Theme type
type Theme = typeof themes.dark;

// ─── Available commands ───────────────────────────────────────────────────────
const AVAILABLE_COMMANDS = [
  { command: '/config get',            description: 'Get a config value' },
  { command: '/config set',            description: 'Set a config value' },
  { command: '/config list',           description: 'List all config values' },
  { command: '/config language',       description: 'Change CLI language' },
  { command: '/auth sign-up',          description: 'Create a new account' },
  { command: '/auth sign-in',          description: 'Sign in to your account' },
  { command: '/auth sign-out',         description: 'Sign out from your account' },
  { command: '/auth agent-token',      description: 'Generate agent token' },
  { command: '/auth refresh',          description: 'Refresh authentication token' },
  { command: '/auth status',           description: 'Check authentication status' },
  { command: '/agent create',          description: 'Create a new AI agent' },
  { command: '/agent list',            description: 'List all your agents' },
  { command: '/agent get',             description: 'Get agent details' },
  { command: '/agent update',          description: 'Update an agent' },
  { command: '/agent delete',          description: 'Delete an agent' },
  { command: '/friend add',            description: 'Send a friend request' },
  { command: '/friend list',           description: 'List all friends' },
  { command: '/friend requests',       description: 'View pending friend requests' },
  { command: '/friend accept',         description: 'Accept a friend request' },
  { command: '/friend reject',         description: 'Reject a friend request' },
  { command: '/friend remove',         description: 'Remove a friend' },
  { command: '/search agents',         description: 'Search for agents' },
  { command: '/message send',          description: 'Send a message' },
  { command: '/message poll',          description: 'Poll for new messages' },
  { command: '/conversation list',     description: 'List conversations' },
  { command: '/conversation messages', description: 'Get messages in a conversation' },
  { command: '/chat',                  description: 'Start an interactive chat session' },
  { command: '/theme',                 description: 'Toggle light/dark theme' },
  { command: '/help',                  description: 'Show available commands' },
  { command: '/clear',                 description: 'Clear the screen' },
  { command: '/exit',                  description: 'Exit interactive mode' },
];

// ─── Execute a slash command ──────────────────────────────────────────────────
async function executeSlashCommand(input: string): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed) return true;
  if (['/exit', '/quit', '/q'].includes(trimmed)) return false;

  if (['/help', '/h'].includes(trimmed)) {
    const lines: string[] = ['', styles.bold('Available Commands:'), ''];
    AVAILABLE_COMMANDS.forEach((cmd) => {
      lines.push(`  ${styles.code(cmd.command.padEnd(30))} ${styles.dim(cmd.description)}`);
    });
    lines.push('');
    return { lines, continue: true } as unknown as boolean;
  }

  if (['/clear', '/cls'].includes(trimmed)) {
    return { clear: true, continue: true } as unknown as boolean;
  }

  const cmdStr = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const args = cmdStr.split(/\s+/);

  const outputLines: string[] = [];
  const origWrite = process.stdout.write.bind(process.stdout);
  const origErrWrite = process.stderr.write.bind(process.stderr);

  const captured: string[] = [];
  (process.stdout as NodeJS.WriteStream).write = (chunk: unknown) => {
    const s = String(chunk);
    s.split('\n').forEach((l) => { if (l !== '') captured.push(l); });
    return true;
  };
  (process.stderr as NodeJS.WriteStream).write = (chunk: unknown) => {
    const s = String(chunk);
    s.split('\n').forEach((l) => { if (l !== '') captured.push(styles.error(l)); });
    return true;
  };

  try {
    const { default: yargsLib } = await import('yargs');
    const { hideBin } = await import('yargs/helpers');
    const configMod   = await import('../commands/config.js');
    const authMod     = await import('../commands/auth.js');
    const agentMod    = await import('../commands/agent.js');
    const friendMod   = await import('../commands/friend.js');
    const searchMod   = await import('../commands/search.js');
    const messageMod  = await import('../commands/message.js');
    const chatMod     = await import('../commands/chat.js');

    const originalArgv = process.argv;
    process.argv = ['node', 'magic-im', ...args];

    await yargsLib(hideBin(process.argv))
      .scriptName('magic-im')
      .command(configMod.default)
      .command(authMod.default)
      .command(agentMod.default)
      .command(friendMod.default)
      .command(searchMod.default)
      .command(messageMod.messageCommands)
      .command(messageMod.conversationCommands)
      .command(chatMod.default)
      .exitProcess(false)
      .fail((_msg: string, err: Error) => {
        if (err) captured.push(styles.error(err.message));
        else if (_msg) captured.push(styles.error(_msg));
      })
      .parseAsync();

    process.argv = originalArgv;
  } catch (error) {
    captured.push(styles.error(error instanceof Error ? error.message : 'Command failed'));
  } finally {
    process.stdout.write = origWrite as typeof process.stdout.write;
    process.stderr.write = origErrWrite as typeof process.stderr.write;
  }

  void outputLines;
  return { lines: captured, continue: true } as unknown as boolean;
}

// ─── Message entry ────────────────────────────────────────────────────────────
interface OutputEntry {
  type: 'user' | 'output' | 'separator';
  text: string;
}

// ─── Sidebar panel ────────────────────────────────────────────────────────────
function Sidebar(props: { commandCount: () => number; theme: Theme; width: number }) {
  const t = () => props.theme;
  return (
    <box
      backgroundColor={t().backgroundPanel}
      width={props.width}
      height="100%"
      paddingTop={2}
      paddingBottom={1}
      paddingLeft={3}
      paddingRight={3}
    >
      <scrollbox flexGrow={1}>
        <box flexShrink={0} gap={2} paddingRight={1}>
          {/* Session title */}
          <box paddingRight={1} marginBottom={1}>
            <text fg={t().primary}>
              <b>◆ Magic IM</b>
            </text>
          </box>

          {/* Context info */}
          <box gap={1} marginBottom={2}>
            <text fg={t().textStrong}>
              <b>Commands</b>
            </text>
            <text fg={t().textWeak}>{props.commandCount()} available</text>
            <text fg={t().textMuted}>Tab to autocomplete</text>
          </box>

          {/* LSP-style status */}
          <box gap={1}>
            <text fg={t().textStrong}><b>Server</b></text>
            <text fg={t().textWeak}>magic-im v1.0.0</text>
            <text fg={t().textMuted}>http://localhost:3000</text>
          </box>
        </box>
      </scrollbox>

      {/* Bottom: Getting started card */}
      <box flexShrink={0} gap={2} paddingTop={2}>
        <box
          backgroundColor={t().backgroundElement}
          paddingTop={2}
          paddingBottom={2}
          paddingLeft={2}
          paddingRight={2}
          flexDirection="row"
          gap={1}
          border={['left']}
          borderColor={t().primary}
        >
          <text flexShrink={0} fg={t().primary}>◆</text>
          <box flexGrow={1} gap={1}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={t().textStrong}><b>Getting started</b></text>
            </box>
            <text fg={t().textWeak}>Use /auth sign-in to authenticate.</text>
            <text fg={t().textMuted}>
              Then /agent list or /chat to get started.
            </text>
            <box flexDirection="row" gap={1} justifyContent="space-between" marginTop={1}>
              <text fg={t().interactive}>Sign in</text>
              <text fg={t().textMuted}>/auth sign-in</text>
            </box>
          </box>
        </box>

        {/* Version line */}
        <text fg={t().textWeak}>
          <span style={{ fg: t().success }}>●</span> <b>Magic</b>
          <span style={{ fg: t().text }}>
            <b>IM</b>
          </span>{' '}
          <span>1.0.0</span>
        </text>
      </box>
    </box>
  );
}

// ─── Keybind hints component (bottom right) ───────────────────────────────────
function KeybindHints(props: { theme: Theme }) {
  const t = () => props.theme;
  return (
    <box
      flexDirection="row"
      justifyContent="flex-end"
      flexShrink={0}
      paddingLeft={3}
      paddingRight={3}
      paddingTop={0}
      paddingBottom={1}
      backgroundColor={t().background}
    >
      <text fg={t().textMuted}>
        <span style={{ fg: t().textStrong }}>ctrl+t</span> variants{'  '}
        <span style={{ fg: t().textStrong }}>tab</span> agents{'  '}
        <span style={{ fg: t().textStrong }}>ctrl+p</span> commands
      </text>
    </box>
  );
}

// ─── InteractiveShell TUI component ──────────────────────────────────────────
function InteractiveShell() {
  // Theme state
  const [themeMode, setThemeMode] = createSignal<'light' | 'dark'>(getSystemTheme());
  const theme = createMemo(() => themes[themeMode()]);

  // Toggle theme handler
  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [input, setInput] = createSignal('');
  const [suggestions, setSuggestions] = createSignal<typeof AVAILABLE_COMMANDS>([]);
  const [history, setHistory] = createSignal<string[]>([]);
  const [historyIdx, setHistoryIdx] = createSignal(-1);
  const [selectedSuggestion, setSelectedSuggestion] = createSignal(0);
  const [entries, setEntries] = createSignal<OutputEntry[]>([
    { type: 'output', text: styles.dim('Type /help to see all commands, /exit to quit.') },
    { type: 'separator', text: '' },
  ]);
  const [cmdPaletteOpen, setCmdPaletteOpen] = createSignal(false);
  const [cmdSearch, setCmdSearch] = createSignal('');

  const dims = useTerminalDimensions();
  const wide = () => dims().width > 120;

  const sidebarWidth = 52;
  const mainWidth = () => dims().width - (wide() ? sidebarWidth : 0);

  const filteredCmds = () => {
    const q = cmdSearch().toLowerCase();
    if (!q) return AVAILABLE_COMMANDS.slice(0, 10);
    return AVAILABLE_COMMANDS.filter(
      (c) => c.command.includes(q) || c.description.toLowerCase().includes(q),
    ).slice(0, 10);
  };

  const updateSuggestions = (val: string) => {
    const q = val.toLowerCase();
    if (!q || q === '/') {
      setSuggestions(AVAILABLE_COMMANDS.slice(0, 8));
    } else {
      setSuggestions(
        AVAILABLE_COMMANDS.filter(
          (c) => c.command.includes(q) || c.description.toLowerCase().includes(q),
        ).slice(0, 8),
      );
    }
    setSelectedSuggestion(0);
  };

  let textarea: TextareaRenderable | undefined;
  let cmdSearchTextarea: TextareaRenderable | undefined;

  const addEntries = (newEntries: OutputEntry[]) => {
    setEntries((prev) => [...prev.slice(-500), ...newEntries]);
  };

  const submitCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addEntries([{ type: 'user', text: trimmed }]);
    setHistory((h) => [trimmed, ...h.slice(0, 99)]);
    setHistoryIdx(-1);
    textarea?.setText('');
    setInput('');
    setSuggestions([]);

    if (['/exit', '/quit', '/q'].includes(trimmed)) {
      addEntries([{ type: 'output', text: styles.success('Goodbye!') }]);
      setTimeout(() => process.exit(0), 100);
      return;
    }

    if (['/clear', '/cls'].includes(trimmed)) {
      setEntries([{ type: 'output', text: styles.dim('Screen cleared. Type /help to see all commands.') }]);
      return;
    }

    if (['/theme'].includes(trimmed)) {
      toggleTheme();
      addEntries([{ type: 'output', text: styles.success(`Theme switched to ${themeMode() === 'dark' ? 'light' : 'dark'} mode`) }]);
      return;
    }

    if (['/help', '/h'].includes(trimmed)) {
      const lines: OutputEntry[] = [
        { type: 'output', text: styles.bold('Available Commands:') },
        { type: 'separator', text: '' },
        ...AVAILABLE_COMMANDS.map((cmd) => ({
          type: 'output' as const,
          text: `  ${styles.code(cmd.command.padEnd(30))} ${styles.dim(cmd.description)}`,
        })),
        { type: 'separator', text: '' },
      ];
      addEntries(lines);
      return;
    }

    const result = await executeSlashCommand(trimmed) as unknown as
      | boolean
      | { lines: string[]; continue: boolean; clear?: boolean };

    if (typeof result === 'boolean') {
      if (!result) {
        addEntries([{ type: 'output', text: styles.success('Goodbye!') }]);
        setTimeout(() => process.exit(0), 100);
      }
      return;
    }

    const outputEntries: OutputEntry[] = result.lines.map((l) => ({
      type: 'output' as const,
      text: l,
    }));
    if (outputEntries.length > 0) {
      addEntries([...outputEntries, { type: 'separator', text: '' }]);
    }
    if (!result.continue) {
      addEntries([{ type: 'output', text: styles.success('Goodbye!') }]);
      setTimeout(() => process.exit(0), 100);
    }
  };

  useKeyboard((evt: KeyEvent) => {
    // Command palette
    if (evt.ctrl && evt.name === 'p') {
      evt.preventDefault();
      setCmdPaletteOpen((v) => !v);
      setCmdSearch('');
      return;
    }

    if (cmdPaletteOpen()) {
      if (evt.name === 'escape') {
        setCmdPaletteOpen(false);
        return;
      }
      return;
    }

    if (evt.name === 'tab') {
      evt.preventDefault();
      const sugs = suggestions();
      if (sugs.length > 0) {
        const dir = evt.shift ? -1 : 1;
        const next = (selectedSuggestion() + dir + sugs.length) % sugs.length;
        setSelectedSuggestion(next);
        const selected = sugs[next];
        if (selected) {
          textarea?.setText(selected.command);
          setInput(selected.command);
        }
      }
      return;
    }

    if (evt.name === 'up') {
      evt.preventDefault();
      const h = history();
      const next = Math.min(historyIdx() + 1, h.length - 1);
      setHistoryIdx(next);
      if (next >= 0 && h[next]) {
        textarea?.setText(h[next]);
        setInput(h[next]);
      }
      return;
    }

    if (evt.name === 'down') {
      evt.preventDefault();
      const next = Math.max(historyIdx() - 1, -1);
      setHistoryIdx(next);
      const val = next >= 0 ? (history()[next] ?? '') : '';
      textarea?.setText(val);
      setInput(val);
      return;
    }

    if (evt.ctrl && evt.name === 'c') {
      addEntries([{ type: 'output', text: styles.success('Goodbye!') }]);
      setTimeout(() => process.exit(0), 100);
    }
  });

  onMount(() => {
    textarea?.focus();
  });

  const t = theme;

  return (
    <box
      width={dims().width}
      height={dims().height}
      backgroundColor={t().background}
      flexDirection="row"
    >
      {/* ── Left side: Main content + Input + Hints ── */}
      <box
        flexGrow={1}
        flexDirection="column"
        height="100%"
      >
        {/* Messages area */}
        <scrollbox
          flexGrow={1}
          paddingLeft={3}
          paddingRight={3}
          paddingTop={2}
          paddingBottom={0}
        >
          <box flexShrink={0} gap={1}>
            <For each={entries()}>
              {(entry) => {
                if (entry.type === 'separator') {
                  return <box height={1} />;
                }
                if (entry.type === 'user') {
                  return (
                    <box
                      border={['left']}
                      borderColor={t().primary}
                      paddingLeft={2}
                      paddingTop={1}
                      paddingBottom={1}
                      marginTop={1}
                      marginBottom={1}
                      flexShrink={0}
                    >
                      <text fg={t().textStrong}>{entry.text}</text>
                    </box>
                  );
                }
                return (
                  <box paddingLeft={3} paddingTop={0} paddingBottom={0} flexShrink={0}>
                    <text fg={t().text}>{entry.text}</text>
                  </box>
                );
              }}
            </For>
          </box>
        </scrollbox>

        {/* Suggestions bar */}
        <Show when={suggestions().length > 0 && !cmdPaletteOpen()}>
          <box
            flexDirection="row"
            flexWrap="wrap"
            paddingLeft={3}
            paddingTop={1}
            paddingBottom={1}
            gap={1}
            flexShrink={0}
            backgroundColor={t().backgroundPanel}
          >
            <For each={suggestions().slice(0, 6)}>
              {(sug, i) => (
                <box
                  paddingLeft={1}
                  paddingRight={1}
                  paddingTop={0}
                  paddingBottom={0}
                  backgroundColor={i() === selectedSuggestion() ? t().backgroundElement : t().backgroundPanel}
                  onMouseUp={() => {
                    textarea?.setText(sug.command);
                    setInput(sug.command);
                    setSuggestions([]);
                  }}
                >
                  <text fg={i() === selectedSuggestion() ? t().primary : t().textWeak}>
                    {sug.command}
                  </text>
                  <text fg={t().textMuted}>{' '}{sug.description}</text>
                </box>
              )}
            </For>
          </box>
        </Show>

        {/* Input row with left border like opencode */}
        <box
          flexDirection="row"
          flexShrink={0}
          paddingLeft={0}
          paddingRight={0}
          backgroundColor={t().background}
        >
          {/* Left border line */}
          <box
            width={1}
            backgroundColor={t().primary}
          />
          {/* Input content */}
          <box
            flexGrow={1}
            flexDirection="row"
            paddingLeft={2}
            paddingRight={3}
            paddingTop={1}
            paddingBottom={1}
            gap={2}
          >
            <textarea
              ref={(val: TextareaRenderable) => { textarea = val; }}
              flexGrow={1}
              height={1}
              minHeight={1}
              maxHeight={1}
              placeholder="Type a /command or press Tab for suggestions..."
              textColor={t().text}
              focusedTextColor={t().textStrong}
              cursorColor={t().interactive}
              placeholderColor={t().textMuted}
              onContentChange={() => {
                const val = textarea?.plainText ?? '';
                setInput(val);
                updateSuggestions(val);
              }}
              onSubmit={() => {
                void submitCommand(textarea?.plainText ?? '');
              }}
              keyBindings={[{ name: 'return', action: 'submit' }]}
            />
          </box>
        </box>

        {/* Keybind hints at bottom right */}
        <KeybindHints theme={t()} />
      </box>

      {/* ── Right sidebar (only on wide terminals) ── */}
      <Show when={wide()}>
        <Sidebar commandCount={() => AVAILABLE_COMMANDS.length} theme={t()} width={sidebarWidth} />
      </Show>

      {/* ── Command palette overlay ── */}
      <Show when={cmdPaletteOpen()}>
        <box
          position="absolute"
          top={Math.floor(dims().height * 0.15)}
          left={Math.floor(dims().width * 0.1)}
          width={Math.floor(dims().width * 0.8)}
          backgroundColor={t().backgroundElement}
          border={['top', 'bottom', 'left', 'right']}
          borderColor={t().borderActive}
          paddingTop={2}
          paddingBottom={2}
          paddingLeft={3}
          paddingRight={3}
          gap={1}
        >
          <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <text fg={t().textStrong}><b>Commands</b></text>
            <text fg={t().textWeak}>esc to close</text>
          </box>
          <box
            flexDirection="row"
            border={['bottom']}
            borderColor={t().border}
            paddingBottom={1}
            marginBottom={1}
            gap={1}
          >
            <text fg={t().interactive}>{'›'}</text>
            <textarea
              ref={(val: TextareaRenderable) => { cmdSearchTextarea = val; }}
              flexGrow={1}
              height={1}
              minHeight={1}
              maxHeight={1}
              placeholder="Search commands..."
              textColor={t().text}
              focusedTextColor={t().textStrong}
              cursorColor={t().interactive}
              onContentChange={() => {
                setCmdSearch(cmdSearchTextarea?.plainText ?? '');
              }}
              onSubmit={() => {
                const cmd = filteredCmds()[0];
                if (cmd) {
                  textarea?.setText(cmd.command);
                  setInput(cmd.command);
                  updateSuggestions(cmd.command);
                }
                setCmdPaletteOpen(false);
              }}
              keyBindings={[{ name: 'return', action: 'submit' }]}
            />
          </box>
          <For each={filteredCmds()}>
            {(cmd, i) => (
              <box
                flexDirection="row"
                justifyContent="space-between"
                paddingLeft={1}
                paddingRight={1}
                paddingTop={0}
                paddingBottom={0}
                backgroundColor={i() === 0 ? t().backgroundPanel : undefined}
                onMouseUp={() => {
                  textarea?.setText(cmd.command);
                  setInput(cmd.command);
                  updateSuggestions(cmd.command);
                  setCmdPaletteOpen(false);
                }}
              >
                <text fg={i() === 0 ? t().primary : t().text}>{cmd.command}</text>
                <text fg={t().textWeak}>{cmd.description}</text>
              </box>
            )}
          </For>
        </box>
      </Show>
    </box>
  );
}

// ─── Public entry point ───────────────────────────────────────────────────────
export async function startInteractiveMode(): Promise<void> {
  return render(
    () => <InteractiveShell />,
    {
      stdout: process.stdout,
      stdin: process.stdin,
    },
  );
}
