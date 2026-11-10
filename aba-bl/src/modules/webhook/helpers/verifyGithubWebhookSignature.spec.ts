import { createHmac } from 'crypto';
import { verifyGithubWebhookSignature } from './verifyGithubWebhookSignature';

function sign(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyGithubWebhookSignature', () => {
  const secret = 'super-secret';
  const bodyString = '{"ref":"refs/heads/main"}';
  const rawBody = Buffer.from(bodyString, 'utf8');

  it('returns true for a correctly signed body', () => {
    const signature = sign(bodyString, secret);

    expect(verifyGithubWebhookSignature(rawBody, signature, secret)).toBe(true);
  });

  it('returns false when the secret does not match', () => {
    const signature = sign(bodyString, 'wrong-secret');

    expect(verifyGithubWebhookSignature(rawBody, signature, secret)).toBe(false);
  });

  it('returns false when the body was tampered with', () => {
    const signature = sign(bodyString, secret);
    const tamperedBody = Buffer.from('{"ref":"refs/heads/evil"}', 'utf8');

    expect(verifyGithubWebhookSignature(tamperedBody, signature, secret)).toBe(
      false,
    );
  });

  it('returns false when rawBody is missing', () => {
    const signature = sign(bodyString, secret);

    expect(verifyGithubWebhookSignature(undefined, signature, secret)).toBe(
      false,
    );
  });

  it('returns false when the signature header is missing', () => {
    expect(verifyGithubWebhookSignature(rawBody, undefined, secret)).toBe(false);
  });

  it("returns false when the signature header doesn't start with sha256=", () => {
    expect(
      verifyGithubWebhookSignature(rawBody, 'sha1=deadbeef', secret),
    ).toBe(false);
  });

  it('returns false when the provided signature has a different length than expected', () => {
    expect(
      verifyGithubWebhookSignature(rawBody, 'sha256=deadbeef', secret),
    ).toBe(false);
  });

  it('returns false for a non-hex signature value', () => {
    expect(
      verifyGithubWebhookSignature(rawBody, 'sha256=not-hex-at-all!!', secret),
    ).toBe(false);
  });
});
