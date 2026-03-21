import { render, useKeyboard, useTerminalDimensions, useRenderer } from '@opentui/solid';
import { createSignal, For, Show, onMount, onCleanup, createMemo, createResource } from 'solid-js';
import type { KeyEvent, TextareaRenderable } from '@opentui/core';
import { styles } from './ui.js';
import { getTheme, setTheme, saveSnapshot, getToken } from './config.js';
import { apiClient } from './api.js';
import type { User, Agent } from '../types/index.js';

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
function getInitialTheme(): 'light' | 'dark' {
  // Check saved config first
  const savedTheme = getTheme();
  if (savedTheme) return savedTheme;
  
  // Check environment override
  if (process.env.MAGIC_IM_THEME === 'light') return 'light';
  if (process.env.MAGIC_IM_THEME === 'dark') return 'dark';
  
  // Detect from terminal
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
  { command: '/auth sign-in',          description: 'Sign in to your account' },
  { command: '/search agents',         description: 'Search for agents' },
  { command: '/search users',          description: 'Search for users by nickname or email' },
  { command: '/theme',                 description: 'Toggle light/dark theme' },
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
  type: 'user' | 'output' | 'separator' | 'page-break' | 'loading';
  text: string;
  id?: string; // Used for loading entries to identify and remove them
}

// ─── Scroll ref for auto-scrolling ────────────────────────────────────────────
let scrollRef: { scrollTop: number; scrollHeight: number } | undefined;

// ─── Fetch user profile ───────────────────────────────────────────────────────
async function fetchUserProfile(): Promise<User | null> {
  try {
    const token = getToken();
    if (!token) return null;
    const response = await apiClient.get<{ user: User }>('/auth/me');
    return response.success ? response.data.user : null;
  } catch {
    return null;
  }
}

// ─── Fetch agent list ─────────────────────────────────────────────────────────
async function fetchAgentList(): Promise<Agent[]> {
  try {
    const token = getToken();
    if (!token) return [];
    const response = await apiClient.get<Agent[]>('/agents');
    return response.success ? response.data : [];
  } catch {
    return [];
  }
}

import { getVersionDisplay, isDevMode, getBuildTimeDisplay } from './version.js';

// ─── Loading Spinner component ─────────────────────────────────────────────────
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function LoadingSpinner(props: { text: string; theme: Theme }) {
  const [frameIndex, setFrameIndex] = createSignal(0);
  const t = () => props.theme;

  onMount(() => {
    const interval = setInterval(() => {
      setFrameIndex((i) => (i + 1) % SPINNER_FRAMES.length);
    }, 80);
    onCleanup(() => clearInterval(interval));
  });

  return (
    <box
      flexDirection="row"
      paddingLeft={3}
      paddingTop={1}
      paddingBottom={0}
      flexShrink={0}
      width="100%"
      gap={1}
    >
      <text fg={t().interactive}>{SPINNER_FRAMES[frameIndex()]}</text>
      <text fg={t().textWeak}>{props.text}</text>
    </box>
  );
}

// ─── Sidebar panel ────────────────────────────────────────────────────────────
function Sidebar(props: { commandCount: () => number; theme: Theme; width: number }) {
  const t = () => props.theme;
  const [user] = createResource(fetchUserProfile);
  const [agents] = createResource(fetchAgentList);
  const isAuthenticated = () => !!user() && !user.loading;

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

          {/* User Profile Section */}
          <Show when={isAuthenticated()} fallback={
            <box
              backgroundColor={t().backgroundElement}
              paddingTop={2}
              paddingBottom={2}
              paddingLeft={2}
              paddingRight={2}
              marginBottom={2}
              border={['left']}
              borderColor={t().textMuted}
            >
              <text fg={t().textMuted}>Not signed in</text>
              <text fg={t().textWeak}>Use /auth sign-in</text>
            </box>
          }>
            <box
              backgroundColor={t().backgroundElement}
              paddingTop={2}
              paddingBottom={2}
              paddingLeft={2}
              paddingRight={2}
              marginBottom={2}
              border={['left']}
              borderColor={t().primary}
            >
              <text fg={t().textStrong}><b>👤 {user()?.nickname}</b></text>
              <text fg={t().textWeak}>{user()?.email}</text>
            </box>
          </Show>

          {/* Agent List Section */}
          <Show when={isAuthenticated()}>
            <box marginBottom={1}>
              <text fg={t().textStrong}><b>🤖 My Agents</b></text>
            </box>
            <Show when={agents() && agents()!.length > 0} fallback={
              <box paddingLeft={1} marginBottom={2}>
                <text fg={t().textMuted}>No agents yet</text>
                <text fg={t().textWeak}>Use /agent create</text>
              </box>
            }>
              <box gap={1} marginBottom={2}>
                <For each={agents()}>
                  {(agent) => (
                    <box
                      flexDirection="row"
                      gap={1}
                      paddingLeft={1}
                      paddingTop={0}
                      paddingBottom={0}
                    >
                      <text fg={t().success}>●</text>
                      <text fg={t().text}>{agent.name}</text>
                    </box>
                  )}
                </For>
              </box>
            </Show>
          </Show>

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

      {/* Bottom: Getting started card (only show when not authenticated) */}
      <Show when={!isAuthenticated()}>
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
            <span>{getVersionDisplay()}</span>
          </text>
          <Show when={isDevMode}>
            <text fg={t().textMuted}>
              Build: {getBuildTimeDisplay() || 'dev mode'}
            </text>
          </Show>
        </box>
      </Show>

      {/* Version info at bottom (when authenticated) */}
      <Show when={isAuthenticated()}>
        <box flexShrink={0} paddingTop={2}>
          <text fg={t().textWeak}>
            <span style={{ fg: t().success }}>●</span> <b>Magic</b>
            <span style={{ fg: t().text }}><b>IM</b></span>{' '}
            <span>{getVersionDisplay()}</span>
          </text>
          <Show when={isDevMode}>
            <text fg={t().textMuted}>
              Build: {getBuildTimeDisplay() || 'dev mode'}
            </text>
          </Show>
        </box>
      </Show>
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
      paddingTop={1}
      paddingBottom={0}
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
function InteractiveShell(props: { initialSnapshot?: { 
  entries?: Array<{ type: 'user' | 'output' | 'separator'; text: string }>;
  history?: string[];
  theme?: 'light' | 'dark';
} | null }) {
  // Theme state - use snapshot theme if available
  const [themeMode, setThemeMode] = createSignal<'light' | 'dark'>(
    props.initialSnapshot?.theme || getInitialTheme()
  );
  const theme = createMemo(() => themes[themeMode()]);
  const renderer = useRenderer();

  // Toggle theme handler
  const toggleTheme = () => {
    const newMode = themeMode() === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
    setTheme(newMode); // Save to settings.json
  };
  
  // Generate session ID for this session
  const sessionId = createMemo(() => {
    // Use timestamp + random for unique ID
    return `ses_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  });

  // Save current state to snapshot
  const saveSessionState = () => {
    // Filter out loading entries (they are temporary and shouldn't be saved)
    const persistentEntries = entries()
      .filter((e): e is { type: 'user' | 'output' | 'separator' | 'page-break'; text: string } => 
        e.type !== 'loading'
      );
    const snapshot = {
      id: sessionId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: persistentEntries,
      history: history(),
      theme: themeMode(),
    };
    saveSnapshot(snapshot);
    return snapshot.id;
  };

  // Cleanup function for exit
  const cleanupAndExit = () => {
    // Save session state before exit
    const savedId = saveSessionState();
    // Reset terminal title
    renderer.setTerminalTitle('');
    // Destroy renderer (this handles alternate screen buffer cleanup)
    renderer.destroy();
    // Exit alternate screen buffer as fallback
    process.stdout.write('\x1b[?1049l');
    // Print session ID to stdout so user can resume later
    process.stdout.write(`\nSession saved: ${savedId}\n`);
    process.stdout.write(`Resume with: magic-im -s ${savedId}\n\n`);
    process.exit(0);
  };

  const [input, setInput] = createSignal('');
  const [suggestions, setSuggestions] = createSignal<typeof AVAILABLE_COMMANDS>([]);
  // Use snapshot history if available
  const [history, setHistory] = createSignal<string[]>(props.initialSnapshot?.history || []);
  const [historyIdx, setHistoryIdx] = createSignal(-1);
  const [selectedSuggestion, setSelectedSuggestion] = createSignal(0);
  // Track if we're navigating history to prevent clearing suggestions
  let isNavigatingHistory = false;
  // Track if a command is currently executing (prevents new command input)
  const [isExecuting, setIsExecuting] = createSignal(false);
  // Use snapshot entries if available, otherwise use default
  const [entries, setEntries] = createSignal<OutputEntry[]>(
    props.initialSnapshot?.entries && props.initialSnapshot.entries.length > 0
      ? props.initialSnapshot.entries
      : [
          { type: 'output', text: styles.dim('Type /help to see all commands, /exit to quit.') },
          { type: 'separator', text: '' },
        ]
  );
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
    // Don't show suggestions for empty input or just "/"
    if (!q) {
      setSuggestions([]);
      return;
    }
    if (q === '/') {
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
    // Auto-scroll to bottom after adding entries
    setTimeout(() => {
      if (scrollRef) {
        scrollRef.scrollTop = scrollRef.scrollHeight;
      }
    }, 0);
  };

  // Remove loading entry by id
  const removeLoadingEntry = (loadingId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== loadingId));
  };

  // Generate a loading message based on the command
  const getLoadingMessage = (cmd: string): string => {
    const cmdLower = cmd.toLowerCase();
    if (cmdLower.includes('search users')) return 'Searching users...';
    if (cmdLower.includes('search agents')) return 'Searching agents...';
    if (cmdLower.includes('auth')) return 'Authenticating...';
    if (cmdLower.includes('agent')) return 'Processing agent...';
    if (cmdLower.includes('friend')) return 'Processing friend request...';
    if (cmdLower.includes('message')) return 'Sending message...';
    if (cmdLower.includes('chat')) return 'Starting chat...';
    return 'Processing...';
  };

  const submitCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Prevent new command input while a command is executing
    if (isExecuting()) return;

    addEntries([{ type: 'user', text: trimmed }]);
    setHistory((h) => [trimmed, ...h.slice(0, 99)]);
    setHistoryIdx(-1);
    textarea?.setText('');
    setInput('');
    setSuggestions([]);

    if (['/exit', '/quit', '/q'].includes(trimmed)) {
      addEntries([{ type: 'output', text: styles.success('Goodbye!') }]);
      setTimeout(() => {
        cleanupAndExit();
      }, 100);
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

    // Set executing state to prevent new commands
    setIsExecuting(true);

    // Add loading entry before executing command
    const loadingId = `loading_${Date.now()}`;
    const loadingMessage = getLoadingMessage(trimmed);
    addEntries([{ type: 'loading', text: loadingMessage, id: loadingId }]);

    try {
      const result = await executeSlashCommand(trimmed) as unknown as
        | boolean
        | { lines: string[]; continue: boolean; clear?: boolean };

      // Remove loading entry after command completes
      removeLoadingEntry(loadingId);

      if (typeof result === 'boolean') {
        if (!result) {
          addEntries([{ type: 'output', text: styles.success('Goodbye!') }]);
          setTimeout(() => {
            cleanupAndExit();
          }, 100);
        }
        return;
      }

      // Filter out spinner lines and control sequences
      // Spinner frames are: ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏
      // Also filter lines containing \r (carriage return used by spinner for overwriting)
      // And filter ANSI control sequences like cursor hide/show, clear line
      const spinnerFramePattern = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/;
      const controlSeqPattern = /^\x1b\[\?25[lh]|\x1b\[K|\r/;
      const filteredLines = result.lines.filter((l) => {
        // Filter out spinner frames
        if (spinnerFramePattern.test(l)) return false;
        // Filter out control sequences (cursor hide/show, clear line)
        if (controlSeqPattern.test(l)) return false;
        // Filter out empty lines after stripping control chars
        const cleaned = l.replace(/\x1b\[[0-9;?]*[A-Za-z]|\r/g, '').trim();
        if (!cleaned) return false;
        return true;
      });
      const outputEntries: OutputEntry[] = filteredLines.map((l) => ({
        type: 'output' as const,
        text: l,
      }));
      if (outputEntries.length > 0) {
        addEntries(outputEntries);
      }
      if (!result.continue) {
        addEntries([{ type: 'output', text: styles.success('Goodbye!') }]);
        setTimeout(() => {
          cleanupAndExit();
        }, 100);
      }
    } finally {
      // Always reset executing state when command completes
      setIsExecuting(false);
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
          // Fill the command into input (user can add more arguments)
          textarea?.setText(selected.command);
          textarea?.gotoBufferEnd(); // Move cursor to end
          setInput(selected.command);
          setSuggestions([]); // Clear suggestions after selection
        }
      }
      return;
    }

    if (evt.name === 'up') {
      evt.preventDefault();
      // When suggestions are visible, navigate through suggestions
      const sugs = suggestions();
      if (sugs.length > 0) {
        const next = (selectedSuggestion() - 1 + sugs.length) % sugs.length;
        setSelectedSuggestion(next);
        return;
      }
      // Otherwise navigate command history
      const h = history();
      const next = Math.min(historyIdx() + 1, h.length - 1);
      setHistoryIdx(next);
      if (next >= 0 && h[next]) {
        isNavigatingHistory = true;
        textarea?.setText(h[next]);
        setInput(h[next]);
        isNavigatingHistory = false;
      }
      return;
    }

    if (evt.name === 'down') {
      evt.preventDefault();
      // When suggestions are visible, navigate through suggestions
      const sugs = suggestions();
      if (sugs.length > 0) {
        const next = (selectedSuggestion() + 1) % sugs.length;
        setSelectedSuggestion(next);
        return;
      }
      // Otherwise navigate command history
      const next = Math.max(historyIdx() - 1, -1);
      setHistoryIdx(next);
      const val = next >= 0 ? (history()[next] ?? '') : '';
      isNavigatingHistory = true;
      textarea?.setText(val);
      setInput(val);
      isNavigatingHistory = false;
      return;
    }

    if (evt.ctrl && evt.name === 'c') {
      addEntries([{ type: 'output', text: styles.success('Goodbye!') }]);
      setTimeout(() => {
        cleanupAndExit();
      }, 100);
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
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        gap={1}
      >
        {/* Messages area */}
        <scrollbox
          flexGrow={1}
          paddingTop={0}
          paddingBottom={0}
          ref={(ref) => { scrollRef = ref; }}
          scrollbarOptions={{ visible: false }}
        >
          <box flexShrink={0} gap={0} width="100%">
            <For each={entries()}>
              {(entry) => {
                if (entry.type === 'page-break') {
                  // Page break creates visual separation and fills space
                  return <box height={Math.max(0, dims().height - 10)} flexShrink={0} width="100%" />;
                }
                if (entry.type === 'separator') {
                  return <box height={0} width="100%" />;
                }
                if (entry.type === 'loading') {
                  return <LoadingSpinner text={entry.text} theme={t()} />;
                }
                if (entry.type === 'user') {
                  return (
                    <box
                      border={['left']}
                      borderColor={t().primary}
                      marginTop={1}
                      flexShrink={0}
                    >
                      <box
                        backgroundColor={t().backgroundPanel}
                        paddingLeft={2}
                        paddingTop={1}
                        paddingBottom={1}
                        flexShrink={0}
                      >
                        <text fg={t().text}>{entry.text}</text>
                      </box>
                    </box>
                  );
                }
                // Strip ANSI escape codes for TUI rendering
                const cleanText = entry.text.replace(/\x1b\[[0-9;]*m/g, '');
                return (
                  <box 
                    paddingLeft={3} 
                    paddingTop={0} 
                    paddingBottom={0} 
                    flexShrink={0}
                    width="100%"
                  >
                    <text fg={t().text}>{cleanText}</text>
                  </box>
                );
              }}
            </For>
          </box>
        </scrollbox>

        {/* Suggestions list - vertical like opencode */}
        <Show when={suggestions().length > 0 && !cmdPaletteOpen()}>
          <box
            flexDirection="column"
            paddingLeft={0}
            paddingRight={0}
            paddingTop={0}
            paddingBottom={0}
            flexShrink={0}
            backgroundColor={t().backgroundPanel}
            border={['left']}
            borderColor={t().borderActive}
            maxHeight={12}
          >
            <For each={suggestions().slice(0, 10)}>
              {(sug, i) => (
                <box
                  flexDirection="row"
                  paddingLeft={3}
                  paddingRight={3}
                  paddingTop={0}
                  paddingBottom={0}
                  height={1}
                  backgroundColor={i() === selectedSuggestion() ? t().backgroundElement : t().backgroundPanel}
                  onMouseUp={() => {
                    // Fill the command into input (user can add more arguments)
                    textarea?.setText(sug.command);
                    textarea?.gotoBufferEnd(); // Move cursor to end
                    setInput(sug.command);
                    setSuggestions([]);
                  }}
                >
                  <text 
                    fg={i() === selectedSuggestion() ? t().primary : t().textWeak}
                    flexShrink={0}
                    width={20}
                  >
                    {sug.command}
                  </text>
                  <text fg={i() === selectedSuggestion() ? t().text : t().textMuted}>
                    {sug.description}
                  </text>
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
          marginTop={1}
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
            paddingRight={2}
            paddingTop={1}
            paddingBottom={1}
            backgroundColor={t().backgroundPanel}
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
                // Don't update suggestions when navigating history
                // This preserves the suggestion list while browsing command history
                if (!isNavigatingHistory) {
                  updateSuggestions(val);
                }
              }}
              onSubmit={() => {
                // When suggestions are visible, Enter fills the selected suggestion into input
                const sugs = suggestions();
                if (sugs.length > 0) {
                  const selected = sugs[selectedSuggestion()];
                  if (selected) {
                    // Immediate commands that don't need parameters - execute directly
                    const immediateCommands = ['/exit', '/quit', '/q', '/help', '/h', '/clear', '/theme'];
                    if (immediateCommands.includes(selected.command)) {
                      textarea?.setText(selected.command);
                      setInput(selected.command);
                      setSuggestions([]);
                      void submitCommand(selected.command);
                      return;
                    }
                    // For other commands, just fill without submitting
                    textarea?.setText(selected.command);
                    textarea?.gotoBufferEnd(); // Move cursor to end
                    setInput(selected.command);
                    setSuggestions([]); // Clear suggestions after selection
                  }
                  return;
                }
                // Otherwise submit the command
                void submitCommand(textarea?.plainText ?? '');
              }}
              keyBindings={[{ name: 'return', action: 'submit' }]}
            />
          </box>
        </box>

        {/* Keybind hints at bottom right */}
        <KeybindHints theme={t()} />
      </box>

      {/* ── Separator between main content and sidebar ── */}
      <Show when={wide()}>
        <box width={1} height="100%" backgroundColor={t().border} />
      </Show>

      {/* ── Right sidebar (only on wide terminals) ── */}
      <Show when={wide()}>
        <Sidebar commandCount={() => AVAILABLE_COMMANDS.length} theme={t()} width={sidebarWidth - 1} />
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
                  textarea?.gotoBufferEnd(); // Move cursor to end
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
                  textarea?.gotoBufferEnd(); // Move cursor to end
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
export async function startInteractiveMode(snapshot?: { 
  entries?: Array<{ type: 'user' | 'output' | 'separator'; text: string }>;
  history?: string[];
  theme?: 'light' | 'dark';
} | null): Promise<void> {
  // Enter alternate screen buffer before rendering
  process.stdout.write('\x1b[?1049h');
  
  try {
    await render(
      () => <InteractiveShell initialSnapshot={snapshot} />,
      {
        stdout: process.stdout,
        stdin: process.stdin,
      },
    );
  } finally {
    // Ensure we exit alternate screen buffer even if render throws
    process.stdout.write('\x1b[?1049l');
  }
}
