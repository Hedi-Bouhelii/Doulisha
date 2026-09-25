'use client';

import { authClient } from '@doulisha/auth/client';

/**
 * Makes sure the visitor has a session before booking or answering an
 * invitation. Visitors without an account get a guest (anonymous) session;
 * signing up later keeps their bookings and RSVPs (ADR 0010).
 */
export async function ensureSession(): Promise<void> {
  const { data } = await authClient.getSession();
  if (data?.session) return;
  const { error } = await authClient.signIn.anonymous();
  if (error) throw new Error(error.message ?? 'Could not start a guest session');
}
