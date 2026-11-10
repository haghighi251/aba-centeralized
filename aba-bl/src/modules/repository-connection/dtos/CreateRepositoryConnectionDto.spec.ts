import { RepositoryProvider, RepositoryTriggerMode } from '@aba/database';
import { CreateRepositoryConnectionDto } from './CreateRepositoryConnectionDto';

describe('CreateRepositoryConnectionDto', () => {
  it('accepts a minimal payload and defaults watchedBranch to main', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: 'acme',
      name: 'billing-api',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.watchedBranch).toBe('main');
      expect(result.data.triggerMode).toBeUndefined();
    }
  });

  it('accepts an explicit watchedBranch', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: 'acme',
      name: 'billing-api',
      watchedBranch: 'dev',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.watchedBranch).toBe('dev');
    }
  });

  it('rejects a missing owner', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      name: 'billing-api',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty owner', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: '',
      name: 'billing-api',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing name', () => {
    const result = CreateRepositoryConnectionDto.safeParse({ owner: 'acme' });
    expect(result.success).toBe(false);
  });

  it('rejects an owner longer than 255 characters', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: 'a'.repeat(256),
      name: 'billing-api',
    });
    expect(result.success).toBe(false);
  });

  it('accepts triggerMode INSTANT with no other cadence fields', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: 'acme',
      name: 'billing-api',
      triggerMode: RepositoryTriggerMode.INSTANT,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid triggerMode value', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: 'acme',
      name: 'billing-api',
      triggerMode: 'SOMETIMES',
    });
    expect(result.success).toBe(false);
  });

  it('accepts triggerMode PUSH_COUNT with a pushCountThreshold', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: 'acme',
      name: 'billing-api',
      triggerMode: RepositoryTriggerMode.PUSH_COUNT,
      pushCountThreshold: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects triggerMode PUSH_COUNT without a pushCountThreshold', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: 'acme',
      name: 'billing-api',
      triggerMode: RepositoryTriggerMode.PUSH_COUNT,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['pushCountThreshold']);
    }
  });

  it('rejects a zero or negative pushCountThreshold', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: 'acme',
      name: 'billing-api',
      triggerMode: RepositoryTriggerMode.PUSH_COUNT,
      pushCountThreshold: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts triggerMode TIME_INTERVAL with an intervalDays', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: 'acme',
      name: 'billing-api',
      triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
      intervalDays: 7,
    });
    expect(result.success).toBe(true);
  });

  it('rejects triggerMode TIME_INTERVAL without an intervalDays', () => {
    const result = CreateRepositoryConnectionDto.safeParse({
      owner: 'acme',
      name: 'billing-api',
      triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['intervalDays']);
    }
  });

  describe('form field edge cases', () => {
    const base = { owner: 'acme', name: 'billing-api' };

    it('accepts an owner of exactly 255 characters', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          owner: 'a'.repeat(255),
        }).success,
      ).toBe(true);
    });

    it('rejects a repository name longer than 255 characters', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          name: 'a'.repeat(256),
        }).success,
      ).toBe(false);
    });

    it('rejects an empty repository name', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({ ...base, name: '' }).success,
      ).toBe(false);
    });

    it('rejects an empty watchedBranch instead of silently falling back to main', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          watchedBranch: '',
        }).success,
      ).toBe(false);
    });

    it('rejects a watchedBranch longer than 255 characters', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          watchedBranch: 'b'.repeat(256),
        }).success,
      ).toBe(false);
    });

    it('accepts a branch name containing slashes', () => {
      const result = CreateRepositoryConnectionDto.safeParse({
        ...base,
        watchedBranch: 'release/2024-q4',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.watchedBranch).toBe('release/2024-q4');
      }
    });

    it('rejects non-string owner and name values', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({ ...base, owner: 42 }).success,
      ).toBe(false);
      expect(
        CreateRepositoryConnectionDto.safeParse({ ...base, name: null })
          .success,
      ).toBe(false);
    });

    it('rejects a non-integer pushCountThreshold', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: 2.5,
        }).success,
      ).toBe(false);
    });

    it('rejects a numeric string for pushCountThreshold (no coercion)', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: '5',
        }).success,
      ).toBe(false);
    });

    it('rejects a zero, negative or fractional intervalDays', () => {
      for (const intervalDays of [0, -3, 1.5]) {
        expect(
          CreateRepositoryConnectionDto.safeParse({
            ...base,
            triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
            intervalDays,
          }).success,
        ).toBe(false);
      }
    });

    it('reports the missing threshold on the pushCountThreshold field path', () => {
      const result = CreateRepositoryConnectionDto.safeParse({
        ...base,
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['pushCountThreshold']);
      }
    });

    it('reports the missing interval on the intervalDays field path', () => {
      const result = CreateRepositoryConnectionDto.safeParse({
        ...base,
        triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['intervalDays']);
      }
    });

    it('accepts INSTANT together with unused cadence fields', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          triggerMode: RepositoryTriggerMode.INSTANT,
          pushCountThreshold: 3,
          intervalDays: 2,
        }).success,
      ).toBe(true);
    });

    it('accepts a threshold without a triggerMode (the mode default is computed later)', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          pushCountThreshold: 3,
        }).success,
      ).toBe(true);
    });

    it('strips unknown properties such as a client-supplied webhookSecret or status', () => {
      const result = CreateRepositoryConnectionDto.safeParse({
        ...base,
        webhookSecret: 'attacker-chosen',
        status: 'PAUSED',
        serviceId: 999,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('webhookSecret');
        expect(result.data).not.toHaveProperty('status');
        expect(result.data).not.toHaveProperty('serviceId');
      }
    });

    it('rejects a lowercase triggerMode value', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          triggerMode: 'instant',
        }).success,
      ).toBe(false);
    });
  });

  describe('provider selection', () => {
    const base = { owner: 'acme', name: 'billing-api' };

    it('defaults to GITHUB when the provider is omitted (backwards compatible)', () => {
      const result = CreateRepositoryConnectionDto.safeParse(base);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe(RepositoryProvider.GITHUB);
      }
    });

    it('accepts GITHUB and BITBUCKET', () => {
      for (const provider of ['GITHUB', 'BITBUCKET']) {
        const result = CreateRepositoryConnectionDto.safeParse({
          ...base,
          provider,
        });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.provider).toBe(provider);
      }
    });

    it('rejects unsupported or wrongly-cased providers', () => {
      for (const provider of ['GITLAB', 'bitbucket', 'Bitbucket', '', null, 1]) {
        expect(
          CreateRepositoryConnectionDto.safeParse({ ...base, provider }).success,
        ).toBe(false);
      }
    });

    it('applies the same cadence rules to Bitbucket connections', () => {
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          provider: 'BITBUCKET',
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
        }).success,
      ).toBe(false);
      expect(
        CreateRepositoryConnectionDto.safeParse({
          ...base,
          provider: 'BITBUCKET',
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: 4,
        }).success,
      ).toBe(true);
    });
  });
});
