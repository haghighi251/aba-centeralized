import { CreateTeamDto } from './CreateTeamDto';

describe('CreateTeamDto', () => {
  it('accepts a minimal payload', () => {
    const result = CreateTeamDto.safeParse({ name: 'Platform' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBeUndefined();
    }
  });

  it('accepts a fully valid payload', () => {
    const result = CreateTeamDto.safeParse({
      name: 'Platform',
      slug: 'platform',
      description: 'Owns shared infrastructure services.',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = CreateTeamDto.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = CreateTeamDto.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it.each(['Platform', 'team_1', 'team 1', '-team', 'team-', 'TEAM'])(
    'rejects an invalid slug "%s"',
    (slug) => {
      const result = CreateTeamDto.safeParse({ name: 'Platform', slug });
      expect(result.success).toBe(false);
    },
  );

  it('accepts a valid hyphenated slug', () => {
    const result = CreateTeamDto.safeParse({
      name: 'Growth Team',
      slug: 'growth-team',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a description longer than 500 characters', () => {
    const result = CreateTeamDto.safeParse({
      name: 'Platform',
      description: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
