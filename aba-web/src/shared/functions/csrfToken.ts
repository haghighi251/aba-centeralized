export async function generateCsrfToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const csrfToken = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(process.env.CSRF_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(csrfToken));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${csrfToken}.${signatureHex}`;
}
