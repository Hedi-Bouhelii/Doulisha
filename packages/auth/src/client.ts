import { anonymousClient, emailOTPClient, phoneNumberClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Browser client for the web app. It talks to /api/auth on the same origin.
 * Import from '@doulisha/auth/client' in client components only.
 */
export const authClient = createAuthClient({
  plugins: [phoneNumberClient(), emailOTPClient(), anonymousClient()],
});
