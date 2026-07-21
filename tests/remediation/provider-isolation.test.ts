import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the server-only import
vi.mock('server-only', () => ({}));

describe('Provider architecture', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset module cache to pick up fresh env
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('LLM_PROVIDER=alem', () => {
    it('callClinicalJson delegates to Alem adapter', async () => {
      process.env.LLM_PROVIDER = 'alem';
      process.env.ALEM_API_KEY = 'test-key';
      process.env.ALEM_BASE_URL = 'https://llm.test.alem.ai/v1';
      process.env.ALEM_CHAT_MODEL = 'test-model';

      // Mock fetch for Alem
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"answer":"test"}' } }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const { callClinicalJson } = await import('@/lib/ai/text-llm.server');
      const result = await callClinicalJson('test prompt');

      expect(result).toEqual({ answer: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('llm.test.alem.ai');
      expect(url).not.toContain('api.openai.com');
      expect(url).not.toContain('generativelanguage.googleapis.com');
    });

    it('Alem adapter does not read OPENAI_API_KEY', async () => {
      process.env.LLM_PROVIDER = 'alem';
      process.env.ALEM_API_KEY = 'alem-key';
      process.env.OPENAI_API_KEY = 'openai-key-should-not-be-used';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"answer":"hello"}' } }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const { callClinicalText } = await import('@/lib/ai/text-llm.server');
      await callClinicalText('test');

      // Verify the auth header uses ALEM_API_KEY, not OPENAI_API_KEY
      const [, fetchInit] = mockFetch.mock.calls[0];
      expect(fetchInit.headers.authorization).toBe('Bearer alem-key');
      expect(fetchInit.headers.authorization).not.toContain('openai-key');
    });
  });

  describe('LLM_PROVIDER=mock', () => {
    it('callClinicalJson returns mock response without making HTTP calls', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const { callClinicalJson } = await import('@/lib/ai/text-llm.server');
      const result = await callClinicalJson('test prompt');

      expect(result).toBeTruthy();
      expect(typeof result).toBe('object');
      // Mock should not make any HTTP calls
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('callClinicalText returns mock response without making HTTP calls', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const { callClinicalText } = await import('@/lib/ai/text-llm.server');
      const result = await callClinicalText('test prompt');

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('OPENAI_API_KEY presence does NOT enable OpenAI for text', () => {
    it('only OPENAI_API_KEY present, no LLM_PROVIDER → defaults to mock', async () => {
      delete process.env.LLM_PROVIDER;
      process.env.OPENAI_API_KEY = 'sk-test-openai-key';
      delete process.env.ALEM_API_KEY;

      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const { callClinicalJson } = await import('@/lib/ai/text-llm.server');
      const result = await callClinicalJson('test prompt');

      // Should use mock (default), NOT OpenAI
      expect(result).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('OpenAI Chat Completions is never called', () => {
    it('text LLM adapter never calls api.openai.com', async () => {
      process.env.LLM_PROVIDER = 'alem';
      process.env.ALEM_API_KEY = 'test-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '"test"' } }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const { callClinicalText } = await import('@/lib/ai/text-llm.server');
      await callClinicalText('test');

      for (const call of mockFetch.mock.calls) {
        const url = String(call[0]);
        expect(url).not.toContain('api.openai.com');
        expect(url).not.toContain('openai.com/v1/chat');
      }
    });
  });

  describe('Missing ALEM_API_KEY returns deterministic fallback', () => {
    it('returns null when ALEM_API_KEY is missing and provider is alem', async () => {
      process.env.LLM_PROVIDER = 'alem';
      delete process.env.ALEM_API_KEY;

      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      const { callClinicalJson } = await import('@/lib/ai/text-llm.server');
      const result = await callClinicalJson('test prompt');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Provider config isolation', () => {
    it('OPENAI_API_KEY is not read by provider-config for text LLM', async () => {
      process.env.LLM_PROVIDER = 'alem';
      process.env.OPENAI_API_KEY = 'should-not-appear';

      const { getAlemConfig } = await import('@/lib/ai/provider-config.server');
      const config = getAlemConfig();

      // Config should not contain OPENAI_API_KEY
      if (config) {
        expect(config.apiKey).not.toBe('should-not-appear');
      }
    });
  });

  describe('Mock provider respects production contract', () => {
    it('mockCallJson returns valid patient response shape', async () => {
      process.env.LLM_PROVIDER = 'mock';

      const { callClinicalJson } = await import('@/lib/ai/text-llm.server');
      const result = await callClinicalJson('test');

      expect(result).toBeTruthy();
      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('newFactIds');
      expect(result).toHaveProperty('visualState');
    });
  });
});
