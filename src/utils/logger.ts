import { existsSync, mkdirSync, appendFileSync, readdirSync, statSync, unlinkSync, renameSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Log directory and file path: ~/.magic-im/
const LOG_DIR = join(homedir(), '.magic-im');
const LOG_FILE = join(LOG_DIR, 'trace.log');

// Maximum age for log files: 7 days
const MAX_LOG_AGE_DAYS = 7;
const MAX_LOG_AGE_MS = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Ensure log directory exists
const ensureLogDir = (): void => {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
};

// Get current timestamp in ISO format
const getTimestamp = (): string => {
  return new Date().toISOString();
};

// Get current date string for log rotation (YYYY-MM-DD)
const getDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Clean up old log files (older than 7 days)
const cleanupOldLogs = (): void => {
  try {
    if (!existsSync(LOG_DIR)) return;

    const files = readdirSync(LOG_DIR);
    const now = Date.now();

    for (const file of files) {
      // Only process trace.log and rotated log files (trace.log.YYYY-MM-DD)
      if (!file.startsWith('trace.log')) continue;

      const filePath = join(LOG_DIR, file);
      try {
        const stats = statSync(filePath);
        const fileAge = now - stats.mtime.getTime();

        if (fileAge > MAX_LOG_AGE_MS) {
          unlinkSync(filePath);
        }
      } catch {
        // Ignore errors for individual files
      }
    }
  } catch {
    // Ignore cleanup errors
  }
};

// Rotate log file if needed (daily rotation)
const rotateLogIfNeeded = (): void => {
  try {
    if (!existsSync(LOG_FILE)) return;

    const stats = statSync(LOG_FILE);
    const fileDate = stats.mtime.toISOString().split('T')[0];
    const currentDate = getDateString();

    // If the log file is from a different day, rotate it
    if (fileDate !== currentDate) {
      const rotatedFile = `${LOG_FILE}.${fileDate}`;
      // If rotated file already exists, append a number
      let finalRotatedFile = rotatedFile;
      let counter = 1;
      while (existsSync(finalRotatedFile)) {
        finalRotatedFile = `${rotatedFile}.${counter}`;
        counter++;
      }

      // Rename current log to rotated name
      renameSync(LOG_FILE, finalRotatedFile);
    }
  } catch {
    // Ignore rotation errors
  }
};

// Internal log function
const logInternal = (level: LogLevel, message: string, ...args: unknown[]): void => {
  try {
    ensureLogDir();
    void rotateLogIfNeeded();
    cleanupOldLogs();

    const timestamp = getTimestamp();
    const argsStr = args.length > 0 ? ' ' + args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ') : '';

    const logLine = `[${timestamp}] [${level}] ${message}${argsStr}\n`;
    appendFileSync(LOG_FILE, logLine, 'utf-8');
  } catch {
    // Silently fail if logging fails
  }
};

// Logger interface
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

// Create logger instance
export const createLogger = (context: string): Logger => {
  return {
    debug: (message: string, ...args: unknown[]) => {
      logInternal(LogLevel.DEBUG, `[${context}] ${message}`, ...args);
    },
    info: (message: string, ...args: unknown[]) => {
      logInternal(LogLevel.INFO, `[${context}] ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      logInternal(LogLevel.WARN, `[${context}] ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      logInternal(LogLevel.ERROR, `[${context}] ${message}`, ...args);
    },
  };
};

// Default logger instance
export const logger: Logger = createLogger('CLI');

// Get log file path
export const getLogFilePath = (): string => LOG_FILE;

// Get log directory path
export const getLogDirPath = (): string => LOG_DIR;
