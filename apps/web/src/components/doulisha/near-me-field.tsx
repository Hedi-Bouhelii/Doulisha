'use client';

import { LocateFixed } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { locate } from './near-me';

/**
 * "Near me" in the explore filters (DSC-02): ticking it asks for the position
 * and fills hidden lat/lng fields of the surrounding GET form.
 */
export function NearMeField({ initial }: { initial: { lat: number; lng: number } | null }) {
  const t = useTranslations('Explore');
  const [position, setPosition] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'locating' | 'denied'>('idle');

  async function toggle(checked: boolean) {
    if (!checked) {
      setPosition(null);
      return;
    }
    setStatus('locating');
    const found = await locate();
    setStatus(found ? 'idle' : 'denied');
    setPosition(found);
  }

  return (
    <div className="space-y-1">
      <div className="flex min-h-11 items-center gap-2">
        <Checkbox
          id="near-me"
          checked={position !== null}
          disabled={status === 'locating'}
          onCheckedChange={(checked) => void toggle(checked === true)}
        />
        <Label htmlFor="near-me" className="flex items-center gap-1.5">
          <LocateFixed className="size-4" aria-hidden="true" />
          {status === 'locating' ? t('locating') : t('nearMe')}
        </Label>
      </div>
      {position ? (
        <>
          <input type="hidden" name="lat" value={position.lat.toFixed(4)} />
          <input type="hidden" name="lng" value={position.lng.toFixed(4)} />
        </>
      ) : null}
      {status === 'denied' ? (
        <p className="text-xs text-muted-foreground" role="status">
          {t('locationDenied')}
        </p>
      ) : null}
    </div>
  );
}
