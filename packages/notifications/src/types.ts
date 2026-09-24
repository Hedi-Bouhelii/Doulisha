export interface SmsMessage {
  to: string;
  body: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Sends SMS (OTP and critical reminders). Real providers arrive in Phase 6. */
export interface SmsSender {
  send(message: SmsMessage): Promise<void>;
}

/** Sends transactional email (Resend + React Email in Phase 6). */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export type OutboxEntry =
  | ({ channel: 'sms'; sentAt: string } & SmsMessage)
  | ({ channel: 'email'; sentAt: string } & EmailMessage);
