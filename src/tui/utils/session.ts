import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { ThemeMode } from '../../core/types/index.js';

// Session snapshot for restoring TUI state
export interface SessionSnapshot {
  id: string;
  createdAt: string;
  updatedAt: string;
  entries: Array<{
    type: 'user' | 'output' | 'separator' | 'page-break';
    text: string;
  }>;
  history: string[];
  theme: ThemeMode;
}

// Snapshot directory: ~/.magic-im/snapshots
const CONFIG_DIR = join(homedir(), '.magic-im');
const SNAPSHOT_DIR = join(CONFIG_DIR, 'snapshots');

const ensureSnapshotDir = (): boolean => {
  try {
    if (!existsSync(SNAPSHOT_DIR)) {
      mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
};

export function saveSnapshot(snapshot: SessionSnapshot): boolean {
  try {
    if (!ensureSnapshotDir()) {
      return false;
    }
    const filePath = join(SNAPSHOT_DIR, `${snapshot.id}.json`);
    writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function loadSnapshot(id: string): SessionSnapshot | null {
  const filePath = join(SNAPSHOT_DIR, `${id}.json`);
  try {
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as SessionSnapshot;
    }
  } catch {
    // Return null on error
  }
  return null;
}

export function deleteSnapshot(id: string): boolean {
  const filePath = join(SNAPSHOT_DIR, `${id}.json`);
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    return true;
  } catch {
    return false;
  }
}

export function listSnapshots(): SessionSnapshot[] {
  try {
    if (!existsSync(SNAPSHOT_DIR)) return [];
    const files = readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith('.json'));
    return files
      .map((f) => {
        try {
          const data = readFileSync(join(SNAPSHOT_DIR, f), 'utf-8');
          return JSON.parse(data) as SessionSnapshot;
        } catch {
          return null;
        }
      })
      .filter((s): s is SessionSnapshot => s !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export function getSnapshotDirPath(): string {
  return SNAPSHOT_DIR;
}
