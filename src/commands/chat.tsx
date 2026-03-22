import { render, useKeyboard, useTerminalDimensions, useRenderer, useSelectionHandler } from '@opentui/solid';
import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js';
import type { KeyEvent, TextareaRenderable, Selection } from '@opentui/core';
import type { CommandModule } from 'yargs';
import { apiClient } from '../utils/api.js';
import { UI, styles } from '../utils/ui.js';
import { getAgentId } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { Message } from '../types/index.js';

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
};

// ─── Chat TUI Component ───────────────────────────────────────────────────────

interface ChatUIProps {
  targetName: string;
  agentId: string;
  receiverId?: string;
  receiverFullName?: string;
}

function ChatUI(props: ChatUIProps) {
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [inputText, setInputText] = createSignal('');
  const [isSending, setIsSending] = createSignal(false);
  const [lastMessageId, setLastMessageId] = createSignal<string | undefined>(undefined);
  const [statusLine, setStatusLine] = createSignal<string>('');
  const [msgCount, setMsgCount] = createSignal(0);
  const [currentSelection, setCurrentSelection] = createSignal<Selection | null>(null);

  const dims = useTerminalDimensions();
  const wide = () => dims().width > 120;
  const renderer = useRenderer();

  let textarea: TextareaRenderable | undefined;

  // ── Poll for new messages every 1 second ────────────────────────────────────
  // Track consecutive poll errors to avoid log spam
  let consecutivePollErrors = 0;
  const MAX_POLL_ERRORS_TO_LOG = 3;
  
  createEffect(() => {
    const tick = async () => {
      try {
        const params = new URLSearchParams();
        params.append('agent_id', props.agentId);
        if (lastMessageId()) params.append('last_message_id', lastMessageId()!);
        params.append('limit', '50');

        const response = await apiClient.get<{ messages: Message[]; has_more: boolean }>(
          `/messages/poll?${params.toString()}`,
        );
        if (response.success && response.data.messages.length > 0) {
          const newMsgs = response.data.messages;
          setMessages((prev: Message[]) => {
            const ids = new Set(prev.map((m) => m.id));
            const fresh = newMsgs.filter((m) => !ids.has(m.id));
            return [...prev, ...fresh];
          });
          const last = newMsgs[newMsgs.length - 1];
          if (last) setLastMessageId(last.id);
          setMsgCount((c) => c + newMsgs.length);
        }
        // Reset error count on success
        consecutivePollErrors = 0;
      } catch (error) {
        consecutivePollErrors++;
        // Only log first few consecutive errors to avoid log spam
        if (consecutivePollErrors <= MAX_POLL_ERRORS_TO_LOG) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error('Message poll failed', { 
            error: msg, 
            consecutiveErrors: consecutivePollErrors,
            target: props.targetName 
          });
        }
        // Show error in status line after multiple failures
        if (consecutivePollErrors >= 3) {
          setStatusLine('Connection issue - retrying...');
        }
      }
    };

    void tick();
    const interval = setInterval(() => { void tick(); }, 1000);
    onCleanup(() => clearInterval(interval));
  });

  const sendMessage = async (content: string) => {
    const text = content.trim();
    if (!text || isSending()) return;

    setIsSending(true);
    setStatusLine('Sending...');
    textarea?.setText('');
    setInputText('');

    try {
      await apiClient.post('/messages', {
        agent_id: props.agentId,
        receiver_id: props.receiverId,
        receiver_full_name: props.receiverFullName,
        content: text,
      });
      setStatusLine('');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to send';
      logger.error('Failed to send message', { 
        error: msg, 
        target: props.targetName,
        receiverId: props.receiverId,
        receiverFullName: props.receiverFullName
      });
      setStatusLine(msg);
    } finally {
      setIsSending(false);
    }
  };

  // Track text selection for copy functionality
  useSelectionHandler((selection: Selection) => {
    setCurrentSelection(selection);
  });

  useKeyboard((evt: KeyEvent) => {
    // Ctrl+C: exit when no text is selected, otherwise copy selection
    if (evt.ctrl && evt.name === 'c') {
      const selection = currentSelection();
      if (selection && selection.isActive) {
        const selectedText = selection.getSelectedText();
        if (selectedText && renderer) {
          const success = renderer.copyToClipboardOSC52(selectedText);
          if (success) {
            setStatusLine('Copied to clipboard');
            setTimeout(() => setStatusLine(''), 2000);
          } else {
            setStatusLine('Copy failed - terminal may not support OSC52');
            setTimeout(() => setStatusLine(''), 3000);
          }
          return;
        }
      }
      process.exit(0);
    }
  });

  const refCallback = (val: TextareaRenderable) => {
    textarea = val;
    setTimeout(() => val.focus(), 0);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const scrollHeight = () => Math.max(dims().height - 5, 3);

  return (
    <box
      width={dims().width}
      height={dims().height}
      backgroundColor={theme.background}
      flexDirection="column"
    >
      {/* ── Header (opencode-style: left-bordered panel) ── */}
      <box
        flexShrink={0}
        border={['left']}
        borderColor={theme.primary}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        backgroundColor={theme.backgroundPanel}
      >
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.text}><b># Chat with {props.targetName}</b></text>
          <text fg={theme.textMuted} wrapMode="none">Enter to send · Select text+Ctrl+C to copy · Ctrl+C to exit</text>
        </box>
      </box>

      {/* ── Main row: messages + sidebar ── */}
      <box flexGrow={1} flexDirection="row">

        {/* ── Message column ── */}
        <box
          flexGrow={1}
          flexDirection="column"
          paddingLeft={2}
          paddingRight={2}
          paddingTop={1}
          paddingBottom={0}
          gap={1}
        >
          {/* Scrollable message pane */}
          <scrollbox flexGrow={1} height={scrollHeight()}>
            <box flexShrink={0} gap={0}>
              <Show when={messages().length === 0}>
                <box paddingLeft={3} marginTop={1} flexShrink={0}>
                  <text fg={theme.textMuted}>No messages yet. Say hello!</text>
                </box>
              </Show>
              <For each={messages()}>
                {(msg) => {
                  const isMe = msg.sender_type === 'user';
                  return (
                    <box
                      border={['left']}
                      borderColor={isMe ? theme.primary : theme.success}
                      paddingLeft={2}
                      paddingTop={1}
                      paddingBottom={1}
                      marginTop={1}
                      flexShrink={0}
                    >
                      <box flexDirection="row" gap={1}>
                        <text fg={isMe ? theme.primary : theme.success}>
                          <b>{isMe ? 'You' : props.targetName}</b>
                        </text>
                        <text fg={theme.textMuted}>{formatTime(msg.created_at)}</text>
                      </box>
                      <text fg={theme.text}>{msg.content}</text>
                    </box>
                  );
                }}
              </For>
            </box>
          </scrollbox>

          {/* Status / sending indicator */}
          <Show when={statusLine() !== ''}>
            <box paddingLeft={3} flexShrink={0}>
              <text fg={isSending() ? theme.textMuted : theme.error}>{statusLine()}</text>
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
              ref={refCallback}
              flexGrow={1}
              height={1}
              minHeight={1}
              maxHeight={1}
              placeholder="Type your message..."
              textColor={theme.text}
              focusedTextColor={theme.text}
              cursorColor={theme.primary}
              onContentChange={() => setInputText(textarea?.plainText ?? '')}
              onSubmit={() => { void sendMessage(textarea?.plainText ?? ''); }}
              keyBindings={[{ name: 'return', action: 'submit' }]}
            />
          </box>
        </box>

        {/* ── Right sidebar (wide only) ── */}
        <Show when={wide()}>
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
                  <text fg={theme.text}><b>{props.targetName}</b></text>
                </box>
                {/* Context info */}
                <box>
                  <text fg={theme.text}><b>Messages</b></text>
                  <text fg={theme.textMuted}>{msgCount()} received</text>
                  <text fg={theme.textMuted}>{isSending() ? 'Sending...' : 'Ready'}</text>
                </box>
                {/* Connection */}
                <box>
                  <text fg={theme.text}><b>Connection</b></text>
                  <text fg={theme.textMuted}>Polling every 1s</text>
                  <text fg={theme.textMuted}>http://localhost:3000</text>
                </box>
              </box>
            </scrollbox>

            {/* Bottom version */}
            <box flexShrink={0} gap={1} paddingTop={1}>
              <text fg={theme.textMuted}>
                <span style={{ fg: theme.success }}>•</span>{' '}
                <b>Magic</b><span style={{ fg: theme.text }}><b>IM</b></span>{' '}
                <span>1.0.0</span>
              </text>
            </box>
          </box>
        </Show>
      </box>

      {/* ── Footer keybind bar ── */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        flexShrink={0}
        paddingLeft={2}
        paddingRight={2}
      >
        <text fg={theme.textMuted}>chat · {props.targetName}</text>
        <box flexDirection="row" gap={2}>
          <text fg={theme.textMuted}>
            <span style={{ fg: theme.text }}>enter</span> send{'  '}
            <span style={{ fg: theme.text }}>select+c</span> copy{'  '}
            <span style={{ fg: theme.text }}>ctrl+c</span> exit
          </text>
        </box>
      </box>
    </box>
  );
}

// ─── Start chat TUI ───────────────────────────────────────────────────────────
async function startChatTUI(opts: ChatUIProps): Promise<void> {
  try {
    return await render(
      () => <ChatUI {...opts} />,
      {
        stdout: process.stdout,
        stdin: process.stdin,
      },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Chat TUI render failed', { 
      error: msg, 
      target: opts.targetName,
      stack: error instanceof Error ? error.stack : undefined
    });
    // Reset terminal on error
    process.stdout.write('\x1b[?1049l'); // Exit alternate screen
    process.stdout.write('\x1b[?25h');   // Show cursor
    process.stdout.write('\x1b[0m');     // Reset attributes
    throw error;
  }
}

// ─── Yargs command module ─────────────────────────────────────────────────────
const chatCommand: CommandModule<{}, { target?: string; 'target-id'?: string; agent?: string }> = {
  command: 'chat [target]',
  describe: 'Start an interactive chat session with an agent',
  builder: (yargs) =>
    yargs
      .positional('target', {
        type: 'string',
        description: 'Target agent full name (e.g., AgentName#UserName) or agent ID',
      })
      .option('target-id', { alias: 'i', type: 'string', description: 'Target agent ID' })
      .option('agent', { alias: 'a', type: 'string', description: 'Your agent ID (or use config default)' }),
  handler: async (argv) => {
    try {
      // Get agent ID from option or config
      const agentId = argv.agent || getAgentId();
      if (!agentId) {
        const errorMsg = 'Agent ID required. Use --agent or set default with "magic-im agent use <agent_id>"';
        logger.error('Chat command failed: no agent ID');
        process.stderr.write(UI.error(errorMsg) + '\n');
        process.exit(1);
      }

      let receiverId: string | undefined = argv['target-id'];
      let receiverFullName: string | undefined;

      if (argv.target) {
        if (argv.target.includes('#')) {
          receiverFullName = argv.target;
        } else {
          receiverId = argv.target;
        }
      }

      if (!receiverId && !receiverFullName) {
        const errorMsg = 'Please provide a target agent (full name or ID)';
        logger.error('Chat command failed: no target specified');
        process.stderr.write(UI.error(errorMsg) + '\n');
        process.exit(1);
      }

      const targetName = receiverFullName ?? receiverId ?? 'Unknown';

      logger.info('Starting chat session', { target: targetName, agentId, receiverId, receiverFullName });
      UI.println(UI.success(`Starting chat with ${targetName}...`));

      await startChatTUI({ targetName, agentId, receiverId, receiverFullName });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Chat command failed', { 
        error: msg, 
        stack: error instanceof Error ? error.stack : undefined 
      });
      process.stderr.write(UI.error(msg) + '\n');
      process.exit(1);
    }
  },
};

export default chatCommand;
