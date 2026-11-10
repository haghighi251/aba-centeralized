import {
  buildExplainPrompt,
  buildImprovePrompt,
  buildSuggestPrompt,
  extractJson,
  SuggestPageContext,
} from './prompts';

const pageCtx: SuggestPageContext = {
  name: 'Login',
  pageType: 'LOGIN',
  method: 'POST',
  pathOrUrl: '/login',
  authKind: 'BEARER_TOKEN',
  accessConfig: { expectedStatusWithoutAuth: 401 },
  existingTestNames: ['SQL injection probe'],
};

describe('prompts', () => {
  describe('extractJson', () => {
    it('parses a plain JSON object', () => {
      expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    });

    it('parses JSON inside a ```json fenced block', () => {
      const text = 'Here you go:\n```json\n{"suggestions":[]}\n```\nThanks!';
      expect(extractJson(text)).toEqual({ suggestions: [] });
    });

    it('parses JSON inside a bare ``` fenced block', () => {
      expect(extractJson('```\n{"x":true}\n```')).toEqual({ x: true });
    });

    it('extracts the first object span from surrounding prose', () => {
      const text = 'Sure! {"summary":"ok","perTest":[]} — hope that helps.';
      expect(extractJson(text)).toEqual({ summary: 'ok', perTest: [] });
    });

    it('extracts an array span', () => {
      expect(extractJson('result: [1,2,3]')).toEqual([1, 2, 3]);
    });

    it('returns null when nothing parses', () => {
      expect(extractJson('no json here at all')).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(extractJson('')).toBeNull();
    });
  });

  describe('buildSuggestPrompt', () => {
    it('includes the page context and the requested count in the user prompt', () => {
      const { system, user } = buildSuggestPrompt(pageCtx, 4, 'focus on CSRF');
      expect(user).toContain('Suggest 4');
      expect(user).toContain('LOGIN');
      expect(user).toContain('/login');
      expect(user).toContain('focus on CSRF');
      // must not repeat existing tests
      expect(user).toContain('SQL injection probe');
      // system instructs JSON-only output
      expect(system).toContain('suggestions');
    });

    it('omits the guidance line when no instructions are given', () => {
      const { user } = buildSuggestPrompt(pageCtx, 5);
      expect(user).not.toContain('Extra guidance');
    });
  });

  describe('buildExplainPrompt', () => {
    it('summarises run totals and per-test results', () => {
      const { system, user } = buildExplainPrompt(
        {
          status: 'FAILED',
          trigger: 'MANUAL',
          totalCount: 2,
          passedCount: 1,
          failedCount: 1,
          errorCount: 0,
        },
        [
          {
            name: 'test A',
            status: 'PASSED',
            request: { method: 'POST' },
            response: { status: 200 },
            assertionResults: [{ passed: true }],
            errorMessage: null,
          },
          {
            name: 'test B',
            status: 'FAILED',
            request: {},
            response: { status: 500 },
            assertionResults: [{ passed: false }],
            errorMessage: 'boom',
          },
        ],
      );
      expect(user).toContain('FAILED');
      expect(user).toContain('test A');
      expect(user).toContain('test B');
      expect(user).toContain('boom');
      expect(system).toContain('recommendations');
    });
  });

  describe('buildImprovePrompt', () => {
    it('includes the current test config and page context', () => {
      const { system, user } = buildImprovePrompt(
        pageCtx,
        {
          name: 'Login check',
          type: 'CUSTOM_API',
          config: { method: 'POST' },
          assertions: { status: 200 },
        },
        'add a no-token scenario',
      );
      expect(user).toContain('Login check');
      expect(user).toContain('CUSTOM_API');
      expect(user).toContain('add a no-token scenario');
      expect(system).toContain('improved');
    });
  });
});
