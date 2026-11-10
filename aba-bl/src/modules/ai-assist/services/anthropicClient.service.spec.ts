import { Test, TestingModule } from '@nestjs/testing';
import Anthropic from '@anthropic-ai/sdk';
import { AnthropicClientService } from './anthropicClient.service';

// `mock`-prefixed so babel-plugin-jest-hoist allows the reference inside the
// factory; only dereferenced inside functions invoked at test time (no TDZ).
const mockState: { create: jest.Mock } = { create: jest.fn() };
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockCtor = Anthropic as unknown as jest.Mock;

describe('AnthropicClientService', () => {
  let service: AnthropicClientService;
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(async () => {
    // jest config has resetMocks:true, so (re)establish the constructor's
    // implementation each test to return a client with a mocked messages.create.
    mockState.create = jest.fn();
    mockCtor.mockImplementation(() => ({
      messages: { create: (...args: unknown[]) => mockState.create(...args) },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [AnthropicClientService],
    }).compile();
    service = module.get(AnthropicClientService);
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });

  describe('isConfigured', () => {
    it('is true when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      expect(service.isConfigured()).toBe(true);
    });

    it('is false when ANTHROPIC_API_KEY is empty/unset', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(service.isConfigured()).toBe(false);
      process.env.ANTHROPIC_API_KEY = '';
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('complete', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    });

    it('sends the request and returns concatenated text + usage', async () => {
      mockState.create.mockResolvedValue({
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'thinking', thinking: 'ignore me' },
          { type: 'text', text: 'world' },
        ],
        usage: { input_tokens: 11, output_tokens: 22 },
        stop_reason: 'end_turn',
      });

      const result = await service.complete({
        model: 'claude-haiku-5-5',
        system: 'sys',
        user: 'hi',
        maxTokens: 500,
        effort: 'low',
      });

      expect(result).toEqual({
        text: 'Hello world',
        inputTokens: 11,
        outputTokens: 22,
        stopReason: 'end_turn',
      });

      const body = mockState.create.mock.calls[0][0];
      expect(body.model).toBe('claude-haiku-5-5');
      expect(body.max_tokens).toBe(500);
      expect(body.system).toBe('sys');
      expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
      expect(body.output_config).toEqual({ effort: 'low' });
    });

    it('omits output_config when no effort is given', async () => {
      mockState.create.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
        usage: { input_tokens: 1, output_tokens: 1 },
        stop_reason: 'end_turn',
      });
      await service.complete({
        model: 'claude-opus-5-5',
        system: 's',
        user: 'u',
        maxTokens: 100,
      });
      expect(mockState.create.mock.calls[0][0].output_config).toBeUndefined();
    });

    it('defaults token counts to 0 when usage is missing', async () => {
      mockState.create.mockResolvedValue({
        content: [{ type: 'text', text: 'x' }],
        usage: undefined,
        stop_reason: null,
      });
      const r = await service.complete({
        model: 'claude-opus-5-5',
        system: 's',
        user: 'u',
        maxTokens: 100,
      });
      expect(r.inputTokens).toBe(0);
      expect(r.outputTokens).toBe(0);
      expect(r.stopReason).toBeNull();
    });

    it('reuses a single client instance across calls', async () => {
      mockState.create.mockResolvedValue({
        content: [{ type: 'text', text: 'x' }],
        usage: { input_tokens: 1, output_tokens: 1 },
        stop_reason: 'end_turn',
      });
      mockCtor.mockClear();
      await service.complete({ model: 'm', system: 's', user: 'u', maxTokens: 10 });
      await service.complete({ model: 'm', system: 's', user: 'u', maxTokens: 10 });
      expect(mockCtor).toHaveBeenCalledTimes(1);
    });
  });
});
