'use client';

import { fromTunisInput } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, ImagePlus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

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
import { useTRPC } from '@/trpc/client';

import { InviteLinkActions } from '../invite-link-actions';

type Kind = 'birthday' | 'private_gathering';

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

  async function submit(e: React.FormEvent) {
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
        className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6 text-center"
        data-testid="invite-ready"
      >
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
        <h2 className="font-sans text-xl font-semibold">{t('readyTitle')}</h2>
        <p className="text-muted-foreground">{t('readyHint')}</p>
        <p
          className="ltr-nums rounded-lg bg-muted p-3 text-sm break-all"
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
    <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('kind')}</legend>
        <RadioGroup
          value={kind}
          onValueChange={(v) => setKind(v as Kind)}
          className="flex flex-wrap gap-x-6"
        >
          {(['birthday', 'private_gathering'] as const).map((k) => (
            <div key={k} className="flex min-h-11 items-center gap-3">
              <RadioGroupItem id={`kind-${k}`} value={k} />
              <Label htmlFor={`kind-${k}`}>{t(`kinds.${k}`)}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
      <Field id="host-title" label={t('title')}>
        <Input
          id="host-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('titlePlaceholder')}
          required
          minLength={3}
          maxLength={120}
          className="h-11"
          data-testid="host-title"
        />
      </Field>
      <Field id="host-when" label={t('when')}>
        <Input
          id="host-when"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
          className="h-11"
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="host-where" label={t('where')}>
          <Input
            id="host-where"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            maxLength={120}
            className="h-11"
          />
        </Field>
        <Field id="host-city" label={t('city')}>
          <Input
            id="host-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            className="h-11"
          />
        </Field>
      </div>
      <Field id="host-message" label={t('message')}>
        <Textarea
          id="host-message"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
        />
      </Field>
      <div className="flex min-h-11 items-center justify-between gap-4">
        <Label htmlFor="host-hide" className="leading-snug">
          {t('hideAddress')}
        </Label>
        <Switch id="host-hide" checked={hideAddress} onCheckedChange={setHideAddress} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={tWizard('cover')}
          onChange={(e) => setCover(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus aria-hidden="true" />
          {cover ? tWizard('changeCover') : tWizard('uploadCover')}
        </Button>
        {cover ? (
          <span className="truncate text-sm text-muted-foreground">{cover.name}</span>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="min-h-11 w-full rounded-full sm:w-auto sm:px-8"
        disabled={busy}
        data-testid="host-create"
      >
        {busy ? t('creating') : t('create')}
      </Button>
    </form>
  );
}
