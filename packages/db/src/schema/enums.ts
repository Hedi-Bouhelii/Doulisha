import { pgEnum } from 'drizzle-orm/pg-core';

/** Global roles held by one account (spec section 5, ACC-05). Hosting a private event needs no role. */
export const userRole = pgEnum('user_role', [
  'participant',
  'organizer',
  'provider',
  'brand',
  'admin',
]);

export const locale = pgEnum('locale', ['ar', 'fr', 'en']);

/** ACC-06 privacy settings. */
export const profileVisibility = pgEnum('profile_visibility', ['public', 'friends', 'private']);
export const inviteAudience = pgEnum('invite_audience', ['everyone', 'friends', 'nobody']);

export const legalStatus = pgEnum('legal_status', ['association', 'company', 'independent']);

/** PRV-02 provider types. */
export const providerType = pgEnum('provider_type', [
  'venue',
  'catering',
  'decoration',
  'dj_sound',
  'photo_video',
  'animator',
  'transport',
  'guide_coach',
  'gear_rental',
  'lodging',
  'insurance',
]);

/** ACC-04 documents. */
export const verificationDocument = pgEnum('verification_document', [
  'national_id',
  'jort',
  'rne',
  'tourism_licence',
]);
export const reviewStatus = pgEnum('review_status', ['pending', 'approved', 'rejected']);

export const notificationChannel = pgEnum('notification_channel', ['push', 'email', 'sms']);

// --- Social ---------------------------------------------------------------
export const friendshipStatus = pgEnum('friendship_status', ['pending', 'accepted', 'declined']);
export const followTarget = pgEnum('follow_target', ['user', 'organizer', 'provider']);
export const reactionTarget = pgEnum('reaction_target', ['post', 'comment', 'media']);
export const reactionKind = pgEnum('reaction_kind', ['like', 'love', 'fire', 'clap', 'haha']);
export const mediaKind = pgEnum('media_kind', ['image', 'video', 'document', 'gpx']);
export const storageBucket = pgEnum('storage_bucket', ['public', 'private']);
export const reportTarget = pgEnum('report_target', [
  'event',
  'post',
  'comment',
  'user',
  'organizer',
  'provider',
]);
export const reportStatus = pgEnum('report_status', ['open', 'reviewing', 'actioned', 'dismissed']);

// --- Events (spec section 6) ----------------------------------------------
/** The four event models (6.1). */
export const eventModel = pgEnum('event_model', [
  'ticketed',
  'group_trip',
  'private',
  'slot_booking',
]);

/**
 * Lifecycle (6.3). Private events reuse it: `published` means "invitations sent",
 * `ongoing` means "happening".
 */
export const eventStatus = pgEnum('event_status', [
  'draft',
  'published',
  'full',
  'closed',
  'ongoing',
  'completed',
  'cancelled',
]);

/** EVT-03. `community` visibility arrives with communities in V1. */
export const eventVisibility = pgEnum('event_visibility', ['public', 'unlisted', 'private']);

/** EVT-05. */
export const cancellationPolicy = pgEnum('cancellation_policy', ['flexible', 'moderate', 'strict']);

/** TKT-01. */
export const registrationType = pgEnum('registration_type', [
  'free_rsvp',
  'paid',
  'deposit',
  'pay_at_door',
]);

/** TKT-02. */
export const ticketKind = pgEnum('ticket_kind', [
  'standard',
  'early_bird',
  'vip',
  'student',
  'couple',
  'group',
]);

export const questionType = pgEnum('question_type', ['text', 'select', 'number']);

/** RSVP states (6.4). */
export const rsvpStatus = pgEnum('rsvp_status', ['invited', 'seen', 'going', 'maybe', 'not_going']);
export const invitationChannel = pgEnum('invitation_channel', ['link', 'friend', 'contact']);

// --- Commerce ---------------------------------------------------------------
export const orderKind = pgEnum('order_kind', [
  'ticket',
  'slot',
  'provider_deposit',
  'contribution',
]);
export const orderSource = pgEnum('order_source', ['online', 'manual']);
export const orderStatus = pgEnum('order_status', [
  'pending',
  'awaiting_payment',
  'partially_paid',
  'paid',
  'cancelled',
  'refunded',
  'expired',
]);

/** A booking holds places; `held` expires unless paid or confirmed (NFR peak load). */
export const bookingStatus = pgEnum('booking_status', [
  'held',
  'confirmed',
  'waitlisted',
  'offered',
  'cancelled',
  'expired',
]);

export const paymentProvider = pgEnum('payment_provider', ['mock', 'manual', 'konnect', 'flouci']);
export const paymentMethod = pgEnum('payment_method', [
  'card',
  'e_dinar',
  'd17',
  'cash',
  'bank_transfer',
]);
export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
]);
export const refundStatus = pgEnum('refund_status', [
  'requested',
  'approved',
  'rejected',
  'processed',
]);
export const ledgerDirection = pgEnum('ledger_direction', ['debit', 'credit']);
export const payoutStatus = pgEnum('payout_status', ['pending', 'paid', 'failed']);

/** Plans from spec section 10.2. */
export const subscriptionPlan = pgEnum('subscription_plan', [
  'free',
  'starter',
  'per_event',
  'pro',
  'provider_pro',
  'club',
]);
export const subscriptionStatus = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired',
]);
export const discountKind = pgEnum('discount_kind', ['percent', 'amount']);
