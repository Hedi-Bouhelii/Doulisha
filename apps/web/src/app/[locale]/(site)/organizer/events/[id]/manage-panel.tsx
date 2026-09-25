'use client';

import { formatPrice, formatTime, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, FileText, Plus, Search, StickyNote } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/doulisha/empty-state';
import { Field, NativeSelect } from '@/components/doulisha/form-field';
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
type Method = 'cash' | 'bank_transfer' | 'd17';

const paymentTone: Record<string, string> = {
  paid: 'bg-cat-outdoor-bg text-cat-outdoor-fg',
  deposit: 'bg-cat-sports-bg text-cat-sports-fg',
  pending: 'bg-highlight-soft text-highlight',
  refunded: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  waitlisted: 'bg-secondary text-secondary-foreground',
};

/** Attendees, waitlist and items to review, with the organizer's actions (PRT-01..04). */
export function ManagePanel({
  eventId,
  attendees,
  tickets,
  questions,
  locked,
}: {
  eventId: string;
  attendees: Attendee[];
  tickets: { id: string; name: string }[];
  /** Booking questions, to show answers with their label. */
  questions: Record<string, string>;
  locked: boolean;
}) {
  const t = useTranslations('Organizer');
  const [query, setQuery] = useState('');

  const booked = attendees.filter((a) => a.payment !== 'waitlisted');
  const waitlist = attendees
    .filter((a) => a.payment === 'waitlisted')
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));
  const toReview = useMemo(() => {
    const seen = new Set<string>();
    return attendees.filter((a) => {
      if (seen.has(a.orderId)) return false;
      seen.add(a.orderId);
      return a.proofs.some((p) => p.status === 'pending') || a.refundRequests.length > 0;
    });
  }, [attendees]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? booked.filter(
        (a) => a.fullName.toLowerCase().includes(needle) || (a.phone ?? '').includes(needle),
      )
    : booked;

  return (
    <Tabs defaultValue="attendees" className="min-w-0">
      <TabsList className="h-11 w-full justify-start overflow-x-auto sm:w-auto">
        <TabsTrigger value="attendees" className="min-h-9 px-3">
          {t('attendees')} ({booked.length})
        </TabsTrigger>
        <TabsTrigger value="waitlist" className="min-h-9 px-3">
          {t('waitlist')} ({waitlist.length})
        </TabsTrigger>
        <TabsTrigger value="review" className="min-h-9 px-3" data-testid="tab-review">
          {t('requests')} ({toReview.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="attendees" className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              aria-label={t('search')}
              className="h-11 ps-9"
            />
          </div>
          {!locked && tickets.length > 0 ? (
            <AddAttendee eventId={eventId} tickets={tickets} />
          ) : null}
        </div>
        {booked.length === 0 ? (
          <EmptyState title={t('noAttendees')} hint={t('noAttendeesHint')} />
        ) : (
          <AttendeeList attendees={visible} questions={questions} locked={locked} />
        )}
      </TabsContent>

      <TabsContent value="waitlist" className="mt-4">
        {waitlist.length === 0 ? (
          <p className="text-sm text-muted-foreground">–</p>
        ) : (
          <ol className="space-y-2">
            {waitlist.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
              >
                <span>
                  <span className="ltr-nums me-2 font-semibold">
                    {t('position', { position: a.waitlistPosition ?? 0 })}
                  </span>
                  {a.fullName}
                </span>
                <span className="ltr-nums text-muted-foreground">{a.phone}</span>
              </li>
            ))}
          </ol>
        )}
      </TabsContent>

      <TabsContent value="review" className="mt-4">
        {toReview.length === 0 ? (
          <p className="text-sm text-muted-foreground">–</p>
        ) : (
          <ul className="space-y-3">
            {toReview.map((a) => (
              <ReviewItem key={a.orderId} eventId={eventId} attendee={a} />
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

/** Cards on phones, a dense list on desktop; order-level actions on the first person of each order. */
function AttendeeList({
  attendees,
  questions,
  locked,
}: {
  attendees: Attendee[];
  questions: Record<string, string>;
  locked: boolean;
}) {
  const t = useTranslations('Organizer');
  const tTickets = useTranslations('Tickets');
  const locale = useLocale() as Locale;
  const seen = new Set<string>();

  return (
    <ul
      className="divide-y divide-border rounded-xl border border-border bg-card"
      data-testid="attendee-list"
    >
      {attendees.map((a) => {
        const firstOfOrder = !seen.has(a.orderId);
        seen.add(a.orderId);
        const due = a.totalMillimes - a.paidMillimes;
        return (
          <li
            key={a.id}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
            data-testid="attendee-row"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium">
                {a.checkedInAt ? (
                  <CheckCircle2
                    className="size-4 shrink-0 text-success"
                    aria-label={t('columns.checkIn')}
                  />
                ) : null}
                <span className="truncate">{a.fullName}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="ltr-nums">{a.phone ?? a.email ?? ''}</span>
                {a.ticketName ? ` · ${a.ticketName}` : ''}
                {a.meetingPoint ? ` · ${a.meetingPoint}` : ''}
                {' · '}
                <span className="ltr-nums">{a.reference}</span>
                {a.utmSource ? ` · ${a.utmSource}` : ''}
                {a.checkedInAt ? ` · ${formatTime(a.checkedInAt, locale)}` : ''}
              </p>
              {Object.keys(a.answers).length > 0 ? (
                <p className="mt-1 text-xs">
                  {Object.entries(a.answers)
                    .map(([id, answer]) => `${questions[id] ?? id}: ${String(answer)}`)
                    .join(' · ')}
                </p>
              ) : null}
              <NoteEditor attendeeId={a.id} initial={a.notes} disabled={locked} />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  paymentTone[a.payment],
                )}
                data-testid="attendee-payment"
                data-payment={a.payment}
              >
                {tTickets(`payment.${a.payment}`)}
              </span>
              {firstOfOrder &&
              due > 0 &&
              (a.payment === 'pending' || a.payment === 'deposit') &&
              !locked ? (
                <MarkPaid orderId={a.orderId} amount={formatPrice(due, locale)} />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MarkPaid({ orderId, amount }: { orderId: string; amount: string }) {
  const t = useTranslations('Organizer');
  const tCheckout = useTranslations('Checkout');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [method, setMethod] = useState<Method>('cash');
  const [error, setError] = useState<string | null>(null);
  const markPaid = useMutation(trpc.organizer.markPaid.mutationOptions());

  async function submit() {
    setError(null);
    try {
      await markPaid.mutateAsync({ orderId, method });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        value={method}
        onChange={(e) => setMethod(e.target.value as Method)}
        aria-label={t('method')}
        className="h-11 w-auto"
      >
        {(['cash', 'bank_transfer', 'd17'] as const).map((m) => (
          <option key={m} value={m}>
            {tCheckout(`methods.${m}`)}
          </option>
        ))}
      </NativeSelect>
      <Button
        type="button"
        size="sm"
        className="min-h-11"
        onClick={() => void submit()}
        disabled={markPaid.isPending}
        data-testid="mark-paid"
      >
        {t('markPaid')} ({amount})
      </Button>
      {error ? (
        <p role="alert" className="w-full text-xs text-highlight">
          {error}
        </p>
      ) : null}
    </div>
  );
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
        className="mt-1 flex min-h-8 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <StickyNote className="size-3.5" aria-hidden="true" />
        {value || t('note')}
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
        className="h-11"
        autoFocus
      />
      <Button type="submit" size="sm" className="min-h-11" disabled={setNote.isPending}>
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

function ReviewItem({ eventId, attendee }: { eventId: string; attendee: Attendee }) {
  const t = useTranslations('Organizer');
  const tCheckout = useTranslations('Checkout');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const reviewProof = useMutation(trpc.organizer.reviewProof.mutationOptions());
  const decideRefund = useMutation(trpc.organizer.decideRefund.mutationOptions());
  const busy = reviewProof.isPending || decideRefund.isPending;

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
    <li className="space-y-3 rounded-xl border border-border bg-card p-4">
      <p className="font-medium">
        {attendee.fullName} ·{' '}
        <span className="ltr-nums text-sm text-muted-foreground">{attendee.reference}</span>
      </p>
      {attendee.proofs
        .filter((proof) => proof.status === 'pending')
        .map((proof) => (
          <div key={proof.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span>
              {tCheckout(`methods.${proof.method as Method}`)} ·{' '}
              {formatPrice(proof.amountMillimes, locale)}
            </span>
            <Button asChild variant="link" size="sm" className="min-h-11">
              <a href={`/api/proofs/${proof.id}`} target="_blank" rel="noopener noreferrer">
                <FileText aria-hidden="true" />
                {t('viewProof')}
              </a>
            </Button>
            <Button
              size="sm"
              className="min-h-11"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  reviewProof.mutateAsync({ eventId, proofId: proof.id, approve: true }),
                )
              }
              data-testid="approve-proof"
            >
              {t('approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  reviewProof.mutateAsync({ eventId, proofId: proof.id, approve: false }),
                )
              }
            >
              {t('reject')}
            </Button>
          </div>
        ))}
      {attendee.refundRequests.map((refund) => (
        <div key={refund.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span>{t('refundRequest', { amount: formatPrice(refund.amountMillimes, locale) })}</span>
          <Button
            size="sm"
            className="min-h-11"
            disabled={busy}
            onClick={() =>
              void run(() =>
                decideRefund.mutateAsync({ eventId, refundId: refund.id, approve: true }),
              )
            }
          >
            {t('approve')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="min-h-11"
            disabled={busy}
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
        <p role="alert" className="text-sm text-highlight">
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
        <Button type="button" variant="outline" className="min-h-11 rounded-full">
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
              className="h-11"
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
              className="h-11"
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
                className="h-11"
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
            <p role="alert" className="text-sm text-highlight">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="min-h-11 w-full rounded-full" disabled={add.isPending}>
            {t('add')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
