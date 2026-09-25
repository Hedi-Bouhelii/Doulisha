import { toTunisInput } from '@doulisha/i18n';
import { getTranslations } from 'next-intl/server';

import { resolveLocale } from '@/i18n/locale';

import { QuickInviteForm } from './quick-invite-form';

/** Suggests tomorrow at 20:00, Tunisia time; the host changes it in one tap. */
function tomorrowEvening(now = new Date()): string {
  const tomorrow = new Date(now.getTime() + 86_400_000);
  return `${toTunisInput(tomorrow).slice(0, 10)}T20:00`;
}

/** INV-01: a private event in one short form, then a link to share. */
export default async function NewPrivateEventPage({ params }: PageProps<'/[locale]/host/new'>) {
  await resolveLocale(params);
  const t = await getTranslations('Host');
  return (
    <div>
      <h1 className="text-3xl font-bold">{t('newTitle')}</h1>
      <p className="mt-2 text-muted-foreground">{t('newHint')}</p>
      <QuickInviteForm suggestedStart={tomorrowEvening()} />
    </div>
  );
}
