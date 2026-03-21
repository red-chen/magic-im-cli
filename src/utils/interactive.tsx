import { render, useKeyboard, useTerminalDimensions } from '@opentui/solid';
import { createSignal, For, Show, onMount } from 'solid-js';
import type { KeyEvent, TextareaRenderable } from '@opentui/core';
import { styles } from './ui.js';

// ─── Theme (opencode dark) ────────────────────────────────────────────────────
const theme = {
  background:        '#0a0a0a',
  backgroundPanel:   '#111111',
  backgroundElement: '#1a1a1a',
  text:              '#eeeeee',
  textMuted:         '#636e72',
  border:            '#2d3436',
  borderActive:      '#4a5568',
  primary:           '#74b9ff',
  success:           '#55efc4',
  warning:           '#fdcb6e',
  error:             '#ff7675',
  info:              '#74b9ff',
};

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

  // Capture output
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
function Sidebar(props: { commandCount: () => number }) {
  return (
    <box
      backgroundColor={theme.backgroundPanel}
      width={42}
      height="100%"
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
    >
      <scrollbox flexGrow={1}>
        <box flexShrink={0} gap={1} paddingRight={1}>
          {/* Session title */}
          <box paddingRight={1}>
            <text fg={theme.text}>
              <b>Magic IM</b>
            </text>
          </box>

          {/* Context info */}
          <box>
            <text fg={theme.text}>
              <b>Commands</b>
            </text>
            <text fg={theme.textMuted}>{props.commandCount()} available</text>
            <text fg={theme.textMuted}>Tab to autocomplete</text>
          </box>

          {/* LSP-style status */}
          <box>
            <text fg={theme.text}><b>Server</b></text>
            <text fg={theme.textMuted}>magic-im v1.0.0</text>
            <text fg={theme.textMuted}>http://localhost:3000</text>
          </box>
        </box>
      </scrollbox>

      {/* Bottom: Getting started card */}
      <box flexShrink={0} gap={1} paddingTop={1}>
        <box
          backgroundColor={theme.backgroundElement}
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          paddingRight={2}
          flexDirection="row"
          gap={1}
        >
          <text flexShrink={0} fg={theme.text}>◆</text>
          <box flexGrow={1} gap={1}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.text}><b>Getting started</b></text>
            </box>
            <text fg={theme.textMuted}>Use /auth sign-in to authenticate.</text>
            <text fg={theme.textMuted}>
              Then /agent list or /chat to get started.
            </text>
            <box flexDirection="row" gap={1} justifyContent="space-between">
              <text fg={theme.text}>Sign in</text>
              <text fg={theme.textMuted}>/auth sign-in</text>
            </box>
          </box>
        </box>

        {/* Version line */}
        <text fg={theme.textMuted}>
          <span style={{ fg: theme.success }}>•</span> <b>Magic</b>
          <span style={{ fg: theme.text }}>
            <b>IM</b>
          </span>{' '}
          <span>1.0.0</span>
        </text>
      </box>
    </box>
  );
}

// ─── Footer keybind bar ───────────────────────────────────────────────────────
function FooterBar() {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      flexShrink={0}
      paddingLeft={2}
      paddingRight={2}
    >
      <text fg={theme.textMuted}>magic-im interactive</text>
      <box flexDirection="row" gap={2}>
        <text fg={theme.textMuted}>
          <span style={{ fg: theme.text }}>↑↓</span> history{'  '}
          <span style={{ fg: theme.text }}>tab</span> complete{'  '}
          <span style={{ fg: theme.text }}>ctrl+p</span> commands{'  '}
          <span style={{ fg: theme.text }}>ctrl+c</span> exit
        </text>
      </box>
    </box>
  );
}

// ─── InteractiveShell TUI component ──────────────────────────────────────────
function InteractiveShell() {
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

  const mainWidth = () => dims().width - (wide() ? 42 : 0);
  const scrollHeight = () => Math.max(dims().height - 5, 3);

  return (
    <box
      width={dims().width}
      height={dims().height}
      backgroundColor={theme.background}
      flexDirection="column"
    >
      {/* ── Main row: content + sidebar ── */}
      <box flexGrow={1} flexDirection="row">
        {/* ── Main content column ── */}
        <box
          flexGrow={1}
          flexDirection="column"
          paddingLeft={2}
          paddingRight={2}
          paddingTop={1}
          paddingBottom={0}
          gap={1}
        >
          {/* Scrollable message area */}
          <scrollbox
            flexGrow={1}
            height={scrollHeight()}
          >
            <box flexShrink={0} gap={0}>
              <For each={entries()}>
                {(entry) => {
                  if (entry.type === 'separator') {
                    return <text fg={theme.textMuted}>{' '}</text>;
                  }
                  if (entry.type === 'user') {
                    return (
                      <box
                        border={['left']}
                        borderColor={theme.primary}
                        paddingLeft={2}
                        paddingTop={1}
                        paddingBottom={1}
                        marginTop={1}
                        flexShrink={0}
                      >
                        <text fg={theme.text}>{entry.text}</text>
                      </box>
                    );
                  }
                  return (
                    <box paddingLeft={3} marginTop={0} flexShrink={0}>
                      <text fg={theme.text}>{entry.text}</text>
                    </box>
                  );
                }}
              </For>
            </box>
          </scrollbox>

          {/* Suggestions bar (above input) */}
          <Show when={suggestions().length > 0 && !cmdPaletteOpen()}>
            <box
              flexDirection="row"
              flexWrap="wrap"
              paddingLeft={1}
              gap={1}
              flexShrink={0}
            >
              <For each={suggestions().slice(0, 6)}>
                {(sug, i) => (
                  <box
                    paddingLeft={1}
                    paddingRight={1}
                    backgroundColor={i() === selectedSuggestion() ? theme.backgroundElement : undefined}
                    onMouseUp={() => {
                      textarea?.setText(sug.command);
                      setInput(sug.command);
                      setSuggestions([]);
                    }}
                  >
                    <text fg={i() === selectedSuggestion() ? theme.primary : theme.textMuted}>
                      {sug.command}
                    </text>
                    <text fg={theme.textMuted}>{' '}{sug.description}</text>
                  </box>
                )}
              </For>
            </box>
          </Show>

          {/* Input row */}
          <box
            flexDirection="row"
            flexShrink={0}
            paddingLeft={1}
            paddingBottom={1}
            paddingTop={1}
            gap={1}
            border={['top']}
            borderColor={theme.border}
          >
            <text fg={theme.primary}>{'▋'}</text>
            <textarea
              ref={(val: TextareaRenderable) => { textarea = val; }}
              flexGrow={1}
              height={1}
              minHeight={1}
              maxHeight={1}
              placeholder="Type a /command or press Tab for suggestions..."
              textColor={theme.text}
              focusedTextColor={theme.text}
              cursorColor={theme.primary}
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

        {/* ── Right sidebar (only on wide terminals) ── */}
        <Show when={wide()}>
          <Sidebar commandCount={() => AVAILABLE_COMMANDS.length} />
        </Show>
      </box>

      {/* ── Command palette overlay ── */}
      <Show when={cmdPaletteOpen()}>
        <box
          position="absolute"
          top={Math.floor(dims().height * 0.15)}
          left={Math.floor(dims().width * 0.1)}
          width={Math.floor(dims().width * 0.8)}
          backgroundColor={theme.backgroundElement}
          border={['top', 'bottom', 'left', 'right']}
          borderColor={theme.borderActive}
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          paddingRight={2}
          gap={1}
        >
          <box flexDirection="row" justifyContent="space-between">
            <text fg={theme.text}><b>Commands</b></text>
            <text fg={theme.textMuted}>esc to close</text>
          </box>
          <box
            flexDirection="row"
            border={['bottom']}
            borderColor={theme.border}
            paddingBottom={1}
            gap={1}
          >
            <text fg={theme.primary}>{'›'}</text>
            <textarea
              ref={(val: TextareaRenderable) => { cmdSearchTextarea = val; }}
              flexGrow={1}
              height={1}
              minHeight={1}
              maxHeight={1}
              placeholder="Search commands..."
              textColor={theme.text}
              focusedTextColor={theme.text}
              cursorColor={theme.primary}
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
                backgroundColor={i() === 0 ? theme.backgroundPanel : undefined}
                onMouseUp={() => {
                  textarea?.setText(cmd.command);
                  setInput(cmd.command);
                  updateSuggestions(cmd.command);
                  setCmdPaletteOpen(false);
                }}
              >
                <text fg={i() === 0 ? theme.primary : theme.text}>{cmd.command}</text>
                <text fg={theme.textMuted}>{cmd.description}</text>
              </box>
            )}
          </For>
        </box>
      </Show>

      {/* ── Footer keybind bar ── */}
      <FooterBar />
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
