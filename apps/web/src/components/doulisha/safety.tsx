'use client';

import { useMutation } from '@tanstack/react-query';
import { Ban, CheckCircle2, Flag, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';

export type ReportTarget = 'event' | 'post' | 'comment' | 'user' | 'organizer' | 'message';
const REASONS = ['spam', 'harassment', 'inappropriate', 'scam', 'other'] as const;
type Reason = (typeof REASONS)[number];

/** TRS-03: report something to the Doulisha team, with a reason and optional details. */
export function ReportDialog({
  target,
  open,
  onOpenChange,
}: {
  target: { type: ReportTarget; id: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('Safety');
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const [reason, setReason] = useState<Reason>('spam');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const report = useMutation(trpc.safety.report.mutationOptions());

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setSent(false);
      setError(null);
      setDetails('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        {sent ? (
          <div className="space-y-3 py-2 text-center" data-testid="report-sent">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </span>
            <DialogTitle>{t('reportSent')}</DialogTitle>
            <DialogDescription>{t('reportSentHint')}</DialogDescription>
            <Button className="w-full sm:w-auto" onClick={() => close(false)}>
              {t('close')}
            </Button>
          </div>
        ) : (
          <>
            <DialogTitle>{t(`reportTitle.${target.type}`)}</DialogTitle>
            <DialogDescription>{t('reportHint')}</DialogDescription>
            <RadioGroup
              value={reason}
              onValueChange={(value) => setReason(value as Reason)}
              className="gap-2"
            >
              {REASONS.map((r) => (
                <Label
                  key={r}
                  htmlFor={`reason-${r}`}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 font-normal transition-colors',
                    reason === r
                      ? 'border-primary bg-primary-soft/50'
                      : 'border-border/70 hover:bg-accent',
                  )}
                >
                  <RadioGroupItem id={`reason-${r}`} value={r} data-testid={`report-reason-${r}`} />
                  {t(`reasons.${r}`)}
                </Label>
              ))}
            </RadioGroup>
            <div className="space-y-1.5">
              <Label htmlFor="report-details">{t('details')}</Label>
              <Textarea
                id="report-details"
                value={details}
                maxLength={1000}
                onChange={(e) => setDetails(e.target.value)}
                data-testid="report-details"
              />
            </div>
            {error ? (
              <p
                role="alert"
                className="rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                {t('cancel')}
              </Button>
              <Button
                disabled={report.isPending}
                onClick={() =>
                  report.mutate(
                    { targetType: target.type, targetId: target.id, reason, details },
                    { onSuccess: () => setSent(true), onError: (e) => setError(errorMessage(e)) },
                  )
                }
                data-testid="report-send"
              >
                {t('send')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** TRS-03: confirm blocking someone; `onDone` runs after the block is saved. */
export function BlockDialog({
  user,
  open,
  onOpenChange,
  onDone,
}: {
  user: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslations('Safety');
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const block = useMutation(trpc.safety.block.mutationOptions());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t('blockTitle', { name: user.name })}</DialogTitle>
        <DialogDescription>{t('blockHint')}</DialogDescription>
        {error ? (
          <p
            role="alert"
            className="rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={block.isPending}
            onClick={() =>
              block.mutate(
                { userId: user.id },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    onDone();
                  },
                  onError: (e) => setError(errorMessage(e)),
                },
              )
            }
            data-testid="block-confirm"
          >
            {t('block')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "⋯" menu on a post, comment or message: remove (author and organizers),
 * report, and block the author. Visitors see no menu.
 */
export function ItemMenu({
  report,
  author,
  onRemove,
  onBlocked,
  label,
}: {
  report: { type: ReportTarget; id: string };
  /** The author, unless it is the viewer. */
  author: { id: string; name: string } | null;
  onRemove?: () => void;
  onBlocked: () => void;
  label: string;
}) {
  const t = useTranslations('Safety');
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={label}
            data-testid="item-menu"
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onRemove ? (
            <DropdownMenuItem
              variant="destructive"
              className="min-h-11"
              onSelect={onRemove}
              data-testid="item-remove"
            >
              <Trash2 aria-hidden="true" />
              {t('remove')}
            </DropdownMenuItem>
          ) : null}
          {author ? (
            <>
              <DropdownMenuItem
                className="min-h-11"
                onSelect={() => setReporting(true)}
                data-testid="item-report"
              >
                <Flag aria-hidden="true" />
                {t('report')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11"
                onSelect={() => setBlocking(true)}
                data-testid="item-block"
              >
                <Ban aria-hidden="true" />
                {t('blockName', { name: author.name })}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog target={report} open={reporting} onOpenChange={setReporting} />
      {author ? (
        <BlockDialog user={author} open={blocking} onOpenChange={setBlocking} onDone={onBlocked} />
      ) : null}
    </>
  );
}

/** A plain "Report" button for a page (an event, an organizer, a member). */
export function ReportButton({ target }: { target: { type: ReportTarget; id: string } }) {
  const t = useTranslations('Safety');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        className="min-h-11 text-muted-foreground"
        onClick={() => setOpen(true)}
        data-testid={`report-${target.type}`}
      >
        <Flag aria-hidden="true" />
        {t(`reportTitle.${target.type}`)}
      </Button>
      <ReportDialog target={target} open={open} onOpenChange={setOpen} />
    </>
  );
}
