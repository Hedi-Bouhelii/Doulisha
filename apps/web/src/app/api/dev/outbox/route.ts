import { clearOutbox, readOutbox } from '@doulisha/notifications';

/**
 * Development only: the mock SMS and emails (OTP codes, magic links), read by
 * the dev outbox page and the E2E tests. Returns 404 in production.
 */
function isEnabled() {
  return process.env.NODE_ENV !== 'production';
}

export function GET() {
  if (!isEnabled()) return new Response('Not found', { status: 404 });
  return Response.json({ messages: readOutbox() }, { headers: { 'cache-control': 'no-store' } });
}

export function DELETE() {
  if (!isEnabled()) return new Response('Not found', { status: 404 });
  clearOutbox();
  return new Response(null, { status: 204 });
}
