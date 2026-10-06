'use client';

import { formatEventDateTime, formatPrice, formatTime, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSearch,
  Hourglass,
  Mail,
  Phone,
  Plus,
  Search,
  StickyNote,
  Ticket,
  Undo2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Field, NativeSelect } from '@/components/doulisha/form-field';
import { initials } from '@/components/doulisha/friends-going';
import { MarkPaidDialog, PaymentsInbox, ReceiptReview } from '@/components/doulisha/payments-inbox';
import { toneOf } from '@/components/doulisha/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';
import type { RouterOutputs } from '@/trpc/types';

type Attendee = RouterOutputs['organizer']['attendees'][number];
type Inbox = RouterOutputs['organizer']['payments'];
type Method = 'cash' | 'bank_transfer' | 'd17';

/** Attendees, waitlist and items to review, with the organizer's actions (PRT-01..04). */
export function ManagePanel({
  eventId,
  attendees,
  tickets,
  questions,
  locked,
  inbox,
}: {
  eventId: string;
  attendees: Attendee[];
  tickets: { id: string; name: string }[];
  /** Booking questions, to show answers with their label. */
  questions: Record<string, string>;
  locked: boolean;
  /** This event's payments inbox (ADR 0018). */
  inbox: Inbox;
}) {
  const t = useTranslations('Organizer');
  const tPayments = useTranslations('Payments');
  const [query, setQuery] = useState('');

  const booked = attendees.filter((a) => a.payment !== 'waitlisted');
  const waitlist = attendees
    .filter((a) => a.payment === 'waitlisted')
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));
  const refunds = useMemo(() => {
    const seen = new Set<string>();
    return attendees.filter((a) => {
      if (seen.has(a.orderId)) return false;
      seen.add(a.orderId);
      return a.refundRequests.length > 0;
    });
  }, [attendees]);
  const openPayments = inbox.toVerify.length + inbox.awaiting.length;

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? booked.filter(
        (a) => a.fullName.toLowerCase().includes(needle) || (a.phone ?? '').includes(needle),
      )
    : booked;

  return (
    <Tabs
      defaultValue="attendees"
      className="min-w-0 gap-0 rounded-2xl border border-border/70 bg-card shadow-card"
    >
      <TabsList
        variant="line"
        className="w-full gap-4 group-data-[orientation=horizontal]/tabs:h-13 data-[variant=line]:px-4 sm:data-[variant=line]:px-5"
      >
        <TabsTrigger value="attendees">
          {t('attendees')}
          <TabCount value={booked.length} />
        </TabsTrigger>
        <TabsTrigger value="payments" data-testid="tab-payments">
          {tPayments('title')}
          <TabCount value={openPayments} alert={inbox.toVerify.length > 0} />
        </TabsTrigger>
        <TabsTrigger value="waitlist">
          {t('waitlist')}
          <TabCount value={waitlist.length} />
        </TabsTrigger>
        {refunds.length > 0 ? (
          <TabsTrigger value="refunds">
            {t('refunds')}
            <TabCount value={refunds.length} alert />
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="attendees" className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              aria-label={t('search')}
              className="ps-10"
            />
          </div>
          {!locked && tickets.length > 0 ? (
            <AddAttendee eventId={eventId} tickets={tickets} />
          ) : null}
        </div>
        {booked.length === 0 ? (
          <EmptyState
            size="compact"
            icon={Ticket}
            title={t('noAttendees')}
            hint={t('noAttendeesHint')}
          />
        ) : (
          <AttendeeList attendees={visible} questions={questions} locked={locked} inbox={inbox} />
        )}
      </TabsContent>

      <TabsContent value="waitlist" className="p-4 sm:p-5">
        {waitlist.length === 0 ? (
          <EmptyState size="compact" icon={Hourglass} title={t('noWaitlist')} />
        ) : (
          <ol className="space-y-2">
            {waitlist.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-sm shadow-xs"
              >
                <span className="ltr-nums flex size-9 shrink-0 items-center justify-center rounded-full bg-info-soft text-xs font-bold text-info">
                  {t('position', { position: a.waitlistPosition ?? 0 })}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium" dir="auto">
                  {a.fullName}
                </span>
                <span className="ltr-nums text-muted-foreground" dir="ltr">
                  {a.phone}
                </span>
              </li>
            ))}
          </ol>
        )}
      </TabsContent>

      <TabsContent value="payments" className="p-4 sm:p-5">
        <PaymentsInbox inbox={inbox} showEvent={false} />
      </TabsContent>

      <TabsContent value="refunds" className="p-4 sm:p-5">
        <ul className="space-y-3">
          {refunds.map((a) => (
            <RefundItem key={a.orderId} eventId={eventId} attendee={a} />
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  );
}

/** A count next to a tab label; `alert` when something waits for the organizer. */
function TabCount({ value, alert = false }: { value: number; alert?: boolean }) {
  return (
    <span
      className={cn(
        'ltr-nums min-w-5 rounded-full px-1.5 text-xs leading-5 font-semibold',
        alert && value > 0
          ? 'bg-highlight text-highlight-foreground'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {value}
    </span>
  );
}

/** One card per person; order-level actions on the first person of each order. */
function AttendeeList({
  attendees,
  questions,
  locked,
  inbox,
}: {
  attendees: Attendee[];
  questions: Record<string, string>;
  locked: boolean;
  inbox: Inbox;
}) {
  const tPayments = useTranslations('Payments');
  const t = useTranslations('Organizer');
  const tTickets = useTranslations('Tickets');
  const locale = useLocale() as Locale;
  const seen = new Set<string>();

  return (
    <ul className="space-y-3" data-testid="attendee-list">
      {attendees.map((a) => {
        const firstOfOrder = !seen.has(a.orderId);
        seen.add(a.orderId);
        const due = a.totalMillimes - a.paidMillimes;
        const contact = a.phone ?? a.email;
        return (
          <li
            key={a.id}
            className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-xs sm:flex-row sm:items-start"
            data-testid="attendee-row"
          >
            <div className="flex min-w-0 flex-1 gap-3">
              <span
                className={cn(
                  'relative flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  a.checkedInAt ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary',
                )}
                aria-hidden="true"
              >
                {initials(a.fullName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="truncate" dir="auto">
                    {a.fullName}
                  </span>
                  {a.checkedInAt ? (
                    <CheckCircle2
                      className="size-4 shrink-0 text-success"
                      aria-label={t('columns.checkIn')}
                    />
                  ) : null}
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {contact ? (
                    <p className="flex items-center gap-1.5">
                      {a.phone ? (
                        <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span className="ltr-nums truncate" dir="ltr">
                        {contact}
                      </span>
                    </p>
                  ) : null}
                  <p className="flex flex-wrap items-center gap-x-1.5">
                    <Ticket className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="ltr-nums font-mono">{a.reference}</span>
                    {a.ticketName ? <span>· {a.ticketName}</span> : null}
                    {a.meetingPoint ? <span>· {a.meetingPoint}</span> : null}
                    {a.utmSource ? <span>· {a.utmSource}</span> : null}
                    {a.checkedInAt ? (
                      <span className="ltr-nums">· {formatTime(a.checkedInAt, locale)}</span>
                    ) : null}
                  </p>
                </div>
                {a.paymentDeadline ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-warning">
                    <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                    {tPayments('reservedUntil', {
                      time: formatEventDateTime(a.paymentDeadline, locale),
                    })}
                  </p>
                ) : null}
                {Object.keys(a.answers).length > 0 ? (
                  <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-xs">
                    {Object.entries(a.answers)
                      .map(([id, answer]) => `${questions[id] ?? id}: ${String(answer)}`)
                      .join(' · ')}
                  </p>
                ) : null}
                <NoteEditor attendeeId={a.id} initial={a.notes} disabled={locked} />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 ps-14 sm:flex-col sm:items-end sm:ps-0">
              <Badge
                variant={toneOf(a.payment)}
                dot
                data-testid="attendee-payment"
                data-payment={a.payment}
              >
                {tTickets(`payment.${a.payment}`)}
              </Badge>
              {firstOfOrder &&
              due > 0 &&
              (a.payment === 'pending' || a.payment === 'deposit') &&
              !locked ? (
                <OrderPaymentAction
                  orderId={a.orderId}
                  amount={formatPrice(due, locale)}
                  inbox={inbox}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A receipt waiting for review must be verified (ADR 0018): "Verify the
 * receipt" opens it. Otherwise "Payment received" confirms cash, or a D17 or
 * transfer the organizer checked, after asking.
 */
function OrderPaymentAction({
  orderId,
  amount,
  inbox,
}: {
  orderId: string;
  amount: string;
  inbox: Inbox;
}) {
  const t = useTranslations('Payments');
  const toVerify = inbox.toVerify.find((item) => item.orderId === orderId);
  if (toVerify) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" data-testid="verify-receipt">
            <FileSearch aria-hidden="true" />
            {t('verifyReceipt')}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{t('verifyReceipt')}</DialogTitle>
          <DialogDescription className="sr-only">{toVerify.reference}</DialogDescription>
          <ReceiptReview item={toVerify} />
        </DialogContent>
      </Dialog>
    );
  }
  const method = inbox.awaiting.find((item) => item.orderId === orderId)?.method ?? 'cash';
  return <MarkPaidDialog orderId={orderId} method={method} amount={amount} />;
}

function NoteEditor({
  attendeeId,
  initial,
  disabled,
}: {
  attendeeId: string;
  initial: string | null;
  disabled: boolean;
}) {
  const t = useTranslations('Organizer');
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial ?? '');
  const [saved, setSaved] = useState(false);
  const setNote = useMutation(trpc.organizer.setNote.mutationOptions());

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="mt-2 flex min-h-8 max-w-full items-center gap-1.5 rounded-lg text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-55"
      >
        <StickyNote className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{value || t('note')}</span>
      </button>
    );
  }
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void setNote.mutateAsync({ attendeeId, notes: value.trim() || null }).then(() => {
          setSaved(true);
          setOpen(false);
        });
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={500}
        aria-label={t('note')}
        autoFocus
      />
      <Button type="submit" disabled={setNote.isPending}>
        {t('save')}
      </Button>
      {saved ? (
        <span className="sr-only" role="status">
          {t('noteSaved')}
        </span>
      ) : null}
    </form>
  );
}

function RefundItem({ eventId, attendee }: { eventId: string; attendee: Attendee }) {
  const t = useTranslations('Organizer');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const decideRefund = useMutation(trpc.organizer.decideRefund.mutationOptions());

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <li className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
      <p className="flex flex-wrap items-center gap-x-2 font-semibold">
        <span dir="auto">{attendee.fullName}</span>
        <span className="ltr-nums font-mono text-sm font-normal text-muted-foreground">
          {attendee.reference}
        </span>
      </p>
      {attendee.refundRequests.map((refund) => (
        <div
          key={refund.id}
          className="flex flex-wrap items-center gap-2 rounded-xl bg-warning-soft/60 p-3 text-sm"
        >
          <span className="flex flex-1 items-center gap-2 font-medium text-warning">
            <Undo2 className="size-4 shrink-0" aria-hidden="true" />
            {t('refundRequest', { amount: formatPrice(refund.amountMillimes, locale) })}
          </span>
          <Button
            disabled={decideRefund.isPending}
            onClick={() =>
              void run(() =>
                decideRefund.mutateAsync({ eventId, refundId: refund.id, approve: true }),
              )
            }
          >
            {t('approve')}
          </Button>
          <Button
            variant="outline"
            disabled={decideRefund.isPending}
            onClick={() =>
              void run(() =>
                decideRefund.mutateAsync({ eventId, refundId: refund.id, approve: false }),
              )
            }
          >
            {t('reject')}
          </Button>
        </div>
      ))}
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </li>
  );
}

/** PRT-02: someone who booked by phone or WhatsApp. */
function AddAttendee({
  eventId,
  tickets,
}: {
  eventId: string;
  tickets: { id: string; name: string }[];
}) {
  const t = useTranslations('Organizer');
  const tCheckout = useTranslations('Checkout');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [ticketTypeId, setTicketTypeId] = useState(tickets[0]?.id ?? '');
  const [quantity, setQuantity] = useState('1');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [paid, setPaid] = useState(false);
  const [method, setMethod] = useState<Method>('cash');
  const [error, setError] = useState<string | null>(null);
  const add = useMutation(trpc.organizer.addAttendee.mutationOptions());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await add.mutateAsync({
        eventId,
        ticketTypeId,
        quantity: Math.max(1, Math.min(10, Number(quantity) || 1)),
        fullName,
        phone: phone.trim() || null,
        paid,
        method,
      });
      setOpen(false);
      setFullName('');
      setPhone('');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Plus aria-hidden="true" />
          {t('addAttendee')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t('addAttendee')}</DialogTitle>
        <DialogDescription>{t('addAttendeeHint')}</DialogDescription>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field id="add-name" label={t('columns.name')}>
            <Input
              id="add-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
          </Field>
          <Field id="add-phone" label={tCheckout('phone')}>
            <Input
              id="add-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <Field id="add-ticket" label={t('columns.ticket')}>
              <NativeSelect
                id="add-ticket"
                value={ticketTypeId}
                onChange={(e) => setTicketTypeId(e.target.value)}
              >
                {tickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticket.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="add-qty" label={t('quantity')}>
              <Input
                id="add-qty"
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex min-h-11 items-center gap-2">
            <Checkbox
              id="add-paid"
              checked={paid}
              onCheckedChange={(checked) => setPaid(checked === true)}
            />
            <Label htmlFor="add-paid">{t('alreadyPaid')}</Label>
          </div>
          {paid ? (
            <Field id="add-method" label={t('method')}>
              <NativeSelect
                id="add-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
              >
                {(['cash', 'bank_transfer', 'd17'] as const).map((m) => (
                  <option key={m} value={m}>
                    {tCheckout(`methods.${m}`)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={add.isPending}>
            {t('add')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
