/** Social providers a member can connect to their account (ACC-01, ADR 0019). */
export const SOCIAL_PROVIDERS = ['google', 'facebook', 'apple'] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

/** Every way a member can get into their account. */
export interface SignInMethods {
  /** Verified phone number: sign-in by SMS code. */
  phone: string | null;
  /** Real email address (not a placeholder): sign-in by email code. */
  email: string | null;
  hasPassword: boolean;
  providers: { providerId: SocialProvider; linkedAt: Date }[];
}

/**
 * A social account can be removed only if another way in remains: a phone or
 * email code, a password, or another social account. Nobody locks themselves out.
 */
export function canRemoveProvider(methods: SignInMethods, providerId: SocialProvider): boolean {
  if (!methods.providers.some((p) => p.providerId === providerId)) return false;
  return (
    methods.phone !== null ||
    methods.email !== null ||
    methods.hasPassword ||
    methods.providers.some((p) => p.providerId !== providerId)
  );
}
