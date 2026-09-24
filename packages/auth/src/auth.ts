import type { HttpDb } from '@doulisha/db';
import { schema } from '@doulisha/db';
import type { EmailSender, SmsSender } from '@doulisha/notifications';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { anonymous, magicLink, phoneNumber } from 'better-auth/plugins';
import { and, eq, inArray } from 'drizzle-orm';

/** Placeholder address for phone-only accounts; `.invalid` can never receive mail. */
export const phoneEmailDomain = 'phone.doulisha.invalid';
export const guestEmailDomain = 'guest.doulisha.invalid';

const E164 = /^\+[1-9]\d{7,14}$/;

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface CreateAuthOptions {
  db: HttpDb;
  secret: string;
  baseURL: string;
  sms: SmsSender;
  email: EmailSender;
  /** Each social provider is enabled only when its credentials are set. */
  social?: { google?: OAuthCredentials; facebook?: OAuthCredentials; apple?: OAuthCredentials };
  /** Rate limits on auth endpoints; on in production, off for local runs and E2E tests. */
  rateLimit?: boolean;
}

/**
 * Better Auth for Doulisha (ADR 0003, ADR 0010).
 * ACC-01: phone OTP, email magic link, Google, Facebook, Apple, and guest
 * sessions for RSVP without an account.
 */
export function createAuth({
  db,
  secret,
  baseURL,
  sms,
  email,
  social = {},
  rateLimit = true,
}: CreateAuthOptions) {
  return betterAuth({
    appName: 'Doulisha',
    secret,
    baseURL,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.authTokens,
      },
    }),
    advanced: {
      cookiePrefix: 'doulisha',
      // Postgres generates UUID v7 ids (ADR 0007).
      database: { generateId: false },
    },
    // No passwords: phone OTP, magic link and social sign-in only.
    emailAndPassword: { enabled: false },
    socialProviders: {
      ...(social.google && { google: social.google }),
      ...(social.facebook && { facebook: social.facebook }),
      ...(social.apple && { apple: social.apple }),
    },
    account: {
      accountLinking: { enabled: true, trustedProviders: ['google', 'facebook', 'apple'] },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // Rate limiting on auth (BUILD_PROMPT section 7). In-memory for now; a
    // shared store is needed once several server instances run (Phase 6).
    rateLimit: {
      enabled: rateLimit,
      window: 60,
      max: 100,
      customRules: {
        '/phone-number/send-otp': { window: 60, max: 3 },
        '/phone-number/verify': { window: 60, max: 10 },
        '/sign-in/magic-link': { window: 60, max: 3 },
        '/sign-in/anonymous': { window: 60, max: 10 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          // ACC-02: every account gets a profile row with default privacy settings.
          after: async (user) => {
            await db.insert(schema.profiles).values({ userId: user.id }).onConflictDoNothing();
          },
        },
      },
    },
    plugins: [
      phoneNumber({
        phoneNumberValidator: (value) => E164.test(value),
        sendOTP: async ({ phoneNumber: to, code }) => {
          await sms.send({ to, body: `Doulisha: ${code}` });
        },
        signUpOnVerification: {
          getTempEmail: (value) => `${value.replace('+', '')}@${phoneEmailDomain}`,
          getTempName: (value) => value,
        },
      }),
      magicLink({
        expiresIn: 15 * 60,
        sendMagicLink: async ({ email: to, url }) => {
          await email.send({
            to,
            subject: 'Doulisha: your sign-in link / votre lien de connexion',
            text: `Sign in to Doulisha / Connexion à Doulisha / تسجيل الدخول:\n${url}\n\nThis link expires in 15 minutes.`,
          });
        },
      }),
      anonymous({
        emailDomainName: guestEmailDomain,
        // A guest who RSVPed and then creates an account keeps their RSVPs.
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          const guestId = anonymousUser.user.id;
          const memberId = newUser.user.id;
          const existing = await db
            .select({ eventId: schema.rsvps.eventId })
            .from(schema.rsvps)
            .where(eq(schema.rsvps.userId, memberId));
          const taken = existing.map((r) => r.eventId);
          if (taken.length > 0) {
            await db
              .delete(schema.rsvps)
              .where(and(eq(schema.rsvps.userId, guestId), inArray(schema.rsvps.eventId, taken)));
          }
          await db
            .update(schema.rsvps)
            .set({ userId: memberId })
            .where(eq(schema.rsvps.userId, guestId));
        },
      }),
      // Must stay last: lets server actions set auth cookies in Next.js.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth['$Infer']['Session'];
export type AuthUser = AuthSession['user'];
