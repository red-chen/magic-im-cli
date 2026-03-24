import { existsSync } from 'fs';
import { getLanguage, setLanguage } from '../core/config/config.js';
import { loadSnapshot, type SessionSnapshot } from './utils/session.js';
import type { Language } from '../core/types/index.js';

// First run check - prompt for language selection in TUI mode
async function checkFirstRun(): Promise<void> {
  // Skip language prompt if already set
  if (getLanguage()) return;

  // Simple language selection for first run (non-interactive since we're entering TUI)
  // Default to system locale or English
  const systemLocale = process.env.LANG || process.env.LC_ALL || '';
  const defaultLang: Language = systemLocale.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  setLanguage(defaultLang);
}

// Start the TUI (interactive mode)
export async function startTui(sessionId?: string, workspace?: string): Promise<void> {
  // Check first run for language
  await checkFirstRun();

  // Load snapshot if session ID provided
  const snapshot: SessionSnapshot | null = sessionId ? loadSnapshot(sessionId) : null;

  // Dynamically import the interactive shell to avoid loading TUI dependencies in CLI mode
  // This also allows the interactive.tsx to use the old imports for now
  // In a future refactor, we can migrate the interactive shell to use the new core imports
  const { startInteractiveMode } = await import('../utils/interactive.js');

  await startInteractiveMode(snapshot, workspace);
}

// Re-export session utilities
export { loadSnapshot, saveSnapshot, listSnapshots, deleteSnapshot } from './utils/session.js';
export type { SessionSnapshot } from './utils/session.js';
