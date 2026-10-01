'use client';

import { formatPrice, formatTime, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Banknote, Camera, CameraOff, CheckCircle2, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';

/** The Shape Detection API is not in TypeScript's DOM types yet. */
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

type Result =
  | { tone: 'ok' | 'warn' | 'error'; text: string }
  /** Money still due: collect it, then check in (ADR 0018). */
  | { tone: 'collect'; text: string; code: string };

/**
 * Door check-in: the camera reads the QR (BarcodeDetector, Chrome on Android)
 * and the code can always be typed. Each result is shown big and coloured so
 * it reads at arm's length.
 */
export function Scanner({
  eventId,
  initialPresent,
  total,
}: {
  eventId: string;
  initialPresent: number;
  total: number;
}) {
  const t = useTranslations('Organizer');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const checkIn = useMutation(trpc.organizer.checkIn.mutationOptions());
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const lastCode = useRef<{ code: string; at: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState('');
  const [present, setPresent] = useState(initialPresent);
  const [result, setResult] = useState<Result | null>(null);
  const [cameraError, setCameraError] = useState(false);

  async function submit(value: string, collect = false) {
    const normalized = value.trim().toUpperCase();
    if (normalized.length < 6) return;
    try {
      const outcome = await checkIn.mutateAsync({ eventId, code: normalized, collect });
      if (outcome.status === 'payment_due') {
        setResult({
          tone: 'collect',
          code: normalized,
          text: t('collectFirst', {
            name: outcome.fullName,
            amount: formatPrice(outcome.dueMillimes, locale),
          }),
        });
        setCode('');
        return;
      }
      if (outcome.status === 'checked_in') {
        setPresent((n) => n + 1);
        setResult({ tone: 'ok', text: t('checkInOk', { name: outcome.fullName }) });
      } else if (outcome.status === 'already') {
        setResult({
          tone: 'warn',
          text: `${outcome.fullName}: ${t('checkInAlready', { time: formatTime(outcome.checkedInAt, locale) })}`,
        });
      } else {
        setResult({ tone: 'error', text: t('checkInInvalid') });
      }
      setCode('');
    } catch (e) {
      setResult({ tone: 'error', text: errorMessage(e) });
    }
  }

  function stop() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setScanning(false);
  }

  async function start() {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(true);
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (video.current) {
        video.current.srcObject = stream.current;
        await video.current.play();
      }
      setScanning(true);
      const detector = new Detector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!stream.current || !video.current) return;
        try {
          const [found] = await detector.detect(video.current);
          const now = Date.now();
          // Ignore the same code for three seconds while it stays in front of the camera.
          if (
            found &&
            !(lastCode.current?.code === found.rawValue && now - lastCode.current.at < 3000)
          ) {
            lastCode.current = { code: found.rawValue, at: now };
            await submit(found.rawValue);
          }
        } catch {
          // A frame that cannot be read; try the next one.
        }
        setTimeout(() => void tick(), 300);
      };
      void tick();
    } catch {
      setCameraError(true);
      stop();
    }
  }

  useEffect(() => stop, []);

  const Icon =
    result?.tone === 'ok'
      ? CheckCircle2
      : result?.tone === 'collect'
        ? Banknote
        : result?.tone === 'warn'
          ? AlertTriangle
          : XCircle;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:p-5">
        <p className="ltr-nums text-2xl font-bold tracking-tight" data-testid="checkin-count">
          {t('present', { count: present })} / {total}
        </p>
        <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-300"
            style={{ width: `${total > 0 ? Math.round((present / total) * 100) : 0}%` }}
          />
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-3xl bg-black shadow-raised',
          scanning ? 'block' : 'hidden',
        )}
      >
        <video ref={video} muted playsInline className="aspect-square w-full object-cover" />
      </div>
      <Button
        type="button"
        size="lg"
        variant={scanning ? 'outline' : 'default'}
        className="w-full"
        onClick={() => (scanning ? stop() : void start())}
      >
        {scanning ? <CameraOff aria-hidden="true" /> : <Camera aria-hidden="true" />}
        {scanning ? t('stopScan') : t('scan')}
      </Button>
      {cameraError ? (
        <p className="rounded-2xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
          {t('cameraUnavailable')}
        </p>
      ) : null}

      <form
        className="space-y-2 rounded-2xl border border-border/70 bg-card p-4 shadow-card sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
      >
        <Label htmlFor="ticket-code">{t('codeLabel')}</Label>
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          <Input
            id="ticket-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            dir="ltr"
            className="ltr-nums h-12 font-mono text-lg tracking-widest uppercase"
            data-testid="checkin-code"
          />
          <Button type="submit" size="lg" disabled={checkIn.isPending} data-testid="checkin-submit">
            {t('checkInButton')}
          </Button>
        </div>
      </form>

      {result ? (
        <div
          role="status"
          data-testid="checkin-result"
          data-tone={result.tone}
          className={cn(
            'flex items-start gap-3 rounded-2xl border p-4 text-lg font-semibold sm:p-5',
            result.tone === 'ok' && 'border-success/20 bg-success-soft text-success',
            (result.tone === 'warn' || result.tone === 'collect') &&
              'border-warning/20 bg-warning-soft text-warning',
            result.tone === 'error' && 'border-destructive/20 bg-destructive-soft text-destructive',
          )}
        >
          <Icon className="size-7 shrink-0" aria-hidden="true" />
          <div className="flex-1 space-y-3">
            <p>{result.text}</p>
            {result.tone === 'collect' ? (
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={checkIn.isPending}
                onClick={() => void submit(result.code, true)}
                data-testid="collect-and-check-in"
              >
                <Banknote aria-hidden="true" />
                {t('collectedCheckIn')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
