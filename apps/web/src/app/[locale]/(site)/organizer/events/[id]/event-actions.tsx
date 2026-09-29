'use client';

import { useMutation } from '@tanstack/react-query';
import { Copy, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

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
import { useTRPC } from '@/trpc/client';

/** Duplicate the event as a new draft, or cancel it with full refunds. */
export function EventActions({ eventId, canCancel }: { eventId: string; canCancel: boolean }) {
  const t = useTranslations('Organizer');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [message, setMessage] = useState<string | null>(null);
  const duplicate = useMutation(trpc.editor.duplicate.mutationOptions());
  const cancel = useMutation(trpc.organizer.cancelEvent.mutationOptions());

  async function onDuplicate() {
    try {
      const { id } = await duplicate.mutateAsync({ eventId });
      router.push(`/organizer/events/${id}/edit`);
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }

  async function onCancel() {
    try {
      await cancel.mutateAsync({ eventId });
      setMessage(t('eventCancelled'));
      router.refresh();
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-11 rounded-full"
        onClick={() => void onDuplicate()}
        disabled={duplicate.isPending}
      >
        <Copy aria-hidden="true" />
        {t('duplicate')}
      </Button>
      {canCancel ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 rounded-full text-destructive"
            >
              <XCircle aria-hidden="true" />
              {t('cancelEvent')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{t('cancelEvent')}</DialogTitle>
            <DialogDescription>{t('cancelEventConfirm')}</DialogDescription>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline" className="min-h-11">
                  {t('keepEvent')}
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  variant="destructive"
                  className="min-h-11"
                  onClick={() => void onCancel()}
                  disabled={cancel.isPending}
                >
                  {t('cancelEvent')}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
      {message ? (
        <p role="status" className="w-full text-sm">
          {message}
        </p>
      ) : null}
    </>
  );
}
