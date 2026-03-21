import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../utils/api.js', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
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
  createAgentTable: vi.fn(() => 'table'),
  createSuccessBox: vi.fn((t: string) => t),
  createErrorBox: vi.fn((t: string) => t),
  sectionHeader: vi.fn(),
  divider: vi.fn(),
}));

vi.mock('../utils/i18n.js', () => ({
  t: (k: string) => k,
}));

vi.mock('../index.js', () => ({
  isJsonMode: false,
}));

async function parseWith(args: string[]) {
  const { default: yargsLib } = await import('yargs');
  const { hideBin } = await import('yargs/helpers');
  const agentMod = await import('./agent.js');

  const originalArgv = process.argv;
  process.argv = ['node', 'magic-im', ...args];
  try {
    await yargsLib(hideBin(process.argv))
      .command(agentMod.default)
      .exitProcess(false)
      .fail(() => {})
      .parseAsync();
  } finally {
    process.argv = originalArgv;
  }
}

describe('agent commands (yargs)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('agent create', () => {
    it('should call apiClient.post (name undefined when missing, rejected by API)', async () => {
      const { apiClient } = await import('../utils/api.js');
      // yargs with exitProcess(false) still calls handler even if demandOption is violated
      // the handler will call apiClient.post with name: undefined
      vi.mocked(apiClient.post).mockResolvedValueOnce({ success: false, data: null });

      await parseWith(['agent', 'create']);

      // demandOption fires validation but handler still runs — name will be undefined
      expect(apiClient.post).toHaveBeenCalledWith('/agents', {
        name: undefined,
        visibility: 'PUBLIC',
      });
    });

    it('should call apiClient.post with PUBLIC visibility by default', async () => {
      const { apiClient } = await import('../utils/api.js');
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', name: 'bot', full_name: 'bot#user', visibility: 'PUBLIC', user_id: '1', created_at: '', updated_at: '' },
      });

      await parseWith(['agent', 'create', '-n', 'bot']);

      expect(apiClient.post).toHaveBeenCalledWith('/agents', { name: 'bot', visibility: 'PUBLIC' });
    });

    it('should map visibility option to uppercase API value', async () => {
      const { apiClient } = await import('../utils/api.js');
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', name: 'bot', full_name: 'bot#user', visibility: 'PRIVATE', user_id: '1', created_at: '', updated_at: '' },
      });

      await parseWith(['agent', 'create', '-n', 'bot', '-v', 'private']);

      expect(apiClient.post).toHaveBeenCalledWith('/agents', { name: 'bot', visibility: 'PRIVATE' });
    });
  });

  describe('agent list', () => {
    it('should call apiClient.get /agents', async () => {
      const { apiClient } = await import('../utils/api.js');
      vi.mocked(apiClient.get).mockResolvedValueOnce({ success: true, data: [] });

      await parseWith(['agent', 'list']);

      expect(apiClient.get).toHaveBeenCalledWith('/agents');
    });
  });

  describe('agent delete', () => {
    it('should exit without --force flag', async () => {
      const { apiClient } = await import('../utils/api.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await parseWith(['agent', 'delete', 'agent-123']);
      } catch {}

      expect(apiClient.delete).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });

    it('should call apiClient.delete with --force flag', async () => {
      const { apiClient } = await import('../utils/api.js');
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ success: true, data: null });

      await parseWith(['agent', 'delete', 'agent-123', '--force']);

      expect(apiClient.delete).toHaveBeenCalledWith('/agents/agent-123');
    });
  });

  describe('agent update', () => {
    it('should exit when no updates are provided', async () => {
      const { apiClient } = await import('../utils/api.js');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

      try {
        await parseWith(['agent', 'update', 'agent-123']);
      } catch {}

      expect(apiClient.patch).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });

    it('should call apiClient.patch with name update', async () => {
      const { apiClient } = await import('../utils/api.js');
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        success: true,
        data: { id: '1', name: 'newname', full_name: 'newname#user', visibility: 'PUBLIC', user_id: '1', created_at: '', updated_at: '' },
      });

      await parseWith(['agent', 'update', 'agent-123', '-n', 'newname']);

      expect(apiClient.patch).toHaveBeenCalledWith('/agents/agent-123', { name: 'newname' });
    });
  });
});
