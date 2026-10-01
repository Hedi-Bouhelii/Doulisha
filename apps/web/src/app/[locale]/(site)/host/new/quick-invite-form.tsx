'use client';

import { fromTunisInput } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  Cake,
  CheckCircle2,
  ImagePlus,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';

import { Field } from '@/components/doulisha/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useErrorMessage } from '@/lib/errors';
import { absoluteUrl } from '@/lib/site';
import { putFile } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';

import { InviteLinkActions } from '../invite-link-actions';

type Kind = 'birthday' | 'private_gathering';

const KINDS: { kind: Kind; icon: LucideIcon }[] = [
  { kind: 'birthday', icon: Cake },
  { kind: 'private_gathering', icon: Sparkles },
];

/** A titled group of fields (founder's layout for the invitation form). */
function FormSection({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <h2 className="font-sans text-base font-semibold">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * INV-01: a private event in one short form (occasion, details, when, where,
 * cover), then a link to share. Layout from the founder's draft (2026-09-30).
 */
export function QuickInviteForm({ suggestedStart }: { suggestedStart: string }) {
  const t = useTranslations('Host');
  const tWizard = useTranslations('Wizard');
  const locale = useLocale();
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>('birthday');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState(suggestedStart);
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [hideAddress, setHideAddress] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ url: string; title: string } | null>(null);
  const createUpload = useMutation(trpc.uploads.create.mutationOptions());
  const create = useMutation(trpc.invitations.quickCreate.mutationOptions());
  const busy = createUpload.isPending || create.isPending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const start = fromTunisInput(startsAt);
    if (!start) return;
    try {
      let coverKey: string | null = null;
      if (cover) {
        const ticket = await createUpload.mutateAsync({
          purpose: 'event-cover',
          contentType: cover.type,
          size: cover.size,
        });
        coverKey = await putFile(ticket, cover);
      }
      const { token } = await create.mutateAsync({
        templateKey: kind,
        title,
        startsAt: start,
        venueName: venueName.trim() || null,
        city: city.trim() || null,
        description: description.trim() || null,
        coverKey,
        locationHiddenUntilBooking: hideAddress,
      });
      setCreated({ url: absoluteUrl(`/${locale}/invite/${token}`), title });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (created) {
    return (
      <div
        className="mt-8 space-y-4 rounded-3xl border border-border/70 bg-card p-6 text-center shadow-card sm:p-10"
        data-testid="invite-ready"
      >
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </span>
        <h2 className="font-display text-2xl font-semibold">{t('readyTitle')}</h2>
        <p className="text-muted-foreground">{t('readyHint')}</p>
        <p
          className="ltr-nums rounded-2xl bg-muted px-4 py-3 text-sm break-all"
          dir="ltr"
          data-testid="invite-url"
        >
          {created.url}
        </p>
        <div className="flex justify-center">
          <InviteLinkActions url={created.url} title={created.title} />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mt-8 space-y-8 rounded-3xl border border-border/70 bg-card p-5 shadow-card sm:p-8"
    >
      <FormSection title={t('kind')} hint={t('kindHint')}>
        <RadioGroup
          value={kind}
          onValueChange={(v) => setKind(v as Kind)}
          className="grid gap-3 sm:grid-cols-2"
        >
          {KINDS.map(({ kind: k, icon: Icon }) => {
            const selected = kind === k;
            return (
              <Label
                key={k}
                htmlFor={`kind-${k}`}
                className={cn(
                  'group relative flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-[background-color,border-color,box-shadow] duration-200',
                  selected
                    ? 'border-primary bg-primary-soft/60 ring-1 ring-primary/20'
                    : 'border-border/80 bg-background hover:border-primary/40 hover:bg-primary-soft/30',
                )}
              >
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground group-hover:text-primary',
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t(`kinds.${k}`)}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    {t(`kindHints.${k}`)}
                  </span>
                </span>
                <RadioGroupItem id={`kind-${k}`} value={k} />
              </Label>
            );
          })}
        </RadioGroup>
      </FormSection>

      <FormSection title={t('eventDetails')} hint={t('eventDetailsHint')}>
        <Field id="host-title" label={t('title')} required>
          <Input
            id="host-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            required
            minLength={3}
            maxLength={120}
            data-testid="host-title"
          />
        </Field>
        <Field id="host-message" label={t('message')}>
          <Textarea
            id="host-message"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder={t('messagePlaceholder')}
            className="resize-none"
          />
          <p className="ltr-nums text-end text-xs text-muted-foreground">
            {description.length}/2000
          </p>
        </Field>
      </FormSection>

      <FormSection
        title={t('when')}
        hint={t('whenHint')}
        className="rounded-2xl border border-border/70 bg-muted/40 p-5"
      >
        <Field id="host-when" label={t('when')} required>
          <Input
            id="host-when"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </Field>
      </FormSection>

      <FormSection title={t('whereTitle')} hint={t('whereHint')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="host-where" label={t('where')}>
            <Input
              id="host-where"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              maxLength={120}
              placeholder={t('wherePlaceholder')}
            />
          </Field>
          <Field id="host-city" label={t('city')}>
            <Input
              id="host-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
              placeholder={t('cityPlaceholder')}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-5 rounded-2xl border border-border/70 bg-muted/40 px-4 py-4">
          <div className="min-w-0">
            <Label htmlFor="host-hide" className="cursor-pointer font-semibold">
              {t('hideAddress')}
            </Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t('locationHint')}
            </p>
          </div>
          <Switch id="host-hide" checked={hideAddress} onCheckedChange={setHideAddress} />
        </div>
      </FormSection>

      <FormSection title={t('coverPhoto')} hint={t('coverPhotoHint')}>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={tWizard('cover')}
          onChange={(e) => setCover(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="group flex min-h-40 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-background px-6 py-8 text-center transition-[background-color,border-color] duration-200 hover:border-primary/50 hover:bg-primary-soft/30 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none"
        >
          <span className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform group-hover:scale-105">
            <ImagePlus className="size-6" aria-hidden="true" />
          </span>
          <span className="font-semibold">
            {cover ? tWizard('changeCover') : tWizard('uploadCover')}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">{t('coverFormats')}</span>
          {cover ? (
            <span className="mt-3 max-w-full truncate rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow-xs">
              {cover.name}
            </span>
          ) : null}
        </button>
      </FormSection>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{t('createHint')}</p>
        <Button
          type="submit"
          size="lg"
          className="sm:min-w-44"
          disabled={busy}
          data-testid="host-create"
        >
          {busy ? t('creating') : t('create')}
        </Button>
      </div>
    </form>
  );
}
