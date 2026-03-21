/**
 * Version information module.
 * BUILD_TIME is injected at build time by the build script.
 * In dev mode, it shows the current time.
 */

// These are replaced by the build script at compile time
declare const __BUILD_TIME__: string;
declare const __VERSION__: string;

export const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.1';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null;

// Check if running in dev/test mode (BUILD_TIME is null in dev mode)
export const isDevMode = BUILD_TIME === null;

export function getVersionDisplay(): string {
  if (isDevMode) {
    // In dev mode, show version with "dev" suffix and current time
    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `v${VERSION}-dev (${timeStr})`;
  }
  // In production, just show version
  return `v${VERSION}`;
}

export function getBuildTimeDisplay(): string | null {
  if (!BUILD_TIME) return null;
  const date = new Date(BUILD_TIME);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
