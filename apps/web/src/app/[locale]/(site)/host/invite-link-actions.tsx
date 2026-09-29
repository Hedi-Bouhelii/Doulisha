'use client';

import { Check, Link2, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

/** Copy the invitation link or send it on WhatsApp (INV-02). */
export function InviteLinkActions({ url, title }: { url: string; title: string }) {
  const t = useTranslations('Organizer');
  const tShare = useTranslations('Share');
  const tHost = useTranslations('Host');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t('copyInvite'), url);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 rounded-full"
        onClick={() => void copy()}
        data-testid="copy-invite"
      >
        {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        <span aria-live="polite">{copied ? tShare('copied') : t('copyInvite')}</span>
      </Button>
      <Button asChild variant="outline" size="sm" className="min-h-11 rounded-full">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle aria-hidden="true" />
          {tShare('whatsapp')}
        </a>
      </Button>
      <Button asChild size="sm" className="min-h-11 rounded-full">
        <a href={url} data-testid="open-invite">
          {tHost('openInvitation')}
        </a>
      </Button>
    </div>
  );
}
