'use client';

import { formatPrice, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import { CalendarPlus, CreditCard, Upload, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

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

/** What a buyer can do with a booking: pay, send a receipt, cancel, add to calendar. */
export function TicketActions({
  reference,
  dueMillimes,
  canPayOnline,
  canUploadProof,
  canCancel,
  refundIfCancelled,
  calendar,
}: {
  reference: string;
  dueMillimes: number;
  canPayOnline: boolean;
  canUploadProof: boolean;
  canCancel: boolean;
  refundIfCancelled: number;
  calendar: { title: string; start: string; end: string | null; location: string };
}) {
  const t = useTranslations('Tickets');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pay = useMutation(trpc.booking.payOnline.mutationOptions());
  const cancel = useMutation(trpc.booking.cancel.mutationOptions());
  const createUpload = useMutation(trpc.uploads.create.mutationOptions());
  const attachProof = useMutation(trpc.booking.attachProof.mutationOptions());

  async function payOnline() {
    setError(null);
    try {
      const { redirectUrl } = await pay.mutateAsync({ reference });
      window.location.assign(redirectUrl);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function uploadProof(file: File) {
    setError(null);
    setUploading(true);
    try {
      const ticket = await createUpload.mutateAsync({
        purpose: 'payment-proof',
        contentType: file.type,
        size: file.size,
      });
      const key = await putFile(ticket, file);
      await attachProof.mutateAsync({ reference, fileKey: key });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function confirmCancel() {
    setError(null);
    try {
      await cancel.mutateAsync({ reference });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

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
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        {canPayOnline && dueMillimes > 0 ? (
          <Button
            className="min-h-11 rounded-full"
            onClick={() => void payOnline()}
            disabled={pay.isPending}
            data-testid="pay-online"
          >
            <CreditCard aria-hidden="true" />
            {t('payNow', { amount: formatPrice(dueMillimes, locale) })}
          </Button>
        ) : null}
        {canUploadProof ? (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              aria-label={t('uploadProof')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadProof(file);
              }}
            />
            <Button
              variant="outline"
              className="min-h-11 rounded-full"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              <Upload aria-hidden="true" />
              {uploading ? t('uploading') : t('uploadProof')}
            </Button>
          </>
        ) : null}
        <Button variant="outline" className="min-h-11 rounded-full" onClick={downloadIcs}>
          <CalendarPlus aria-hidden="true" />
          {t('addToCalendar')}
        </Button>
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
                  onClick={() => void confirmCancel()}
                  disabled={cancel.isPending}
                >
                  {t('cancel')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
          {error}
        </p>
      ) : null}
    </div>
  );
}
