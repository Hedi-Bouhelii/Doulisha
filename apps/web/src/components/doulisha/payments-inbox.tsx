'use client';

import { formatEventDateTime, formatPrice, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Landmark,
  Phone,
  Smartphone,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { EmptyState } from '@/components/doulisha/empty-state';
import { initials } from '@/components/doulisha/friends-going';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';
import type { RouterOutputs } from '@/trpc/types';

type Inbox = RouterOutputs['organizer']['payments'];
type Item = Inbox['toVerify'][number];
type Method = 'd17' | 'bank_transfer' | 'cash';
const REASONS = ['wrong_amount', 'unreadable', 'not_received', 'other'] as const;
type Reason = (typeof REASONS)[number];

const methodIcons: Record<Method, LucideIcon> = {
  d17: Smartphone,
  bank_transfer: Landmark,
  cash: Banknote,
};

function useRun() {
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      router.refresh();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { run, error, busy };
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

/**
 * PRT-03 payments inbox (ADR 0018): receipts to verify, reservations waiting
 * for a D17 or transfer payment, and recent confirmations. `showEvent` adds
 * the event name when the inbox spans several events.
 */
export function PaymentsInbox({ inbox, showEvent }: { inbox: Inbox; showEvent: boolean }) {
  const t = useTranslations('Payments');
  const counts = {
    toVerify: inbox.toVerify.length,
    awaiting: inbox.awaiting.length,
    confirmed: inbox.confirmed.length,
  };
  return (
    <Tabs
      defaultValue={counts.toVerify > 0 || counts.awaiting === 0 ? 'toVerify' : 'awaiting'}
      className="min-w-0"
    >
      <TabsList className="w-full sm:w-auto">
        {(['toVerify', 'awaiting', 'confirmed'] as const).map((tab) => (
          <TabsTrigger key={tab} value={tab} data-testid={`payments-tab-${tab}`}>
            {t(`tabs.${tab}`)}
            <span
              className={cn(
                'ltr-nums min-w-5 rounded-full px-1.5 text-xs leading-5 font-semibold',
                tab === 'toVerify' && counts.toVerify > 0
                  ? 'bg-highlight text-highlight-foreground'
                  : 'bg-background text-muted-foreground',
              )}
            >
              {counts[tab]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="toVerify" className="mt-4 space-y-3">
        {inbox.toVerify.length === 0 ? (
          <EmptyState
            size="compact"
            icon={FileText}
            title={t('nothingToVerify')}
            hint={t('nothingToVerifyHint')}
          />
        ) : (
          inbox.toVerify.map((item) => (
            <ItemCard key={item.orderId} item={item} showEvent={showEvent}>
              <ReceiptReview item={item} />
            </ItemCard>
          ))
        )}
      </TabsContent>

      <TabsContent value="awaiting" className="mt-4 space-y-3">
        {inbox.awaiting.length === 0 ? (
          <EmptyState
            size="compact"
            icon={Clock}
            title={t('nothingAwaiting')}
            hint={t('nothingAwaitingHint')}
          />
        ) : (
          inbox.awaiting.map((item) => (
            <ItemCard key={item.orderId} item={item} showEvent={showEvent}>
              <AwaitingActions item={item} />
            </ItemCard>
          ))
        )}
      </TabsContent>

      <TabsContent value="confirmed" className="mt-4">
        {inbox.confirmed.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            –
          </p>
        ) : (
          <ConfirmedList rows={inbox.confirmed} showEvent={showEvent} />
        )}
      </TabsContent>
    </Tabs>
  );
}

/** Who, what, how much and until when: the facts needed to match a payment. */
function ItemCard({
  item,
  showEvent,
  children,
}: {
  item: Item;
  showEvent: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations('Payments');
  const tCheckout = useTranslations('Checkout');
  const locale = useLocale() as Locale;
  const Icon = methodIcons[item.method];
  return (
    <article
      className="rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:p-5"
      data-testid="payment-item"
      data-reference={item.reference}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
          >
            {initials(item.buyer.name)}
          </span>
          <div className="min-w-0">
            <p className="font-semibold" dir="auto">
              {item.buyer.name}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {item.buyer.phone ? (
                <a
                  href={`tel:${item.buyer.phone}`}
                  dir="ltr"
                  className="ltr-nums inline-flex items-center gap-1 hover:underline"
                >
                  <Phone className="size-3.5" aria-hidden="true" />
                  {item.buyer.phone}
                </a>
              ) : null}
              <span className="ltr-nums font-mono">{item.reference}</span>
              <span>{t('places', { count: item.places })}</span>
            </p>
            {showEvent ? (
              <p className="mt-1 text-sm">
                <span dir="auto">{item.event.title}</span> ·{' '}
                {formatEventDateTime(item.event.startsAt, locale)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="text-end">
          <p className="ltr-nums text-xl font-bold tracking-tight" data-testid="expected-amount">
            {formatPrice(item.expectedMillimes, locale)}
          </p>
          <p className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
            {tCheckout(`methods.${item.method}`)}
          </p>
        </div>
      </div>
      {item.deadline ? (
        <p className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-sm font-medium text-warning">
          <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
          {t('deadline', { time: formatEventDateTime(item.deadline, locale) })}
        </p>
      ) : null}
      <div className="mt-4 border-t border-border/70 pt-4">{children}</div>
    </article>
  );
}

/** The receipt, shown in place, with "Confirm" and "Reject" (with a reason). */
export function ReceiptReview({ item }: { item: Item }) {
  const t = useTranslations('Payments');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const { run, error, busy } = useRun();
  const [transactionRef, setTransactionRef] = useState('');
  const review = useMutation(trpc.organizer.reviewProof.mutationOptions());
  const proof = item.proof;
  if (!proof) return null;
  const src = `/api/proofs/${proof.id}`;

  return (
    <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
      {proof.isPdf ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted text-sm font-medium transition-colors hover:bg-accent"
        >
          <FileText className="size-8 text-primary" aria-hidden="true" />
          {t('openPdf')}
        </a>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="overflow-hidden rounded-2xl border border-border/70 bg-muted transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none"
              aria-label={t('enlarge')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- private receipt served by an authenticated route, not optimisable */}
              <img
                src={src}
                alt={t('receiptOf', { name: item.buyer.name })}
                className="aspect-[3/4] w-full object-cover"
                data-testid="receipt-preview"
              />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogTitle>{t('receiptOf', { name: item.buyer.name })}</DialogTitle>
            <DialogDescription className="sr-only">{item.reference}</DialogDescription>
            {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
            <img src={src} alt="" className="max-h-[70vh] w-full object-contain" />
          </DialogContent>
        </Dialog>
      )}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('sentAt', { time: formatEventDateTime(proof.sentAt, locale) })}
        </p>
        <p className="text-sm">
          {t('checkHint', {
            amount: formatPrice(item.expectedMillimes, locale),
            reference: item.reference,
          })}
        </p>
        <div className="space-y-1.5">
          <Label htmlFor={`ref-${proof.id}`}>{t('transactionRef')}</Label>
          <Input
            id={`ref-${proof.id}`}
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            maxLength={60}
            dir="ltr"
            className="max-w-xs text-start"
          />
        </div>
        <ErrorLine message={error} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() =>
                review.mutateAsync({
                  eventId: item.event.id,
                  proofId: proof.id,
                  approve: true,
                  transactionRef: transactionRef.trim() || null,
                }),
              )
            }
            data-testid="approve-proof"
          >
            <CheckCircle2 aria-hidden="true" />
            {t('confirmReceived', { amount: formatPrice(item.expectedMillimes, locale) })}
          </Button>
          <RejectDialog eventId={item.event.id} proofId={proof.id} />
        </div>
      </div>
    </div>
  );
}

function RejectDialog({ eventId, proofId }: { eventId: string; proofId: string }) {
  const t = useTranslations('Payments');
  const trpc = useTRPC();
  const { run, error, busy } = useRun();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('wrong_amount');
  const [note, setNote] = useState('');
  const review = useMutation(trpc.organizer.reviewProof.mutationOptions());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" data-testid="reject-proof">
          <XCircle aria-hidden="true" />
          {t('reject')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t('rejectTitle')}</DialogTitle>
        <DialogDescription>{t('rejectHint')}</DialogDescription>
        <fieldset className="space-y-2">
          <legend className="sr-only">{t('reason')}</legend>
          {REASONS.map((r) => (
            <label
              key={r}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border/70 px-3 transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50"
            >
              <input
                type="radio"
                name="reject-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="size-4 accent-[var(--primary)]"
                data-testid={`reason-${r}`}
              />
              {t(`reasons.${r}`)}
            </label>
          ))}
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor={`note-${proofId}`}>{t('noteToBuyer')}</Label>
          <Textarea
            id={`note-${proofId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={2}
            data-testid="reject-note"
          />
        </div>
        <ErrorLine message={error} />
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t('back')}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() =>
              void run(() =>
                review.mutateAsync({
                  eventId,
                  proofId,
                  approve: false,
                  reason,
                  note: note.trim() || null,
                }),
              ).then((ok) => ok && setOpen(false))
            }
            data-testid="confirm-reject"
          >
            {t('reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A reservation without a receipt: payment received, one more day, or cancel. */
function AwaitingActions({ item }: { item: Item }) {
  const t = useTranslations('Payments');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const { run, error, busy } = useRun();
  const extend = useMutation(trpc.organizer.extendReservation.mutationOptions());
  const cancel = useMutation(trpc.organizer.cancelReservation.mutationOptions());

  return (
    <div className="space-y-2">
      {item.proof?.status === 'rejected' ? (
        <p className="text-sm text-muted-foreground">{t('waitingNewReceipt')}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <MarkPaidDialog
          orderId={item.orderId}
          method={item.method}
          amount={formatPrice(item.expectedMillimes, locale)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void run(() => extend.mutateAsync({ orderId: item.orderId }))}
          data-testid="extend-reservation"
        >
          <Clock aria-hidden="true" />
          {t('extend')}
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive-soft hover:text-destructive"
            >
              <XCircle aria-hidden="true" />
              {t('cancelReservation')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{t('cancelReservation')}</DialogTitle>
            <DialogDescription>
              {t('cancelReservationHint', { name: item.buyer.name })}
            </DialogDescription>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t('back')}
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void run(() => cancel.mutateAsync({ orderId: item.orderId }))}
                >
                  {t('cancelReservation')}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <ErrorLine message={error} />
    </div>
  );
}

/**
 * "Payment received" without a receipt: the organizer confirms they checked
 * their D17 account or bank, optionally with the transaction number.
 */
export function MarkPaidDialog({
  orderId,
  method,
  amount,
}: {
  orderId: string;
  method: Method;
  amount: string;
}) {
  const t = useTranslations('Payments');
  const tCheckout = useTranslations('Checkout');
  const trpc = useTRPC();
  const { run, error, busy } = useRun();
  const [open, setOpen] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const markPaid = useMutation(trpc.organizer.markPaid.mutationOptions());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" data-testid="mark-paid">
          <CheckCircle2 aria-hidden="true" />
          {t('paymentReceived')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t('paymentReceived')}</DialogTitle>
        <DialogDescription>
          {t('markPaidQuestion', { amount, method: tCheckout(`methods.${method}`) })}
        </DialogDescription>
        {method !== 'cash' ? (
          <div className="space-y-1.5">
            <Label htmlFor={`paid-ref-${orderId}`}>{t('transactionRef')}</Label>
            <Input
              id={`paid-ref-${orderId}`}
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              maxLength={60}
              dir="ltr"
              className="text-start"
            />
          </div>
        ) : null}
        <ErrorLine message={error} />
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t('back')}
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() =>
                markPaid.mutateAsync({
                  orderId,
                  method,
                  transactionRef: transactionRef.trim() || null,
                }),
              ).then((ok) => ok && setOpen(false))
            }
            data-testid="confirm-mark-paid"
          >
            {t('yesReceived', { amount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmedList({ rows, showEvent }: { rows: Inbox['confirmed']; showEvent: boolean }) {
  const t = useTranslations('Payments');
  const tCheckout = useTranslations('Checkout');
  const locale = useLocale() as Locale;
  return (
    <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
      {rows.map((row) => (
        <li
          key={`${row.orderId}-${String(row.paidAt)}`}
          className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
          data-testid="confirmed-payment"
          data-reference={row.reference}
        >
          <span className="min-w-0">
            <span className="ltr-nums font-mono font-medium">{row.reference}</span>
            {showEvent ? (
              <span className="text-muted-foreground">
                {' · '}
                <span dir="auto">{row.eventTitle}</span>
              </span>
            ) : null}
            <span className="block text-xs text-muted-foreground">
              {tCheckout(`methods.${row.method as Method}`)}
              {row.transactionRef ? ` · ${t('transactionShort', { ref: row.transactionRef })}` : ''}
              {row.paidAt ? ` · ${formatEventDateTime(row.paidAt, locale)}` : ''}
            </span>
          </span>
          <span className="ltr-nums font-semibold text-success">
            {formatPrice(row.amountMillimes, locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}
