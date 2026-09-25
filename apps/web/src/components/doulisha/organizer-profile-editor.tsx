'use client';

import { useMutation } from '@tanstack/react-query';
import { Check, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRef, useState } from 'react';

import { Field, NativeSelect } from '@/components/doulisha/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { putFile } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';
import type { RouterOutputs } from '@/trpc/types';

import { socialNetworks } from './social-icons';

type Profile = NonNullable<RouterOutputs['organizer']['myProfile']>;
type LegalStatus = 'association' | 'company' | 'independent';
type ImagePurpose = 'organizer-logo' | 'organizer-cover' | 'organizer-photo';

export const PROFILE_SECTIONS = ['identity', 'activity', 'payment'] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

interface FormState {
  name: string;
  legalStatus: LegalStatus;
  bio: string;
  categories: string[];
  regions: string;
  social: Record<string, string>;
  contactPhone: string;
  contactEmail: string;
  d17Number: string;
  bankName: string;
  rib: string;
  accountHolder: string;
  logo: { key?: string | null; url: string | null };
  cover: { key?: string | null; url: string | null };
}

function toState(profile: Profile): FormState {
  const pay = profile.paymentInstructions;
  return {
    name: profile.name,
    legalStatus: profile.legalStatus,
    bio: profile.bio ?? '',
    categories: profile.categories,
    regions: profile.regions.join(', '),
    social: { ...profile.socialLinks },
    contactPhone: profile.contactPhone ?? '',
    contactEmail: profile.contactEmail ?? '',
    d17Number: pay.d17Number ?? '',
    bankName: pay.bankName ?? '',
    rib: pay.rib ?? '',
    accountHolder: pay.accountHolder ?? '',
    logo: { url: profile.logoUrl },
    cover: { url: profile.coverUrl },
  };
}

const blank = (value: string) => (value.trim() === '' ? undefined : value.trim());

/**
 * ACC-03 organizer profile, in three sections: who you are, what you
 * organize (with past-event photos), how buyers pay you. Onboarding walks
 * through them in order; the profile tab edits any of them.
 */
export function OrganizerProfileEditor({
  profile,
  categories,
  mode,
  onDone,
}: {
  profile: Profile;
  categories: { slug: string; name: string }[];
  mode: 'onboarding' | 'edit';
  onDone: () => void;
}) {
  const t = useTranslations('OrganizerProfile');
  const tOrg = useTranslations('Organizer');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [section, setSection] = useState<ProfileSection>('identity');
  const [form, setForm] = useState<FormState>(() => toState(profile));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const update = useMutation(trpc.organizer.updateProfile.mutationOptions());
  const index = PROFILE_SECTIONS.indexOf(section);
  const set = (patch: Partial<FormState>) => {
    setSaved(false);
    setForm((f) => ({ ...f, ...patch }));
  };

  async function save(): Promise<boolean> {
    setError(null);
    try {
      await update.mutateAsync({
        id: profile.id,
        name: form.name.trim(),
        legalStatus: form.legalStatus,
        bio: blank(form.bio) ?? null,
        categories: form.categories,
        regions: form.regions
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean)
          .slice(0, 10),
        socialLinks: Object.fromEntries(
          socialNetworks.map(({ key }) => [key, blank(form.social[key] ?? '')]),
        ),
        contactPhone: blank(form.contactPhone) ?? null,
        contactEmail: blank(form.contactEmail) ?? null,
        paymentInstructions: {
          d17Number: blank(form.d17Number),
          bankName: blank(form.bankName),
          rib: blank(form.rib),
          accountHolder: blank(form.accountHolder),
        },
        ...(form.logo.key !== undefined ? { logoKey: form.logo.key } : {}),
        ...(form.cover.key !== undefined ? { coverKey: form.cover.key } : {}),
      });
      setForm((f) => ({ ...f, logo: { url: f.logo.url }, cover: { url: f.cover.url } }));
      setSaved(true);
      router.refresh();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  }

  async function next() {
    if (!(await save())) return;
    if (mode === 'onboarding' && index < PROFILE_SECTIONS.length - 1) {
      setSection(PROFILE_SECTIONS[index + 1]!);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onDone();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13rem_1fr]">
      <nav aria-label={t('sections')} className="min-w-0">
        <ol className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {PROFILE_SECTIONS.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => setSection(name)}
                aria-current={name === section ? 'step' : undefined}
                data-testid={`profile-section-${name}`}
                className={cn(
                  'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-start text-sm font-medium whitespace-nowrap',
                  name === section ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                <span
                  className={cn(
                    'ltr-nums flex size-6 shrink-0 items-center justify-center rounded-full text-xs',
                    name === section ? 'bg-primary-foreground/20' : 'bg-muted',
                  )}
                >
                  {i + 1}
                </span>
                {t(`section.${name}`)}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <p className="mb-5 text-sm text-muted-foreground">{t(`sectionHint.${section}`)}</p>
          {section === 'identity' ? (
            <div className="space-y-5">
              <ImagePicker
                label={t('cover')}
                purpose="organizer-cover"
                url={form.cover.url}
                wide
                onUploaded={(key, url) => set({ cover: { key, url } })}
                onRemove={() => set({ cover: { key: null, url: null } })}
              />
              <ImagePicker
                label={t('logo')}
                purpose="organizer-logo"
                url={form.logo.url}
                onUploaded={(key, url) => set({ logo: { key, url } })}
                onRemove={() => set({ logo: { key: null, url: null } })}
              />
              <Field id="org-name" label={tOrg('name')}>
                <Input
                  id="org-name"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  maxLength={80}
                  className="h-11"
                  data-testid="org-name"
                />
              </Field>
              <Field id="org-legal" label={tOrg('legalStatus')}>
                <NativeSelect
                  id="org-legal"
                  value={form.legalStatus}
                  onChange={(e) => set({ legalStatus: e.target.value as LegalStatus })}
                >
                  {(['association', 'company', 'independent'] as const).map((s) => (
                    <option key={s} value={s}>
                      {tOrg(`legal.${s}`)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="org-bio" label={tOrg('bio')} hint={t('bioHint')}>
                <Textarea
                  id="org-bio"
                  value={form.bio}
                  onChange={(e) => set({ bio: e.target.value })}
                  maxLength={1000}
                  rows={5}
                />
              </Field>
            </div>
          ) : null}

          {section === 'activity' ? (
            <div className="space-y-6">
              <fieldset>
                <legend className="mb-2 text-sm font-medium">{t('categories')}</legend>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const on = form.categories.includes(c.slug);
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          set({
                            categories: on
                              ? form.categories.filter((x) => x !== c.slug)
                              : [...form.categories, c.slug].slice(0, 8),
                          })
                        }
                        data-testid={`org-category-${c.slug}`}
                        className={cn(
                          'flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition',
                          on
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:bg-accent',
                        )}
                      >
                        {on ? <Check className="size-4" aria-hidden="true" /> : null}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <Field id="org-regions" label={tOrg('regions')}>
                <Input
                  id="org-regions"
                  value={form.regions}
                  onChange={(e) => set({ regions: e.target.value })}
                  className="h-11"
                />
              </Field>
              <fieldset className="space-y-3">
                <legend className="mb-1 text-sm font-medium">{t('socialLinks')}</legend>
                {socialNetworks.map(({ key, label, Icon }) => (
                  <div key={key} className="flex items-center gap-3">
                    <Icon className="size-5 shrink-0 text-muted-foreground" />
                    <Input
                      type="url"
                      inputMode="url"
                      dir="ltr"
                      aria-label={label}
                      placeholder={key === 'website' ? 'https://' : `https://${key}.com/…`}
                      value={form.social[key] ?? ''}
                      onChange={(e) => set({ social: { ...form.social, [key]: e.target.value } })}
                      className="h-11 text-start"
                      data-testid={`org-social-${key}`}
                    />
                  </div>
                ))}
              </fieldset>
              <PhotoGallery profileId={profile.id} photos={profile.photos} />
            </div>
          ) : null}

          {section === 'payment' ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="org-phone" label={t('contactPhone')} hint={t('contactHint')}>
                  <Input
                    id="org-phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    value={form.contactPhone}
                    onChange={(e) => set({ contactPhone: e.target.value })}
                    className="h-11 text-start"
                  />
                </Field>
                <Field id="org-email" label={t('contactEmail')}>
                  <Input
                    id="org-email"
                    type="email"
                    dir="ltr"
                    value={form.contactEmail}
                    onChange={(e) => set({ contactEmail: e.target.value })}
                    className="h-11 text-start"
                  />
                </Field>
              </div>
              <fieldset className="space-y-4 rounded-lg border border-border p-4">
                <legend className="px-1 text-sm font-medium">{t('paymentTitle')}</legend>
                <p className="text-xs text-muted-foreground">{t('paymentHint')}</p>
                <Field id="org-d17" label={t('d17Number')}>
                  <Input
                    id="org-d17"
                    inputMode="numeric"
                    dir="ltr"
                    value={form.d17Number}
                    onChange={(e) => set({ d17Number: e.target.value })}
                    className="h-11 text-start"
                    data-testid="org-d17"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="org-bank" label={t('bankName')}>
                    <Input
                      id="org-bank"
                      value={form.bankName}
                      onChange={(e) => set({ bankName: e.target.value })}
                      className="h-11"
                    />
                  </Field>
                  <Field id="org-holder" label={t('accountHolder')}>
                    <Input
                      id="org-holder"
                      value={form.accountHolder}
                      onChange={(e) => set({ accountHolder: e.target.value })}
                      className="h-11"
                    />
                  </Field>
                </div>
                <Field id="org-rib" label={t('rib')} hint={t('ribHint')}>
                  <Input
                    id="org-rib"
                    inputMode="numeric"
                    dir="ltr"
                    value={form.rib}
                    onChange={(e) => set({ rib: e.target.value })}
                    className="ltr-nums h-11 text-start tracking-wider"
                  />
                </Field>
              </fieldset>
            </div>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {mode === 'onboarding' && index > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-full"
              onClick={() => setSection(PROFILE_SECTIONS[index - 1]!)}
            >
              {t('previous')}
            </Button>
          ) : (
            <span aria-live="polite" className="text-sm text-success">
              {saved ? tOrg('saved') : ''}
            </span>
          )}
          <Button
            type="button"
            className="min-h-11 rounded-full px-6"
            onClick={() => void next()}
            disabled={update.isPending || form.name.trim().length < 2}
            data-testid="profile-save"
          >
            {update.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {mode === 'onboarding'
              ? index < PROFILE_SECTIONS.length - 1
                ? t('saveContinue')
                : t('finish')
              : tOrg('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function useUpload() {
  const trpc = useTRPC();
  const createUpload = useMutation(trpc.uploads.create.mutationOptions());
  return async (purpose: ImagePurpose, file: File) => {
    const ticket = await createUpload.mutateAsync({
      purpose,
      contentType: file.type,
      size: file.size,
    });
    const key = await putFile(ticket, file);
    return { key, url: ticket.publicUrl ?? '' };
  };
}

function ImagePicker({
  label,
  purpose,
  url,
  wide = false,
  onUploaded,
  onRemove,
}: {
  label: string;
  purpose: 'organizer-logo' | 'organizer-cover';
  url: string | null;
  wide?: boolean;
  onUploaded: (key: string, url: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('OrganizerProfile');
  const errorMessage = useErrorMessage();
  const upload = useUpload();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File) {
    setBusy(true);
    setError(null);
    try {
      const done = await upload(purpose, file);
      onUploaded(done.key, done.url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            'relative overflow-hidden rounded-xl bg-muted',
            wide ? 'aspect-[3/1] w-full max-w-md' : 'size-20',
          )}
        >
          {url ? (
            <Image src={url} alt="" fill sizes={wide ? '448px' : '80px'} className="object-cover" />
          ) : null}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={label}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pick(file);
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 rounded-full"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus aria-hidden="true" />
            )}
            {url ? t('change') : t('upload')}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 text-destructive"
              onClick={onRemove}
            >
              {t('remove')}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-highlight">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Photos of past events, uploaded and removed one by one (saved at once). */
function PhotoGallery({ profileId, photos }: { profileId: string; photos: Profile['photos'] }) {
  const t = useTranslations('OrganizerProfile');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const upload = useUpload();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(photos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = useMutation(trpc.organizer.addPhoto.mutationOptions());
  const remove = useMutation(trpc.organizer.removePhoto.mutationOptions());
  const max = 12;

  async function addFiles(files: FileList) {
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, max - items.length)) {
        const done = await upload('organizer-photo', file);
        const photo = await add.mutateAsync({ profileId, key: done.key });
        setItems((list) => [...list, { id: photo.id, url: photo.url, caption: null }]);
      }
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function drop(id: string) {
    setError(null);
    try {
      await remove.mutateAsync({ photoId: id });
      setItems((list) => list.filter((p) => p.id !== id));
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <section aria-labelledby="gallery-title">
      <h3 id="gallery-title" className="mb-1 text-sm font-medium">
        {t('pastEvents')}{' '}
        <span className="ltr-nums text-muted-foreground">
          ({items.length}/{max})
        </span>
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">{t('photosHint')}</p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((photo) => (
          <li
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
          >
            <Image src={photo.url} alt="" fill sizes="160px" className="object-cover" />
            <button
              type="button"
              onClick={() => void drop(photo.id)}
              aria-label={t('remove')}
              className="absolute end-1 top-1 flex size-9 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
        {items.length < max ? (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:bg-accent"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-5" aria-hidden="true" />
              )}
              {t('addPhotos')}
            </button>
          </li>
        ) : null}
      </ul>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={t('addPhotos')}
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files);
        }}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-highlight">
          {error}
        </p>
      ) : null}
    </section>
  );
}
