'use client';

import {
  Check,
  Download,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  Send,
  Share2,
  ThumbsUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/** Adds the share channel to the link, so bookings can be traced back to it (SHR-04). */
function withUtm(url: string, source: string): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', 'share');
  u.searchParams.set('utm_campaign', 'event');
  return u.toString();
}

/**
 * One-tap sharing of an event (SHR-01): WhatsApp, Facebook, Messenger, copy
 * link, the phone's share sheet, and ready-made images (SHR-02).
 */
export function ShareBar({
  url,
  message,
  imageBase,
}: {
  /** Absolute event URL. */
  url: string;
  /** Short text sent with the link. */
  message: string;
  /** Share image URL without `format` (e.g. /api/og/event?slug=…&locale=fr). */
  imageBase: string;
}) {
  const t = useTranslations('Share');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(withUtm(url, 'copy'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t('copy'), withUtm(url, 'copy'));
    }
  }

  async function nativeShare() {
    if (typeof navigator.share !== 'function') return copy();
    try {
      await navigator.share({ title: message, text: message, url: withUtm(url, 'native') });
    } catch {
      // The person closed the share sheet.
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${message} ${withUtm(url, 'whatsapp')}`)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(withUtm(url, 'facebook'))}`;
  const messenger = `fb-messenger://share/?link=${encodeURIComponent(withUtm(url, 'messenger'))}`;
  const linkClass = 'min-h-11 rounded-full';

  return (
    <section aria-labelledby="share-title" className="space-y-3">
      <h2 id="share-title" className="font-sans text-base font-semibold">
        {t('title')}
      </h2>
      <div className="flex flex-wrap gap-2" data-testid="share-bar">
        <Button asChild variant="outline" className={linkClass}>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" data-testid="share-whatsapp">
            <MessageCircle aria-hidden="true" />
            {t('whatsapp')}
          </a>
        </Button>
        <Button asChild variant="outline" className={linkClass}>
          <a href={facebook} target="_blank" rel="noopener noreferrer">
            <ThumbsUp aria-hidden="true" />
            {t('facebook')}
          </a>
        </Button>
        <Button asChild variant="outline" className={`${linkClass} lg:hidden`}>
          <a href={messenger}>
            <Send aria-hidden="true" />
            {t('messenger')}
          </a>
        </Button>
        <Button
          variant="outline"
          className={linkClass}
          onClick={() => void copy()}
          data-testid="share-copy"
        >
          {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          <span aria-live="polite">{copied ? t('copied') : t('copy')}</span>
        </Button>
        <Button variant="outline" className={linkClass} onClick={() => void nativeShare()}>
          <Share2 aria-hidden="true" />
          {t('more')}
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className={linkClass} data-testid="share-images">
              <ImageIcon aria-hidden="true" />
              {t('images')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogTitle>{t('images')}</DialogTitle>
            <DialogDescription className="sr-only">{t('images')}</DialogDescription>
            <ul className="grid grid-cols-3 gap-3">
              {(['post', 'story', 'invitation'] as const).map((format) => (
                <li key={format} className="flex flex-col items-center gap-2 text-center text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated image, already sized and compressed by the route */}
                  <img
                    src={`${imageBase}&format=${format}`}
                    alt={t(format)}
                    loading="lazy"
                    className="aspect-[4/5] w-full rounded-lg border border-border bg-muted object-contain"
                  />
                  <span>{t(format)}</span>
                  <Button asChild size="sm" variant="secondary" className="min-h-11 w-full">
                    <a href={`${imageBase}&format=${format}&download=1`} download>
                      <Download aria-hidden="true" />
                      {t('download')}
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
