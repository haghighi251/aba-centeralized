import { TeamStatus } from '@aba/database';
import { UpdateTeamDto } from './UpdateTeamDto';

describe('UpdateTeamDto', () => {
  it('accepts an empty payload since all fields are optional', () => {
    const result = UpdateTeamDto.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a fully valid payload', () => {
    const result = UpdateTeamDto.safeParse({
      name: 'Growth',
      slug: 'growth',
      description: 'Owns growth experiments.',
      status: TeamStatus.ARCHIVED,
    });

    expect(result.success).toBe(true);
  });

  it('allows description to be cleared with null', () => {
    const result = UpdateTeamDto.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid slug', () => {
    const result = UpdateTeamDto.safeParse({ slug: 'Not Valid!' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = UpdateTeamDto.safeParse({ status: 'DELETED' });
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = UpdateTeamDto.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });
});
