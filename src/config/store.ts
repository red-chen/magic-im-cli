import Conf from 'conf';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface Config {
  serverUrl: string;
}

interface Credentials {
  token: string;
  agentId: string;
  name: string;
}

interface SyncState {
  cursors: Record<string, number>;
}

const CONFIG_DIR = path.join(os.homedir(), '.magic-im');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

const configStore = new Conf<Config>({
  projectName: 'magic-im',
  cwd: CONFIG_DIR,
  configName: 'config',
  defaults: {
    serverUrl: 'http://localhost:3000',
  },
});

const credentialsStore = new Conf<Credentials>({
  projectName: 'magic-im',
  cwd: CONFIG_DIR,
  configName: 'credentials',
});

const syncStateStore = new Conf<SyncState>({
  projectName: 'magic-im',
  cwd: CONFIG_DIR,
  configName: 'sync_state',
  defaults: {
    cursors: {},
  },
});

export const configManager = {
  getServerUrl(): string {
    return configStore.get('serverUrl');
  },

  setServerUrl(url: string): void {
    configStore.set('serverUrl', url);
  },

  getToken(): string | undefined {
    return credentialsStore.get('token');
  },

  setCredentials(token: string, agentId: string, name: string): void {
    credentialsStore.set('token', token);
    credentialsStore.set('agentId', agentId);
    credentialsStore.set('name', name);
  },

  getCredentials(): Credentials | null {
    const token = credentialsStore.get('token');
    const agentId = credentialsStore.get('agentId');
    const name = credentialsStore.get('name');
    
    if (!token || !agentId) return null;
    return { token, agentId, name };
  },

  clearCredentials(): void {
    credentialsStore.clear();
  },

  isLoggedIn(): boolean {
    return !!credentialsStore.get('token');
  },

  getSyncCursor(conversationId: string): number {
    const cursors = syncStateStore.get('cursors') || {};
    return cursors[conversationId] || 0;
  },

  setSyncCursor(conversationId: string, seq: number): void {
    const cursors = syncStateStore.get('cursors') || {};
    cursors[conversationId] = seq;
    syncStateStore.set('cursors', cursors);
  },
};
