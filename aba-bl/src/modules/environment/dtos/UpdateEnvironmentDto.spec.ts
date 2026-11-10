import { EnvironmentType, EnvironmentStatus } from '@aba/database';
import { UpdateEnvironmentDto } from './UpdateEnvironmentDto';

describe('UpdateEnvironmentDto', () => {
  it('accepts an empty payload since all fields are optional', () => {
    const result = UpdateEnvironmentDto.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a fully valid payload', () => {
    const result = UpdateEnvironmentDto.safeParse({
      teamId: 2,
      name: 'Staging',
      slug: 'staging',
      type: EnvironmentType.STAGING,
      isProduction: false,
      order: 3,
      description: 'Pre-production staging environment.',
      status: EnvironmentStatus.ARCHIVED,
    });

    expect(result.success).toBe(true);
  });

  it('allows description to be cleared with null', () => {
    const result = UpdateEnvironmentDto.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid slug', () => {
    const result = UpdateEnvironmentDto.safeParse({ slug: 'Not Valid!' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid type', () => {
    const result = UpdateEnvironmentDto.safeParse({ type: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = UpdateEnvironmentDto.safeParse({ status: 'DELETED' });
    expect(result.success).toBe(false);
  });

  it.each([0, -1, 1001])('rejects an invalid order value %s', (order) => {
    const result = UpdateEnvironmentDto.safeParse({ order });
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = UpdateEnvironmentDto.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it.each([0, -1, 1.5])('rejects an invalid teamId value %s', (teamId) => {
    const result = UpdateEnvironmentDto.safeParse({ teamId });
    expect(result.success).toBe(false);
  });
});
