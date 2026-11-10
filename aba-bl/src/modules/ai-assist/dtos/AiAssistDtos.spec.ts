import {
  GrantAiTokensDto,
  ImproveTestDto,
  SuggestTestsDto,
} from './AiAssistDtos';

describe('AiAssistDtos', () => {
  describe('SuggestTestsDto', () => {
    it('defaults count to 5', () => {
      const parsed = SuggestTestsDto.parse({});
      expect(parsed.count).toBe(5);
    });

    it('accepts a count within 1..8 and optional instructions', () => {
      expect(SuggestTestsDto.parse({ count: 8, instructions: 'x' })).toEqual({
        count: 8,
        instructions: 'x',
      });
    });

    it('rejects a count above 8', () => {
      expect(() => SuggestTestsDto.parse({ count: 9 })).toThrow();
    });

    it('rejects unknown keys (strict)', () => {
      expect(() => SuggestTestsDto.parse({ foo: 1 } as any)).toThrow();
    });
  });

  describe('ImproveTestDto', () => {
    it('allows an empty body', () => {
      expect(ImproveTestDto.parse({})).toEqual({});
    });

    it('rejects instructions longer than 1000 chars', () => {
      expect(() => ImproveTestDto.parse({ instructions: 'a'.repeat(1001) })).toThrow();
    });
  });

  describe('GrantAiTokensDto', () => {
    it('defaults pricePaidUsd to 0', () => {
      const parsed = GrantAiTokensDto.parse({ companyId: 1, tokens: 1000 });
      expect(parsed.pricePaidUsd).toBe(0);
    });

    it('requires a positive integer token amount', () => {
      expect(() => GrantAiTokensDto.parse({ companyId: 1, tokens: 0 })).toThrow();
      expect(() => GrantAiTokensDto.parse({ companyId: 1, tokens: -5 })).toThrow();
    });

    it('requires a positive companyId', () => {
      expect(() => GrantAiTokensDto.parse({ companyId: 0, tokens: 100 })).toThrow();
    });
  });
});
