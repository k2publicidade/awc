import assert from 'node:assert/strict';
import test from 'node:test';
import { storeUpload } from './storage';

test('does not try to create the bucket when Supabase rejects the service credential', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project-ref.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'invalid-service-role-key';

  const requests: Array<{ input: string; method: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    requests.push({ input: String(input), method: init?.method || 'GET' });
    return new Response(
      JSON.stringify({
        statusCode: '403',
        error: 'Unauthorized',
        message: 'signature verification failed',
        code: 'AccessDenied',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        storeUpload(
          'tenant/rdo/photo.jpg',
          new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
        ),
      /credencial do Supabase Storage foi rejeitada/i
    );
    assert.deepEqual(
      requests.map(({ method }) => method),
      ['GET']
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
