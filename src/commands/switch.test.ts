import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('../core/api/index.js', () => ({
  agentApi: {
    listAgents: vi.fn(),
  },
}));

vi.mock('../core/config/config.js', () => ({
  setToken: vi.fn(),
}));

vi.mock('../utils/ui.js', () => ({
  UI: {
    println: vi.fn(),
    error: (t: string) => `ERROR: ${t}`,
    success: (t: string) => `SUCCESS: ${t}`,
    info: (t: string) => `INFO: ${t}`,
    warning: (t: string) => `WARNING: ${t}`,
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { agentApi } from '../core/api/index.js';
import { setToken } from '../core/config/config.js';
import { UI } from '../utils/ui.js';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { CommandModule } from 'yargs';

describe('Switch Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Structure', () => {
    it('should export a valid yargs command module', async () => {
      const switchModule = await import('./switch.js');
      expect(switchModule.default).toBeDefined();
      expect(switchModule.default.command).toBe('switch');
      expect(switchModule.default.describe).toContain('Switch to a specific agent');
      expect(typeof switchModule.default.handler).toBe('function');
    });

    it('should define agent option', async () => {
      const switchModule = await import('./switch.js');
      const command = switchModule.default as CommandModule;
      
      // Verify builder is a function
      expect(typeof command.builder).toBe('function');
    });
  });

  describe('Authentication Check', () => {
    it('should exit with error when not logged in', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);
      const stderrMock = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      // Mock existsSync to return false (no config file)
      (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const switchModule = await import('./switch.js');
      const handler = switchModule.default.handler as Function;

      await expect(handler({})).rejects.toThrow('process.exit');
      
      expect(logger.error).toHaveBeenCalledWith('No login session found', expect.any(Object));
      expect(stderrMock).toHaveBeenCalled();
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
      stderrMock.mockRestore();
    });
  });

  describe('Agent Selection', () => {
    beforeEach(() => {
      // Mock logged in state
      (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({
        token: 'test-token',
      }));
    });

    it('should display available agents when no agent specified', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);

      // Mock listAgents to return some agents
      (agentApi.listAgents as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [
          { id: 'agent-1', name: 'coding', full_name: 'coding@user', description: 'Coding assistant', is_default: false },
          { id: 'agent-2', name: 'writing', full_name: 'writing@user', description: 'Writing assistant', is_default: true },
        ],
      });

      const switchModule = await import('./switch.js');
      const handler = switchModule.default.handler as Function;

      await expect(handler({})).rejects.toThrow('process.exit');
      
      expect(agentApi.listAgents).toHaveBeenCalled();
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Available agents'));
      expect(exitMock).toHaveBeenCalledWith(0);

      exitMock.mockRestore();
    });

    it('should exit with error when specified agent not found', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);
      const stderrMock = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      // Mock listAgents to return agents that don't include the requested one
      (agentApi.listAgents as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [
          { id: 'agent-1', name: 'coding', full_name: 'coding@user', is_default: false },
        ],
      });

      const switchModule = await import('./switch.js');
      const handler = switchModule.default.handler as Function;

      await expect(handler({ agent: 'nonexistent' })).rejects.toThrow('process.exit');
      
      expect(logger.error).toHaveBeenCalledWith('Agent not found', { agentName: 'nonexistent' });
      expect(stderrMock).toHaveBeenCalled();
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
      stderrMock.mockRestore();
    });
  });

  describe('Successful Switch', () => {
    beforeEach(() => {
      // Mock logged in state
      (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({
        token: 'test-token',
      }));
    });

    it('should successfully switch to specified agent', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      // Mock listAgents
      (agentApi.listAgents as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [
          { id: 'agent-1', name: 'coding', full_name: 'coding@user', is_default: false },
        ],
      });

      (writeFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => undefined);

      const switchModule = await import('./switch.js');
      const handler = switchModule.default.handler as Function;

      await handler({ agent: 'coding' });
      
      expect(setToken).toHaveBeenCalledWith('test-token');
      expect(agentApi.listAgents).toHaveBeenCalled();
      expect(writeFileSync).toHaveBeenCalled();
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('Switched to agent'));

      exitMock.mockRestore();
    });
  });

  describe('API Error Handling', () => {
    beforeEach(() => {
      // Mock logged in state
      (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({
        token: 'test-token',
      }));
    });

    it('should handle listAgents API failure', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);
      const stderrMock = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      // Mock listAgents to fail
      (agentApi.listAgents as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { message: 'Network error' },
      });

      const switchModule = await import('./switch.js');
      const handler = switchModule.default.handler as Function;

      await expect(handler({ agent: 'coding' })).rejects.toThrow('process.exit');
      
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch agents', expect.any(Object));
      expect(stderrMock).toHaveBeenCalled();
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
      stderrMock.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      // Mock logged in state
      (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({
        token: 'test-token',
      }));
    });

    it('should handle empty agents list', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      // Mock listAgents to return empty array
      (agentApi.listAgents as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [],
      });

      const switchModule = await import('./switch.js');
      const handler = switchModule.default.handler as Function;

      await handler({});
      
      expect(UI.println).toHaveBeenCalledWith(expect.stringContaining('No agents found'));
      expect(exitMock).toHaveBeenCalledWith(0);

      exitMock.mockRestore();
    });

    it('should handle config file read error', async () => {
      const exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as (code?: number | string | null | undefined) => never);
      const stderrMock = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      // Mock readFileSync to throw error
      (readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const switchModule = await import('./switch.js');
      const handler = switchModule.default.handler as Function;

      await expect(handler({})).rejects.toThrow('process.exit');
      
      expect(logger.error).toHaveBeenCalledWith('Failed to read workspace config', expect.any(Object));
      expect(stderrMock).toHaveBeenCalled();
      expect(exitMock).toHaveBeenCalledWith(1);

      exitMock.mockRestore();
      stderrMock.mockRestore();
    });
  });
});
