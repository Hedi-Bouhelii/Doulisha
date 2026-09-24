import { CheckCircle2 } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

import { initials } from './friends-going';

export type PaymentState = 'paid' | 'deposit' | 'pending' | 'refunded';

const stateClasses: Record<PaymentState, string> = {
  paid: 'bg-cat-outdoor-bg text-cat-outdoor-fg',
  deposit: 'bg-cat-sports-bg text-cat-sports-fg',
  pending: 'bg-highlight-soft text-highlight',
  refunded: 'bg-muted text-muted-foreground',
};

/**
 * One line of the organizer's attendee list (PRT-01): who, which ticket,
 * payment status and check-in. Labels are passed in already translated.
 */
export function AttendeeRow({
  name,
  ticket,
  phone,
  payment,
  paymentLabel,
  checkedIn,
  checkedInLabel,
}: {
  name: string;
  ticket: string;
  phone?: string | null;
  payment: PaymentState;
  paymentLabel: string;
  checkedIn: boolean;
  checkedInLabel: string;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-border py-2 last:border-b-0">
      <Avatar className="size-9">
        <AvatarFallback className="bg-secondary text-xs font-semibold">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {ticket}
          {phone ? (
            <>
              {' · '}
              <span className="ltr-nums">{phone}</span>
            </>
          ) : null}
        </p>
      </div>
      <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', stateClasses[payment])}>
        {paymentLabel}
      </span>
      {checkedIn ? (
        <CheckCircle2 className="size-5 text-success" aria-label={checkedInLabel} />
      ) : null}
    </div>
  );
}
