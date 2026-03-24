import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../utils/api.js', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../utils/ui.js', () => ({
  UI: {
    println: vi.fn(),
    success: (t: string) => t,
    info: (t: string) => t,
    error: (t: string) => t,
  },
  styles: {
    success: (t: string) => t,
    error: (t: string) => t,
  },
  spinner: vi.fn(() => vi.fn()),
}));

vi.mock('../utils/format.js', () => ({
  formatSuccess: (t: string) => t,
  formatError: (t: string) => t,
  formatFriendList: (data: unknown[]) => `Friends: ${data.length}`,
  formatFriendRequestList: (data: unknown[]) => `Requests: ${data.length}`,
}));

vi.mock('../utils/config.js', () => ({
  getAgentId: vi.fn(() => 'test-agent-id'),
}));

async function runCommand(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number; uiOutput: string[] }> {
  const { default: yargsLib } = await import('yargs');
  const { hideBin } = await import('yargs/helpers');
  const friendMod = await import('./friend.js');
  const { UI } = await import('../utils/ui.js');

  const stdout: string[] = [];
  const stderr: string[] = [];
  const uiOutput: string[] = [];
  let exitCode = 0;

  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((s: unknown) => {
    stdout.push(String(s));
    return true;
  });
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((s: unknown) => {
    stderr.push(String(s));
    return true;
  });
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    exitCode = typeof code === 'number' ? code : 0;
    throw new Error(`process.exit(${code})`);
  });
  const uiSpy = vi.spyOn(UI, 'println').mockImplementation((s: string) => {
    uiOutput.push(s);
    return true;
  });

  try {
    const originalArgv = process.argv;
    process.argv = ['node', 'magic-im', ...args];
    await yargsLib(hideBin(process.argv))
      .command(friendMod.default)
      .exitProcess(false)
      .fail(() => {})
      .parseAsync();
    process.argv = originalArgv;
  } catch {
    // process.exit throws in tests
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
    uiSpy.mockRestore();
  }

  return { stdout: stdout.join(''), stderr: stderr.join(''), exitCode, uiOutput };
}

describe('friend commands (yargs)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Positive Tests ────────────────────────────────────────────────────────────
  describe('Positive Tests', () => {
    describe('friend add', () => {
      it('should send friend request with valid target_full_name', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: { id: '1', agent_id: 'a1', friend_agent_id: 'a2', created_at: '' },
        });

        await runCommand(['friend', 'add', 'TestBot#TestUser']);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/request', {
          entity_id: 'user',
          target_full_name: 'TestBot#TestUser',
        });
      });

      it('should send friend request with special characters in name', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: { id: '1', agent_id: 'a1', friend_agent_id: 'a2', created_at: '' },
        });

        await runCommand(['friend', 'add', 'My-Bot_123#User-Name_456']);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/request', {
          entity_id: 'user',
          target_full_name: 'My-Bot_123#User-Name_456',
        });
      });
    });

    describe('friend list', () => {
      it('should list all friends', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.get).mockResolvedValueOnce({
          success: true,
          data: [
            { id: '1', agent_id: 'a1', friend_agent_id: 'a2', friend_name: 'Bot', friend_full_name: 'Bot#User', created_at: '' },
            { id: '2', agent_id: 'a1', friend_agent_id: 'a3', friend_name: 'Bot2', friend_full_name: 'Bot2#User2', created_at: '' },
          ],
        });

        const { uiOutput } = await runCommand(['friend', 'list']);

        expect(apiClient.get).toHaveBeenCalledWith('/friends?entity_id=user');
        expect(uiOutput.length).toBeGreaterThan(0);
      });

      it('should handle empty friend list', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.get).mockResolvedValueOnce({
          success: true,
          data: [],
        });

        const { uiOutput } = await runCommand(['friend', 'list']);

        expect(apiClient.get).toHaveBeenCalledWith('/friends?entity_id=user');
        expect(uiOutput.length).toBeGreaterThan(0);
      });
    });

    describe('friend requests', () => {
      it('should list pending friend requests', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.get).mockResolvedValueOnce({
          success: true,
          data: [
            { id: 'r1', requester_agent_id: 'a1', target_agent_id: 'a2', status: 'PENDING', requester_full_name: 'Bot#User' },
          ],
        });

        const { uiOutput } = await runCommand(['friend', 'requests']);

        expect(apiClient.get).toHaveBeenCalledWith('/friends/requests?entity_id=user');
        expect(uiOutput.length).toBeGreaterThan(0);
      });
    });

    describe('friend accept', () => {
      it('should accept friend request with valid request_id', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: { id: 'f1', agent_id: 'a1', friend_agent_id: 'a2', created_at: '' },
        });

        const { uiOutput } = await runCommand(['friend', 'accept', 'request-uuid-123']);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/accept/request-uuid-123', { entity_id: 'user' });
        expect(uiOutput.length).toBeGreaterThan(0);
      });
    });

    describe('friend reject', () => {
      it('should reject friend request with valid request_id', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: {},
        });

        const { uiOutput } = await runCommand(['friend', 'reject', 'request-uuid-456']);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/reject/request-uuid-456', { entity_id: 'user' });
        expect(uiOutput.length).toBeGreaterThan(0);
      });
    });

    describe('friend remove', () => {
      it('should remove friend with valid friend_id', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.delete).mockResolvedValueOnce({
          success: true,
          data: {},
        });

        const { uiOutput } = await runCommand(['friend', 'remove', 'friend-uuid-789']);

        expect(apiClient.delete).toHaveBeenCalledWith('/friends/friend-uuid-789?entity_id=user');
        expect(uiOutput.length).toBeGreaterThan(0);
      });
    });
  });

  // ─── Exception Tests ───────────────────────────────────────────────────────────
  describe('Exception Tests', () => {
    describe('friend add', () => {
      it('should fail when target_full_name is missing', async () => {
        const { apiClient } = await import('../utils/api.js');

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('exit');
        });
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

        const { default: yargsLib } = await import('yargs');
        const { hideBin } = await import('yargs/helpers');
        const friendMod = await import('./friend.js');

        process.argv = ['node', 'magic-im', 'friend', 'add'];
        try {
          await yargsLib(hideBin(process.argv))
            .command(friendMod.default)
            .exitProcess(false)
            .parseAsync();
        } catch {
          // expected
        }
        process.argv = [];

        expect(apiClient.post).not.toHaveBeenCalled();

        exitSpy.mockRestore();
        stderrSpy.mockRestore();
      });

      it('should handle API error gracefully', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Agent not found'));

        const { uiOutput, exitCode } = await runCommand(['friend', 'add', 'NonExistent#User']);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/request', {
          entity_id: 'user',
          target_full_name: 'NonExistent#User',
        });
        expect(uiOutput).toContain('Agent not found');
        expect(exitCode).toBe(0); // Should not exit on error
      });

      it('should handle network error', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));

        const { uiOutput, exitCode } = await runCommand(['friend', 'add', 'Bot#User']);

        expect(uiOutput).toContain('Network error');
        expect(exitCode).toBe(0); // Should not exit on error
      });

      it('should handle already friends error', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Already friends'));

        const { uiOutput, exitCode } = await runCommand(['friend', 'add', 'Bot#User']);

        expect(uiOutput).toContain('Already friends');
        expect(exitCode).toBe(0); // Should not exit on error
      });
    });

    describe('friend accept', () => {
      it('should fail when request_id is missing', async () => {
        const { apiClient } = await import('../utils/api.js');

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('exit');
        });
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

        const { default: yargsLib } = await import('yargs');
        const { hideBin } = await import('yargs/helpers');
        const friendMod = await import('./friend.js');

        process.argv = ['node', 'magic-im', 'friend', 'accept'];
        try {
          await yargsLib(hideBin(process.argv))
            .command(friendMod.default)
            .exitProcess(false)
            .parseAsync();
        } catch {
          // expected
        }
        process.argv = [];

        expect(apiClient.post).not.toHaveBeenCalled();

        exitSpy.mockRestore();
        stderrSpy.mockRestore();
      });

      it('should handle invalid request_id error', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Request not found'));

        const { uiOutput, exitCode } = await runCommand(['friend', 'accept', 'invalid-uuid']);

        expect(uiOutput).toContain('Request not found');
        expect(exitCode).toBe(0); // Should not exit on error
      });
    });

    describe('friend reject', () => {
      it('should fail when request_id is missing', async () => {
        const { apiClient } = await import('../utils/api.js');

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('exit');
        });
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

        const { default: yargsLib } = await import('yargs');
        const { hideBin } = await import('yargs/helpers');
        const friendMod = await import('./friend.js');

        process.argv = ['node', 'magic-im', 'friend', 'reject'];
        try {
          await yargsLib(hideBin(process.argv))
            .command(friendMod.default)
            .exitProcess(false)
            .parseAsync();
        } catch {
          // expected
        }
        process.argv = [];

        expect(apiClient.post).not.toHaveBeenCalled();

        exitSpy.mockRestore();
        stderrSpy.mockRestore();
      });
    });

    describe('friend remove', () => {
      it('should fail when friend_id is missing', async () => {
        const { apiClient } = await import('../utils/api.js');

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('exit');
        });
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

        const { default: yargsLib } = await import('yargs');
        const { hideBin } = await import('yargs/helpers');
        const friendMod = await import('./friend.js');

        process.argv = ['node', 'magic-im', 'friend', 'remove'];
        try {
          await yargsLib(hideBin(process.argv))
            .command(friendMod.default)
            .exitProcess(false)
            .parseAsync();
        } catch {
          // expected
        }
        process.argv = [];

        expect(apiClient.delete).not.toHaveBeenCalled();

        exitSpy.mockRestore();
        stderrSpy.mockRestore();
      });

      it('should handle friend not found error', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('Friend not found'));

        const { uiOutput, exitCode } = await runCommand(['friend', 'remove', 'invalid-friend-id']);

        expect(uiOutput).toContain('Friend not found');
        expect(exitCode).toBe(0); // Should not exit on error
      });
    });

    describe('friend list', () => {
      it('should handle API error gracefully', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Unauthorized'));

        const { uiOutput, exitCode } = await runCommand(['friend', 'list']);

        expect(uiOutput).toContain('Unauthorized');
        expect(exitCode).toBe(0); // Should not exit on error
      });
    });
  });

  // ─── Boundary Tests ────────────────────────────────────────────────────────────
  describe('Boundary Tests', () => {
    describe('friend add', () => {
      it('should handle minimum length target_full_name (A#B)', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: { id: '1', agent_id: 'a1', friend_agent_id: 'a2', created_at: '' },
        });

        await runCommand(['friend', 'add', 'A#B']);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/request', {
          entity_id: 'user',
          target_full_name: 'A#B',
        });
      });

      it('should handle maximum length target_full_name (255 chars each side)', async () => {
        const { apiClient } = await import('../utils/api.js');
        const longName = 'A'.repeat(100);
        const longUser = 'B'.repeat(100);
        const fullName = `${longName}#${longUser}`;

        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: { id: '1', agent_id: 'a1', friend_agent_id: 'a2', created_at: '' },
        });

        await runCommand(['friend', 'add', fullName]);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/request', {
          entity_id: 'user',
          target_full_name: fullName,
        });
      });

      it('should handle target_full_name with unicode characters', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: { id: '1', agent_id: 'a1', friend_agent_id: 'a2', created_at: '' },
        });

        await runCommand(['friend', 'add', '机器人#用户']);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/request', {
          entity_id: 'user',
          target_full_name: '机器人#用户',
        });
      });

      it('should handle target_full_name with emoji', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: { id: '1', agent_id: 'a1', friend_agent_id: 'a2', created_at: '' },
        });

        await runCommand(['friend', 'add', 'Bot🤖#User👤']);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/request', {
          entity_id: 'user',
          target_full_name: 'Bot🤖#User👤',
        });
      });

      it('should handle target_full_name with numbers', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: { id: '1', agent_id: 'a1', friend_agent_id: 'a2', created_at: '' },
        });

        await runCommand(['friend', 'add', 'Bot123#User456']);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/request', {
          entity_id: 'user',
          target_full_name: 'Bot123#User456',
        });
      });
    });

    describe('friend accept/reject', () => {
      it('should handle UUID format request_id', async () => {
        const { apiClient } = await import('../utils/api.js');

        vi.mocked(apiClient.post).mockResolvedValueOnce({
          success: true,
          data: { id: 'f1', agent_id: 'a1', friend_agent_id: 'a2', created_at: '' },
        });

        await runCommand(['friend', 'accept', '550e8400-e29b-41d4-a716-446655440000']);

        expect(apiClient.post).toHaveBeenCalledWith('/friends/accept/550e8400-e29b-41d4-a716-446655440000', { entity_id: 'user' });
      });
    });

    describe('friend list', () => {
      it('should handle large friend list', async () => {
        const { apiClient } = await import('../utils/api.js');

        const largeFriendList = Array.from({ length: 100 }, (_, i) => ({
          id: `f${i}`,
          agent_id: 'a1',
          friend_agent_id: `a${i + 2}`,
          friend_name: `Bot${i}`,
          friend_full_name: `Bot${i}#User${i}`,
          created_at: '',
        }));

        vi.mocked(apiClient.get).mockResolvedValueOnce({
          success: true,
          data: largeFriendList,
        });

        const { uiOutput } = await runCommand(['friend', 'list']);

        expect(apiClient.get).toHaveBeenCalledWith('/friends?entity_id=user');
        expect(uiOutput.length).toBeGreaterThan(0);
      });
    });
  });
});
