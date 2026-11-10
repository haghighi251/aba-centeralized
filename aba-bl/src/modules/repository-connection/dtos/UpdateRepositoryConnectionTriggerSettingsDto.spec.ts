import { RepositoryTriggerMode } from '@aba/database';
import { UpdateRepositoryConnectionTriggerSettingsDto } from './UpdateRepositoryConnectionTriggerSettingsDto';

describe('UpdateRepositoryConnectionTriggerSettingsDto', () => {
  it('rejects a missing triggerMode', () => {
    const result = UpdateRepositoryConnectionTriggerSettingsDto.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts INSTANT alone', () => {
    const result = UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
      triggerMode: RepositoryTriggerMode.INSTANT,
    });
    expect(result.success).toBe(true);
  });

  it('accepts PUSH_COUNT with a pushCountThreshold', () => {
    const result = UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
      triggerMode: RepositoryTriggerMode.PUSH_COUNT,
      pushCountThreshold: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects PUSH_COUNT without a pushCountThreshold', () => {
    const result = UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
      triggerMode: RepositoryTriggerMode.PUSH_COUNT,
    });
    expect(result.success).toBe(false);
  });

  it('accepts TIME_INTERVAL with an intervalDays', () => {
    const result = UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
      triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
      intervalDays: 14,
    });
    expect(result.success).toBe(true);
  });

  it('rejects TIME_INTERVAL without an intervalDays', () => {
    const result = UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
      triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid triggerMode value', () => {
    const result = UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
      triggerMode: 'NEVER',
    });
    expect(result.success).toBe(false);
  });

  describe('form field edge cases', () => {
    it('rejects a zero or negative pushCountThreshold', () => {
      for (const pushCountThreshold of [0, -1]) {
        expect(
          UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
            triggerMode: RepositoryTriggerMode.PUSH_COUNT,
            pushCountThreshold,
          }).success,
        ).toBe(false);
      }
    });

    it('rejects a fractional pushCountThreshold or intervalDays', () => {
      expect(
        UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: 1.5,
        }).success,
      ).toBe(false);
      expect(
        UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
          triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
          intervalDays: 0.5,
        }).success,
      ).toBe(false);
    });

    it('rejects a zero or negative intervalDays', () => {
      for (const intervalDays of [0, -7]) {
        expect(
          UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
            triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
            intervalDays,
          }).success,
        ).toBe(false);
      }
    });

    it('rejects numeric strings (no coercion from form input)', () => {
      expect(
        UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
          triggerMode: RepositoryTriggerMode.PUSH_COUNT,
          pushCountThreshold: '5',
        }).success,
      ).toBe(false);
    });

    it('accepts INSTANT with leftover cadence fields from a previous mode', () => {
      expect(
        UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
          triggerMode: RepositoryTriggerMode.INSTANT,
          pushCountThreshold: 3,
          intervalDays: 7,
        }).success,
      ).toBe(true);
    });

    it('reports the missing threshold / interval on the matching field path', () => {
      const push = UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
        triggerMode: RepositoryTriggerMode.PUSH_COUNT,
      });
      const interval = UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
        triggerMode: RepositoryTriggerMode.TIME_INTERVAL,
      });
      expect(push.success).toBe(false);
      expect(interval.success).toBe(false);
      if (!push.success && !interval.success) {
        expect(push.error.issues[0].path).toEqual(['pushCountThreshold']);
        expect(interval.error.issues[0].path).toEqual(['intervalDays']);
      }
    });

    it('strips unknown properties', () => {
      const result = UpdateRepositoryConnectionTriggerSettingsDto.safeParse({
        triggerMode: RepositoryTriggerMode.INSTANT,
        watchedBranch: 'evil',
        pendingPushCount: 99,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('watchedBranch');
        expect(result.data).not.toHaveProperty('pendingPushCount');
      }
    });
  });
});
