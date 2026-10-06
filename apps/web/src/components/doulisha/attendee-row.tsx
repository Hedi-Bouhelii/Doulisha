import { CheckCircle2 } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import { initials } from './friends-going';
import { toneOf } from './status-badge';

export type PaymentState = 'paid' | 'deposit' | 'pending' | 'refunded';

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
    <div className="flex min-h-14 items-center gap-3 border-b border-border/70 py-2.5 last:border-b-0">
      <Avatar className="size-10">
        <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
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
      <Badge variant={toneOf(payment)} dot>
        {paymentLabel}
      </Badge>
      {checkedIn ? (
        <CheckCircle2 className="size-5 text-success" aria-label={checkedInLabel} />
      ) : null}
    </div>
  );
}
