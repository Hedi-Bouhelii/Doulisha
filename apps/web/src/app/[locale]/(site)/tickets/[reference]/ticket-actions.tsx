'use client';

import { formatPrice, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import {
  Banknote,
  CalendarPlus,
  Check,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  Smartphone,
  Upload,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type ReactNode } from 'react';

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
import { useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { buildIcs } from '@/lib/ics';
import { putFile } from '@/lib/upload';
import { useTRPC } from '@/trpc/client';

type Method = 'online' | 'd17' | 'bank_transfer' | 'cash';
type ManualMethod = Exclude<Method, 'online'>;

const methodIcons: Record<Method, LucideIcon> = {
  online: CreditCard,
  d17: Smartphone,
  bank_transfer: Landmark,
  cash: Banknote,
};

export type PayTo =
  | { method: 'd17'; d17Number: string }
  | { method: 'bank_transfer'; rib: string; bankName: string | null; accountHolder: string | null }
  | null;

function useAction() {
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>, refresh = true) {
    setError(null);
    setBusy(true);
    try {
      await action();
      if (refresh) router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return { run, error, busy };
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
      {message}
    </p>
  );
}

/** A value to copy (D17 number, RIB) with a copy button. */
function CopyValue({ label, value, testId }: { label: string; value: string; testId?: string }) {
  const t = useTranslations('Tickets');
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-background p-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className="ltr-nums truncate font-mono text-lg font-semibold tracking-wide"
          dir="ltr"
          data-testid={testId}
        >
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 shrink-0 rounded-full"
        onClick={() =>
          void navigator.clipboard.writeText(value.replace(/\s/g, '')).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
        }
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span aria-live="polite">{copied ? t('copied') : t('copy')}</span>
      </Button>
    </div>
  );
}

/**
 * What to do now for a booking paid by D17 or transfer: where to send the
 * money (only the chosen method) and the receipt upload (PAY-02).
 */
export function ManualPaymentSteps({
  reference,
  method,
  amount,
  payTo,
  organizerName,
  proofStatus,
}: {
  reference: string;
  method: 'd17' | 'bank_transfer';
  amount: number;
  payTo: PayTo;
  organizerName: string | null;
  proofStatus: 'pending' | 'approved' | 'rejected' | null;
}) {
  const t = useTranslations('Tickets');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const fileInput = useRef<HTMLInputElement>(null);
  const { run, error, busy } = useAction();
  const createUpload = useMutation(trpc.uploads.create.mutationOptions());
  const attachProof = useMutation(trpc.booking.attachProof.mutationOptions());

  function upload(file: File) {
    void run(async () => {
      const ticket = await createUpload.mutateAsync({
        purpose: 'payment-proof',
        contentType: file.type,
        size: file.size,
      });
      const key = await putFile(ticket, file);
      await attachProof.mutateAsync({ reference, fileKey: key });
    });
  }

  if (proofStatus === 'pending') {
    return (
      <p
        className="flex items-center gap-2 rounded-xl bg-background p-3 text-sm"
        data-testid="proof-pending"
      >
        <Loader2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
        {t('proof.pending')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-3 text-sm">
        <li className="space-y-2">
          <p>
            <span className="ltr-nums me-1 font-semibold">1.</span>
            {t(method === 'd17' ? 'sendD17' : 'sendTransfer', {
              amount: formatPrice(amount, locale),
              organizer: organizerName ?? '',
            })}
          </p>
          {payTo?.method === 'd17' ? (
            <CopyValue label={t('d17Number')} value={payTo.d17Number} testId="pay-to-d17" />
          ) : payTo?.method === 'bank_transfer' ? (
            <div className="space-y-2">
              <CopyValue label={t('rib')} value={payTo.rib} testId="pay-to-rib" />
              {payTo.bankName || payTo.accountHolder ? (
                <p className="text-xs text-muted-foreground">
                  {[payTo.accountHolder, payTo.bankName].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl bg-background p-3 text-muted-foreground">{t('noPayTo')}</p>
          )}
        </li>
        <li className="space-y-2">
          <p>
            <span className="ltr-nums me-1 font-semibold">2.</span>
            {t('thenUpload')}
          </p>
          {proofStatus === 'rejected' ? (
            <p className="text-highlight">{t('proof.rejected')}</p>
          ) : null}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            aria-label={t('uploadProof')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <Button
            type="button"
            className="min-h-11 w-full rounded-full sm:w-auto"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            data-testid="upload-proof"
          >
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Upload aria-hidden="true" />
            )}
            {busy ? t('uploading') : t('uploadProof')}
          </Button>
        </li>
      </ol>
      <ErrorLine message={error} />
    </div>
  );
}

/** Online payment for what is due (held booking, waitlist offer, balance). */
export function PayOnlineButton({ reference, amount }: { reference: string; amount: number }) {
  const t = useTranslations('Tickets');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const { run, error, busy } = useAction();
  const pay = useMutation(trpc.booking.payOnline.mutationOptions());
  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="min-h-12 w-full rounded-full text-base sm:w-auto sm:px-8"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const { redirectUrl } = await pay.mutateAsync({ reference });
            window.location.assign(redirectUrl);
          }, false)
        }
        data-testid="pay-online"
      >
        <CreditCard aria-hidden="true" />
        {t('payNow', { amount: formatPrice(amount, locale) })}
      </Button>
      <ErrorLine message={error} />
    </div>
  );
}

/**
 * "Pay differently": the other methods the event accepts, offered only when
 * the buyer asks. Online goes to the gateway; manual methods switch in place.
 */
export function PayDifferently({
  reference,
  current,
  methods,
}: {
  reference: string;
  current: ManualMethod;
  methods: Method[];
}) {
  const t = useTranslations('Tickets');
  const tCheckout = useTranslations('Checkout');
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const { run, error, busy } = useAction();
  const pay = useMutation(trpc.booking.payOnline.mutationOptions());
  const change = useMutation(trpc.booking.changeMethod.mutationOptions());
  const others = methods.filter((m) => m !== current);
  if (others.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="min-h-11 text-sm font-medium text-primary hover:underline"
          data-testid="pay-differently"
        >
          {t('payDifferently')}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t('payDifferently')}</DialogTitle>
        <DialogDescription>{t('payDifferentlyHint')}</DialogDescription>
        <div className="space-y-2">
          {others.map((method) => {
            const Icon = methodIcons[method];
            return (
              <button
                key={method}
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (method === 'online') {
                      const { redirectUrl } = await pay.mutateAsync({ reference });
                      window.location.assign(redirectUrl);
                    } else {
                      await change.mutateAsync({ reference, method });
                      setOpen(false);
                    }
                  }, method !== 'online')
                }
                className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-start hover:bg-accent"
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block font-medium">{tCheckout(`methods.${method}`)}</span>
                  <span className="block text-sm text-muted-foreground">
                    {tCheckout(`methodHints.${method}`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <ErrorLine message={error} />
      </DialogContent>
    </Dialog>
  );
}

/** Secondary actions: calendar file and cancellation under the refund policy. */
export function BookingActions({
  reference,
  canCancel,
  refundIfCancelled,
  calendar,
  extra,
}: {
  reference: string;
  canCancel: boolean;
  refundIfCancelled: number;
  calendar: { title: string; start: string; end: string | null; location: string };
  extra?: ReactNode;
}) {
  const t = useTranslations('Tickets');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const { run, error, busy } = useAction();
  const cancel = useMutation(trpc.booking.cancel.mutationOptions());

  function downloadIcs() {
    const ics = buildIcs({
      uid: reference,
      title: calendar.title,
      start: new Date(calendar.start),
      end: calendar.end ? new Date(calendar.end) : null,
      location: calendar.location,
      url: window.location.href,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reference}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11 rounded-full" onClick={downloadIcs}>
          <CalendarPlus aria-hidden="true" />
          {t('addToCalendar')}
        </Button>
        {extra}
        {canCancel ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="min-h-11 rounded-full text-destructive">
                <XCircle aria-hidden="true" />
                {t('cancel')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>{t('cancelConfirm')}</DialogTitle>
              <DialogDescription>
                {refundIfCancelled > 0
                  ? t('refundIfCancelled', { amount: formatPrice(refundIfCancelled, locale) })
                  : t('noRefund')}
              </DialogDescription>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline" className="min-h-11">
                    {t('keepBooking')}
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  className="min-h-11"
                  onClick={() => void run(() => cancel.mutateAsync({ reference }))}
                  disabled={busy}
                >
                  {t('cancel')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      <ErrorLine message={error} />
    </div>
  );
}
