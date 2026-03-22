import { getTheme, setTheme as saveTheme } from '../../core/config/config.js';
import type { ThemeMode } from '../../core/types/index.js';

// ─── Theme definitions (opencode) ─────────────────────────────────────────────
export const themes = {
  // Dark theme (default)
  dark: {
    background: '#0a0a0a',
    backgroundPanel: '#111111',
    backgroundElement: '#1a1a1a',
    backgroundWeak: '#141414',
    text: '#eeeeee',
    textStrong: '#ffffff',
    textWeak: '#808080',
    textMuted: '#636e72',
    border: '#2a2a2a',
    borderWeak: '#1f1f1f',
    borderActive: '#4a4a4a',
    borderInteractive: '#56b6c2',
    primary: '#fab283',
    accent: '#9d7cd8',
    success: '#7fd88f',
    warning: '#f5a742',
    error: '#e06c75',
    info: '#56b6c2',
    interactive: '#56b6c2',
    interactiveHover: '#6bc9d5',
  },
  // Light theme
  light: {
    background: '#ffffff',
    backgroundPanel: '#f8f8f8',
    backgroundElement: '#f0f0f0',
    backgroundWeak: '#f5f5f5',
    text: '#1a1a1a',
    textStrong: '#000000',
    textWeak: '#666666',
    textMuted: '#888888',
    border: '#e0e0e0',
    borderWeak: '#f0f0f0',
    borderActive: '#c0c0c0',
    borderInteractive: '#318795',
    primary: '#3b7dd8',
    accent: '#d68c27',
    success: '#3d9a57',
    warning: '#d68c27',
    error: '#d1383d',
    info: '#318795',
    interactive: '#3b7dd8',
    interactiveHover: '#4a8ce8',
  },
};

export type Theme = typeof themes.dark;

// Detect system color scheme preference
export function getInitialTheme(): ThemeMode {
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

export function setTheme(mode: ThemeMode): void {
  saveTheme(mode);
}

export function getThemeColors(mode: ThemeMode): Theme {
  return themes[mode];
}
