export interface LedgerLine {
  account: string;
  direction: 'debit' | 'credit';
  amountMillimes: number;
}

/** Accounts: who holds or owes the money (double-entry bookkeeping). */
export const accounts = {
  gateway: (provider: string) => `gateway:${provider}`,
  organizer: (id: string) => `organizer:${id}`,
  /** Money collected by the organizer directly (cash, transfer, D17). */
  collectedDirectly: (id: string) => `organizer:${id}:direct`,
} as const;

/**
 * Entries for a payment. Online: the gateway holds the money on behalf of the
 * organizer. Offline: the organizer already has it. Platform fees are added
 * with the pricing plans (ORG-02); for now everything is owed to the organizer.
 */
export function paymentEntries({
  provider,
  organizerKey,
  amountMillimes,
}: {
  provider: string;
  organizerKey: string;
  amountMillimes: number;
}): LedgerLine[] {
  const debitAccount =
    provider === 'manual' ? accounts.collectedDirectly(organizerKey) : accounts.gateway(provider);
  return [
    { account: debitAccount, direction: 'debit', amountMillimes },
    { account: accounts.organizer(organizerKey), direction: 'credit', amountMillimes },
  ];
}

/** Entries for a refund: the exact reverse of a payment. */
export function refundEntries(args: {
  provider: string;
  organizerKey: string;
  amountMillimes: number;
}): LedgerLine[] {
  return paymentEntries(args).map((line) => ({
    ...line,
    direction: line.direction === 'debit' ? 'credit' : 'debit',
  }));
}

/** A transaction balances when debits equal credits. */
export function isBalanced(lines: readonly LedgerLine[]): boolean {
  let total = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.amountMillimes) || line.amountMillimes <= 0) return false;
    total += line.direction === 'debit' ? line.amountMillimes : -line.amountMillimes;
  }
  return total === 0;
}
