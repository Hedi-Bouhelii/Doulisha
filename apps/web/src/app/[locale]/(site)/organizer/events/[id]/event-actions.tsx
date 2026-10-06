'use client';

import { useMutation } from '@tanstack/react-query';
import { Copy, FileSpreadsheet, MoreHorizontal, Printer, XCircle } from 'lucide-react';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { useTRPC } from '@/trpc/client';

/**
 * The event's secondary actions in one "more" menu: the attendee list as
 * Excel or PDF, a copy as a new draft, and cancelling with full refunds.
 */
export function EventActions({
  eventId,
  canCancel,
  exportHref,
  printHref,
}: {
  eventId: string;
  canCancel: boolean;
  exportHref: string;
  printHref: string;
}) {
  const t = useTranslations('Organizer');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('moreActions')}
            data-testid="event-more"
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem asChild>
            <a href={exportHref} download>
              <FileSpreadsheet aria-hidden="true" />
              {t('export')} · {t('exportExcel')}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={printHref}>
              <Printer aria-hidden="true" />
              {t('export')} · {t('exportPdf')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={duplicate.isPending} onSelect={() => void onDuplicate()}>
            <Copy aria-hidden="true" />
            {t('duplicate')}
          </DropdownMenuItem>
          {canCancel ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmCancel(true)}>
                <XCircle aria-hidden="true" />
                {t('cancelEvent')}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogTitle>{t('cancelEvent')}</DialogTitle>
          <DialogDescription>{t('cancelEventConfirm')}</DialogDescription>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">{t('keepEvent')}</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                variant="destructive"
                onClick={() => void onCancel()}
                disabled={cancel.isPending}
              >
                {t('cancelEvent')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {message ? (
        <p role="status" className="basis-full rounded-2xl bg-muted/70 px-4 py-2.5 text-sm">
          {message}
        </p>
      ) : null}
    </>
  );
}
