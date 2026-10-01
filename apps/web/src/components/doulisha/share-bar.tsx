'use client';

import { Check, Download, Image as ImageIcon, Link2, Send, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { FacebookIcon, WhatsAppIcon } from './social-icons';

/** Adds the share channel to the link, so bookings can be traced back to it (SHR-04). */
function withUtm(url: string, source: string): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', 'share');
  u.searchParams.set('utm_campaign', 'event');
  return u.toString();
}

type ImageFormat = 'post' | 'story' | 'invitation';
const FORMATS: ImageFormat[] = ['post', 'story', 'invitation'];

/**
 * One-tap sharing of an event (SHR-01): WhatsApp, Facebook, Messenger, copy
 * link, the phone's share sheet, and ready-made images (SHR-02). On phones the
 * images go straight to the share sheet, so a story reaches Instagram or
 * TikTok (section 9.2); elsewhere they download and the link is copied.
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
  const [imagesOpen, setImagesOpen] = useState(false);
  const [files, setFiles] = useState<Partial<Record<ImageFormat, File>>>({});
  const [shareFiles, setShareFiles] = useState(false);

  // Fetch the images when the dialog opens: the share sheet must open right on
  // the tap (Safari refuses it after waiting for a download).
  useEffect(() => {
    if (!imagesOpen || typeof navigator.canShare !== 'function') return;
    let cancelled = false;
    void Promise.all(
      FORMATS.map(async (format) => {
        const response = await fetch(`${imageBase}&format=${format}`);
        if (!response.ok) return null;
        const blob = await response.blob();
        return [
          format,
          new File([blob], `doulisha-${format}.jpg`, { type: blob.type || 'image/jpeg' }),
        ] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        const ready = Object.fromEntries(entries.filter((e) => e !== null));
        setFiles(ready);
        const first = Object.values(ready)[0];
        setShareFiles(Boolean(first && navigator.canShare({ files: [first] })));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [imagesOpen, imageBase]);

  async function shareImage(format: ImageFormat) {
    const file = files[format];
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: `${message} ${withUtm(url, format)}` });
    } catch {
      // The person closed the share sheet.
    }
  }

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
  return (
    <section aria-labelledby="share-title" className="space-y-4">
      <h2 id="share-title" className="flex items-center gap-2 font-sans text-lg font-semibold">
        <Share2 className="size-5 text-primary" aria-hidden="true" />
        {t('title')}
      </h2>
      <div className="flex flex-wrap gap-2" data-testid="share-bar">
        <Button asChild variant="outline">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" data-testid="share-whatsapp">
            <WhatsAppIcon className="size-5 text-[#25A55F]" />
            {t('whatsapp')}
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={facebook} target="_blank" rel="noopener noreferrer">
            <FacebookIcon className="size-5 text-[#1877F2]" />
            {t('facebook')}
          </a>
        </Button>
        <Button asChild variant="outline" className="lg:hidden">
          <a href={messenger}>
            <Send aria-hidden="true" />
            {t('messenger')}
          </a>
        </Button>
        <Button variant="outline" onClick={() => void copy()} data-testid="share-copy">
          {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          <span aria-live="polite">{copied ? t('copied') : t('copy')}</span>
        </Button>
        <Button variant="outline" onClick={() => void nativeShare()}>
          <Share2 aria-hidden="true" />
          {t('more')}
        </Button>
        <Dialog open={imagesOpen} onOpenChange={setImagesOpen}>
          <DialogTrigger asChild>
            <Button
              variant="soft"
              className="h-auto min-h-11 w-full py-2.5 whitespace-normal"
              data-testid="share-images"
            >
              <ImageIcon aria-hidden="true" />
              {t('images')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogTitle>{t('images')}</DialogTitle>
            <DialogDescription>
              {shareFiles ? t('imagesShareHint') : t('imagesDownloadHint')}
            </DialogDescription>
            <ul className="grid grid-cols-3 gap-3">
              {FORMATS.map((format) => (
                <li
                  key={format}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-background p-2 text-center text-sm font-medium"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated image, already sized and compressed by the route */}
                  <img
                    src={`${imageBase}&format=${format}`}
                    alt={t(format)}
                    loading="lazy"
                    className="aspect-[4/5] w-full rounded-xl bg-muted object-contain"
                  />
                  <span>{t(format)}</span>
                  {shareFiles && files[format] ? (
                    <Button
                      size="sm"
                      className="min-h-11 w-full"
                      onClick={() => void shareImage(format)}
                      data-testid={`share-image-${format}`}
                    >
                      <Share2 aria-hidden="true" />
                      {t('shareImage')}
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="secondary" className="min-h-11 w-full">
                      <a
                        href={`${imageBase}&format=${format}&download=1`}
                        download
                        onClick={() => void copy()}
                        data-testid={`download-image-${format}`}
                      >
                        <Download aria-hidden="true" />
                        {t('download')}
                      </a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
