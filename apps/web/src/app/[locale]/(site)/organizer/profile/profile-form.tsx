'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Field, NativeSelect } from '@/components/doulisha/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { useTRPC } from '@/trpc/client';

type LegalStatus = 'association' | 'company' | 'independent';

export function ProfileForm({
  profile,
}: {
  profile: {
    id: string;
    name: string;
    bio: string | null;
    legalStatus: LegalStatus;
    regions: string[];
  } | null;
}) {
  const t = useTranslations('Organizer');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [legalStatus, setLegalStatus] = useState<LegalStatus>(
    profile?.legalStatus ?? 'association',
  );
  const [regions, setRegions] = useState(profile?.regions.join(', ') ?? '');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const create = useMutation(trpc.organizer.createProfile.mutationOptions());
  const update = useMutation(trpc.organizer.updateProfile.mutationOptions());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const input = {
      name,
      bio: bio || null,
      legalStatus,
      regions: regions
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      categories: [],
      socialLinks: {},
    };
    try {
      if (profile) await update.mutateAsync({ ...input, id: profile.id });
      else await create.mutateAsync(input);
      setMessage({ ok: true, text: t('saved') });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: errorMessage(error) });
    }
  }

  const pending = create.isPending || update.isPending;
  return (
    <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4" data-testid="profile-form">
      <Field id="org-name" label={t('name')}>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
          className="h-11"
        />
      </Field>
      <Field id="org-bio" label={t('bio')}>
        <Textarea
          id="org-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={1000}
          rows={4}
        />
      </Field>
      <Field id="org-legal" label={t('legalStatus')}>
        <NativeSelect
          id="org-legal"
          value={legalStatus}
          onChange={(e) => setLegalStatus(e.target.value as LegalStatus)}
        >
          {(['association', 'company', 'independent'] as const).map((status) => (
            <option key={status} value={status}>
              {t(`legal.${status}`)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="org-regions" label={t('regions')}>
        <Input
          id="org-regions"
          value={regions}
          onChange={(e) => setRegions(e.target.value)}
          className="h-11"
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" className="min-h-11 rounded-full px-6" disabled={pending}>
          {t('save')}
        </Button>
        {message ? (
          <p
            role={message.ok ? 'status' : 'alert'}
            className={message.ok ? 'text-sm text-success' : 'text-sm text-highlight'}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
