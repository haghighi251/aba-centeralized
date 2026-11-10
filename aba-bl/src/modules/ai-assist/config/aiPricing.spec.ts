import { AiAssistFeature } from '@aba/database';
import {
  costMicroUsd,
  FEATURE_MODELS,
  MODEL_PRICING,
  tokenMargin,
} from './aiPricing';

describe('aiPricing', () => {
  describe('costMicroUsd', () => {
    it('computes micro-USD from input/output tokens for a known model', () => {
      // haiku: input 0.1 $/M, output 0.5 $/M -> 1000*0.1 + 1000*0.5 = 600
      expect(costMicroUsd('claude-haiku-5-5', 1000, 1000)).toBe(600);
    });

    it('computes micro-USD for opus pricing', () => {
      // opus: input 4 $/M, output 20 $/M -> 500*4 + 100*20 = 2000 + 2000 = 4000
      expect(costMicroUsd('claude-opus-5-5', 500, 100)).toBe(4000);
    });

    it('rounds to the nearest micro-USD', () => {
      // haiku: 3*0.1 + 0*0.5 = 0.3 -> rounds to 0
      expect(costMicroUsd('claude-haiku-5-5', 3, 0)).toBe(0);
      // haiku: 7*0.1 = 0.7 -> rounds to 1
      expect(costMicroUsd('claude-haiku-5-5', 7, 0)).toBe(1);
    });

    it('returns 0 for an unknown model', () => {
      expect(costMicroUsd('some-unknown-model', 1000, 1000)).toBe(0);
    });

    it('returns 0 when there is no usage', () => {
      expect(costMicroUsd('claude-opus-5-5', 0, 0)).toBe(0);
    });
  });

  describe('tokenMargin', () => {
    const original = process.env.AI_TOKEN_MARGIN;
    afterEach(() => {
      if (original === undefined) delete process.env.AI_TOKEN_MARGIN;
      else process.env.AI_TOKEN_MARGIN = original;
    });

    it('defaults to 0.6 when unset', () => {
      delete process.env.AI_TOKEN_MARGIN;
      expect(tokenMargin()).toBe(0.6);
    });

    it('reads a valid value from the environment', () => {
      process.env.AI_TOKEN_MARGIN = '0.8';
      expect(tokenMargin()).toBe(0.8);
    });

    it('falls back to 0.6 for a non-numeric value', () => {
      process.env.AI_TOKEN_MARGIN = 'not-a-number';
      expect(tokenMargin()).toBe(0.6);
    });

    it('falls back to 0.6 for a negative value', () => {
      process.env.AI_TOKEN_MARGIN = '-1';
      expect(tokenMargin()).toBe(0.6);
    });

    it('accepts 0 as a valid margin', () => {
      process.env.AI_TOKEN_MARGIN = '0';
      expect(tokenMargin()).toBe(0);
    });
  });

  describe('FEATURE_MODELS routing', () => {
    it('routes bulk suggestions to the cheap Haiku model', () => {
      expect(FEATURE_MODELS[AiAssistFeature.SUGGEST_TESTS].model).toBe(
        'claude-haiku-5-5',
      );
    });

    it('routes explain and improve to Opus', () => {
      expect(FEATURE_MODELS[AiAssistFeature.EXPLAIN_RUN].model).toBe(
        'claude-opus-5-5',
      );
      expect(FEATURE_MODELS[AiAssistFeature.IMPROVE_TEST].model).toBe(
        'claude-opus-5-5',
      );
    });

    it('defines a positive output cap for every feature', () => {
      for (const feature of Object.values(AiAssistFeature)) {
        expect(FEATURE_MODELS[feature].maxOutputTokens).toBeGreaterThan(0);
      }
    });

    it('prices every routed model', () => {
      for (const feature of Object.values(AiAssistFeature)) {
        expect(MODEL_PRICING[FEATURE_MODELS[feature].model]).toBeDefined();
      }
    });
  });
});
