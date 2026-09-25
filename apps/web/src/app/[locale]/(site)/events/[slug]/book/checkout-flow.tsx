'use client';

import { formatEventDateTime, formatPrice, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import { Check, Minus, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { ensureSession } from '@/lib/guest';
import { readUtm } from '@/lib/utm';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';
import type { RouterOutputs } from '@/trpc/types';

type Options = RouterOutputs['booking']['options'];
type PaymentChoice = Options['payments'][number];

interface Person {
  fullName: string;
  phone: string;
  email: string;
}

const STEPS = ['tickets', 'details', 'payment'] as const;

/**
 * PAY-01 checkout in three steps, with the order summary always visible
 * (UX: Airbnb / Eventbrite). Local payment methods first.
 */
export function CheckoutFlow({
  event,
  options,
  buyer,
}: {
  event: {
    id: string;
    slug: string;
    title: string;
    startsAt: Date;
    city: string | null;
    coverUrl: string | null;
    cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  };
  options: Options;
  buyer: { name: string; phone: string | null } | null;
}) {
  const t = useTranslations('Checkout');
  const tEvent = useTranslations('Event');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();

  const [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    options.tickets.length === 1 && options.tickets[0] ? { [options.tickets[0].id]: 1 } : {},
  );
  const [payDeposit, setPayDeposit] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [meetingPointId, setMeetingPointId] = useState<string>(options.meetingPoints[0]?.id ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [payment, setPayment] = useState<PaymentChoice | null>(options.payments[0] ?? null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const lines = options.tickets
    .map((ticket) => ({ ticket, quantity: quantities[ticket.id] ?? 0 }))
    .filter((l) => l.quantity > 0);
  const places = lines.reduce((s, l) => s + l.quantity * l.ticket.seatsPerTicket, 0);
  const total = lines.reduce((s, l) => s + l.quantity * l.ticket.priceMillimes, 0);
  const canDeposit =
    options.registrationType === 'deposit' &&
    lines.some((l) => (l.ticket.depositMillimes ?? 0) > 0);
  // What a deposit would cost now (types without a deposit are paid in full), as the server computes it.
  const depositDue = lines.reduce(
    (s, l) =>
      s +
      l.quantity *
        ((l.ticket.depositMillimes ?? 0) > 0
          ? Math.min(l.ticket.depositMillimes ?? 0, l.ticket.priceMillimes)
          : l.ticket.priceMillimes),
    0,
  );
  const dueNow = payDeposit && canDeposit ? depositDue : total;
  const waitlist = options.placesLeft !== null && places > options.placesLeft;

  /** Keeps one form per place; person 1 is prefilled with the signed-in member. */
  function syncPeople(count: number) {
    setPeople((current) =>
      Array.from(
        { length: count },
        (_, i) =>
          current[i] ??
          (i === 0 && buyer
            ? { fullName: buyer.name, phone: buyer.phone ?? '', email: '' }
            : { fullName: '', phone: '', email: '' }),
      ),
    );
  }

  function changeQuantity(ticketId: string, delta: number, max: number) {
    setQuantities((q) => ({
      ...q,
      [ticketId]: Math.max(0, Math.min(max, (q[ticketId] ?? 0) + delta)),
    }));
  }

  const book = useMutation(trpc.booking.create.mutationOptions());

  async function submit() {
    setError(null);
    try {
      await ensureSession();
      const result = await book.mutateAsync({
        eventId: event.id,
        lines: lines.map((l) => ({ ticketTypeId: l.ticket.id, quantity: l.quantity })),
        attendees: people.map((p) => ({
          fullName: p.fullName.trim(),
          phone: p.phone.trim() || null,
          email: p.email.trim() || null,
        })),
        answers,
        meetingPointId: meetingPointId || null,
        payment: dueNow > 0 && !waitlist ? payment : null,
        payDeposit: payDeposit && canDeposit,
        idempotencyKey,
        utm: readUtm(),
      });
      if (result.redirectUrl) window.location.assign(result.redirectUrl);
      else router.push(`/tickets/${result.reference}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const detailsValid =
    people.length === places &&
    people.every((p) => p.fullName.trim().length >= 2) &&
    (options.meetingPoints.length === 0 || meetingPointId !== '') &&
    options.questions.every((q) => !q.required || (answers[q.id] ?? '').trim() !== '');

  const stepLabels = [t('stepTickets'), t('stepDetails'), t('stepPayment')];

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 pb-28 sm:px-6 lg:grid-cols-[1fr_20rem] lg:pb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('title', { title: event.title })}</h1>

        <ol className="mt-4 flex gap-2" aria-label={t('summary')}>
          {STEPS.map((name, i) => (
            <li
              key={name}
              aria-current={i === step ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm',
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                    ? 'bg-secondary'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              <span className="ltr-nums flex size-5 items-center justify-center rounded-full bg-background/20 text-xs">
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{stepLabels[i]}</span>
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <section className="mt-6 space-y-3" aria-label={t('stepTickets')}>
            {options.tickets.map((ticket) => {
              const quantity = quantities[ticket.id] ?? 0;
              const max = Math.min(10, ticket.left ?? 10);
              return (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{ticket.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.priceMillimes > 0
                        ? `${formatPrice(ticket.priceMillimes, locale)} ${t('perTicket')}`
                        : tEvent('free')}
                      {ticket.seatsPerTicket > 1
                        ? ` · ${t('seats', { count: ticket.seatsPerTicket })}`
                        : ''}
                    </p>
                    {ticket.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
                    ) : null}
                    {ticket.left !== null && ticket.left <= 10 ? (
                      <p className="mt-1 text-xs font-medium text-highlight">
                        {ticket.left === 0 ? t('soldOut') : t('left', { count: ticket.left })}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2" dir="ltr">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11 rounded-full"
                      aria-label={`${t('remove')} · ${ticket.name}`}
                      disabled={quantity === 0}
                      onClick={() => changeQuantity(ticket.id, -1, max)}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-6 text-center font-semibold" aria-live="polite">
                      {quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11 rounded-full"
                      aria-label={`${t('add')} · ${ticket.name}`}
                      disabled={quantity >= max && !options.waitlistEnabled}
                      onClick={() =>
                        changeQuantity(ticket.id, 1, options.waitlistEnabled ? 10 : max)
                      }
                      data-testid={`add-ticket-${ticket.name}`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {canDeposit ? (
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-card p-4">
                <Checkbox checked={payDeposit} onCheckedChange={(v) => setPayDeposit(v === true)} />
                <span>
                  <span className="font-medium">{t('payDeposit')}</span>
                  <span className="block text-sm text-muted-foreground">
                    {t('depositHint', {
                      deposit: formatPrice(depositDue, locale),
                      balance: formatPrice(total - depositDue, locale),
                    })}
                  </span>
                </span>
              </label>
            ) : null}

            {waitlist ? (
              <p className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
                {t('waitlistNote')}
              </p>
            ) : null}

            <div className="flex justify-end pt-2">
              <Button
                className="min-h-11 rounded-full px-6"
                disabled={places === 0}
                onClick={() => {
                  syncPeople(places);
                  setStep(1);
                }}
              >
                {t('next')}
              </Button>
            </div>
            {places === 0 ? (
              <p className="text-end text-sm text-muted-foreground">{t('chooseTickets')}</p>
            ) : null}
          </section>
        ) : null}

        {step === 1 ? (
          <section className="mt-6 space-y-5" aria-label={t('stepDetails')}>
            {people.map((person, i) => (
              <fieldset key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
                <legend className="px-1 text-sm font-semibold">
                  {t('person', { n: i + 1 })}
                  {i === 0 && buyer ? ` (${t('you')})` : ''}
                </legend>
                <div className="space-y-1.5">
                  <Label htmlFor={`name-${i}`}>{t('fullName')}</Label>
                  <Input
                    id={`name-${i}`}
                    autoComplete={i === 0 ? 'name' : 'off'}
                    value={person.fullName}
                    onChange={(e) =>
                      setPeople((ps) =>
                        ps.map((p, j) => (j === i ? { ...p, fullName: e.target.value } : p)),
                      )
                    }
                    className="h-11"
                    required
                  />
                </div>
                {i === 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone-0">{t('phone')}</Label>
                      <Input
                        id="phone-0"
                        type="tel"
                        dir="ltr"
                        autoComplete="tel"
                        value={person.phone}
                        onChange={(e) =>
                          setPeople((ps) =>
                            ps.map((p, j) => (j === 0 ? { ...p, phone: e.target.value } : p)),
                          )
                        }
                        className="h-11 text-start"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email-0">{t('email')}</Label>
                      <Input
                        id="email-0"
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        value={person.email}
                        onChange={(e) =>
                          setPeople((ps) =>
                            ps.map((p, j) => (j === 0 ? { ...p, email: e.target.value } : p)),
                          )
                        }
                        className="h-11 text-start"
                      />
                    </div>
                  </div>
                ) : null}
              </fieldset>
            ))}

            {options.meetingPoints.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="meeting-point">{t('meetingPoint')}</Label>
                <select
                  id="meeting-point"
                  value={meetingPointId}
                  onChange={(e) => setMeetingPointId(e.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-card px-3"
                >
                  {options.meetingPoints.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatEventDateTime(new Date(p.meetAt), locale)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {options.questions.length > 0 ? (
              <fieldset className="space-y-3">
                <legend className="font-semibold">{t('questions')}</legend>
                {options.questions.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <Label htmlFor={`q-${q.id}`}>
                      {q.label}
                      {q.required ? <span className="text-highlight"> *</span> : null}
                    </Label>
                    {q.type === 'select' ? (
                      <select
                        id={`q-${q.id}`}
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        className="h-11 w-full rounded-md border border-input bg-card px-3"
                      >
                        <option value="">{t('choose')}</option>
                        {q.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={`q-${q.id}`}
                        type={q.type === 'number' ? 'number' : 'text'}
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        className="h-11"
                      />
                    )}
                  </div>
                ))}
              </fieldset>
            ) : null}

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" className="min-h-11" onClick={() => setStep(0)}>
                {t('back')}
              </Button>
              <Button
                className="min-h-11 rounded-full px-6"
                disabled={!detailsValid}
                onClick={() => setStep(2)}
              >
                {t('next')}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="mt-6 space-y-5" aria-label={t('stepPayment')}>
            {dueNow > 0 && !waitlist ? (
              <fieldset className="space-y-2">
                <legend className="mb-2 font-semibold">{t('paymentMethod')}</legend>
                {options.payments.map((method) => (
                  <label
                    key={method}
                    className={cn(
                      'flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4',
                      payment === method
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border',
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method}
                      checked={payment === method}
                      onChange={() => setPayment(method)}
                      className="mt-1 size-4 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="font-medium">{t(`methods.${method}`)}</span>
                      <span className="block text-sm text-muted-foreground">
                        {t(`methodHints.${method}`)}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : null}
            {waitlist ? (
              <p className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
                {t('waitlistNote')}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {t('policyNote', { policy: tEvent(`policy.${event.cancellationPolicy}`) })}
            </p>
            {!buyer ? <p className="text-sm text-muted-foreground">{t('guestNote')}</p> : null}
            {error ? (
              <p role="alert" className="rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
                {error}
              </p>
            ) : null}
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" className="min-h-11" onClick={() => setStep(1)}>
                {t('back')}
              </Button>
              <Button
                className="min-h-11 rounded-full px-6"
                disabled={book.isPending || (dueNow > 0 && !waitlist && !payment)}
                onClick={() => void submit()}
                data-testid="confirm-booking"
              >
                {book.isPending
                  ? t('processing')
                  : waitlist
                    ? t('confirmWaitlist')
                    : dueNow > 0
                      ? t('confirm', { amount: formatPrice(dueNow, locale) })
                      : t('confirmFree')}
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="order-first lg:order-none">
        <div className="overflow-hidden rounded-xl border border-border bg-card lg:sticky lg:top-24">
          {event.coverUrl ? (
            <div className="relative hidden aspect-[16/9] lg:block">
              <Image src={event.coverUrl} alt="" fill sizes="20rem" className="object-cover" />
            </div>
          ) : null}
          <div className="space-y-2 p-4 text-sm">
            <p className="font-semibold">{event.title}</p>
            <p className="text-muted-foreground">
              {event.city ? `${event.city} · ` : ''}
              {formatEventDateTime(new Date(event.startsAt), locale)}
            </p>
            {lines.length > 0 ? (
              <ul className="space-y-1 border-t border-border pt-2">
                {lines.map((l) => (
                  <li key={l.ticket.id} className="flex justify-between gap-2">
                    <span>
                      <span className="ltr-nums">{l.quantity}</span> × {l.ticket.name}
                    </span>
                    <span>{formatPrice(l.quantity * l.ticket.priceMillimes, locale)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>{t('total')}</span>
              <span data-testid="checkout-total">{formatPrice(total, locale)}</span>
            </p>
            {dueNow !== total ? (
              <p className="flex justify-between text-highlight">
                <span>{t('dueNow')}</span>
                <span>{formatPrice(dueNow, locale)}</span>
              </p>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
