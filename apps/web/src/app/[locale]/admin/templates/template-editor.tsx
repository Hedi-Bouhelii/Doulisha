'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { useTRPC } from '@/trpc/client';

/** One template: activation switch and JSON definition, saved as a new version. */
export function TemplateEditor({
  templateKey,
  name,
  category,
  version,
  isActive,
  definition,
}: {
  templateKey: string;
  name: string;
  category: string;
  version: number;
  isActive: boolean;
  definition: string;
}) {
  const t = useTranslations('AdminTemplates');
  const trpc = useTRPC();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [active, setActive] = useState(isActive);
  const [json, setJson] = useState(definition);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const update = useMutation(trpc.admin.updateTemplate.mutationOptions());

  async function save() {
    setMessage(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setMessage({ ok: false, text: t('invalidJson') });
      return;
    }
    try {
      await update.mutateAsync({ key: templateKey, definition: parsed, isActive: active });
      setMessage({ ok: true, text: t('saved') });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    }
  }

  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 px-4 py-2">
        <span className="font-semibold">{name}</span>
        <span className="text-sm text-muted-foreground">
          {category} · <code dir="ltr">{templateKey}</code> · {t('version', { version })}
        </span>
        {isActive ? (
          <span className="rounded-full bg-cat-outdoor-bg px-2 text-xs font-semibold text-cat-outdoor-fg">
            {t('active')}
          </span>
        ) : null}
      </summary>
      <div className="space-y-3 border-t border-border p-4">
        <div className="flex min-h-11 items-center gap-3">
          <Switch id={`active-${templateKey}`} checked={active} onCheckedChange={setActive} />
          <Label htmlFor={`active-${templateKey}`}>{t('active')}</Label>
        </div>
        <Label htmlFor={`def-${templateKey}`}>{t('definition')}</Label>
        <Textarea
          id={`def-${templateKey}`}
          dir="ltr"
          spellCheck={false}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={18}
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="min-h-11"
            onClick={() => void save()}
            disabled={update.isPending}
          >
            {t('save')}
          </Button>
          {message ? (
            <p
              role={message.ok ? 'status' : 'alert'}
              className={`text-sm whitespace-pre-line ${message.ok ? 'text-success' : 'text-highlight'}`}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
}
