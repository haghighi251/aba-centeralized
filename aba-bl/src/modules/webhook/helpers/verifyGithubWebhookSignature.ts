import { createHmac, timingSafeEqual } from 'crypto';

const SIGNATURE_PREFIX = 'sha256=';

/**
 * Verifies GitHub's `X-Hub-Signature-256` header: HMAC-SHA256 of the exact
 * raw request body, keyed by the connection's webhook secret. Must be
 * computed over the raw bytes GitHub signed (req.rawBody), never a
 * re-serialized req.body, or legitimate deliveries can fail to match.
 */
export function verifyGithubWebhookSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!rawBody || !signatureHeader?.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const expectedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const computedHex = createHmac('sha256', secret).update(rawBody).digest('hex');

  const expected = Buffer.from(expectedHex, 'hex');
  const computed = Buffer.from(computedHex, 'hex');

  if (expected.length !== computed.length) {
    return false;
  }

  return timingSafeEqual(expected, computed);
}
