'use client';

import { formatEventDateTime, formatPrice, formatTime, type Locale } from '@doulisha/i18n';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Check,
  ChevronDown,
  CreditCard,
  Landmark,
  MapPin,
  Minus,
  Plus,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { NativeSelect } from '@/components/doulisha/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useRouter } from '@/i18n/navigation';
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

const methodIcons: Record<PaymentChoice, LucideIcon> = {
  online: CreditCard,
  d17: Smartphone,
  bank_transfer: Landmark,
  cash: Banknote,
};

/**
 * PAY-01 checkout in three labelled steps. The order summary stays visible
 * (sidebar on desktop, collapsible card on phones) and the main button sits
 * in a bar at the bottom of the screen on phones. Instead of a greyed-out
 * button, "Continue" says what is missing.
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
  const [showErrors, setShowErrors] = useState(false);
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
  const choosesPayment = dueNow > 0 && !waitlist;

  /** Keeps one entry per place; person 1 is prefilled with the signed-in member. */
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

  function updatePerson(index: number, patch: Partial<Person>) {
    setPeople((ps) => ps.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  /** What still blocks the current step, in plain words. */
  const missing: { field: string; message: string }[] = [];
  if (step === 0 && places === 0) missing.push({ field: 'tickets', message: t('chooseTickets') });
  if (step === 1) {
    people.forEach((p, i) => {
      if (p.fullName.trim().length < 2) {
        missing.push({ field: `name-${i}`, message: t('missingName', { n: i + 1 }) });
      }
    });
    if (options.meetingPoints.length > 0 && !meetingPointId) {
      missing.push({ field: 'meeting-point', message: t('missingMeetingPoint') });
    }
    for (const q of options.questions) {
      if (q.required && !(answers[q.id] ?? '').trim()) {
        missing.push({ field: `q-${q.id}`, message: t('missingAnswer', { question: q.label }) });
      }
    }
  }
  if (step === 2 && choosesPayment && !payment) {
    missing.push({ field: 'payment', message: t('missingPayment') });
  }
  const invalid = (field: string) => showErrors && missing.some((m) => m.field === field);

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
        payment: choosesPayment ? payment : null,
        payDeposit: payDeposit && canDeposit,
        idempotencyKey,
        utm: readUtm(),
      });
      if (result.redirectUrl) window.location.assign(result.redirectUrl);
      else router.push(`/tickets/${result.reference}?booked=1`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function primary() {
    if (missing.length > 0) {
      setShowErrors(true);
      const first = missing[0]!.field;
      document.getElementById(first)?.focus();
      return;
    }
    setShowErrors(false);
    if (step === 0) syncPeople(places);
    if (step < 2) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      void submit();
    }
  }

  const primaryLabel =
    step < 2
      ? t('next')
      : book.isPending
        ? t('processing')
        : waitlist
          ? t('confirmWaitlist')
          : dueNow > 0
            ? t('confirm', { amount: formatPrice(dueNow, locale) })
            : t('confirmFree');
  const primaryTestId = ['checkout-next-details', 'checkout-next-payment', 'confirm-booking'][step];
  const when = formatEventDateTime(event.startsAt, locale);
  const stepLabels = [t('stepTickets'), t('stepDetails'), t('stepPayment')];
  const stepTitles = [t('titleTickets'), t('titleDetails'), t('titlePayment')];

  const summary = (
    <div className="space-y-2 text-sm">
      {lines.length === 0 ? (
        <p className="text-muted-foreground">{t('chooseTickets')}</p>
      ) : (
        <ul className="space-y-1">
          {lines.map((l) => (
            <li key={l.ticket.id} className="flex justify-between gap-2">
              <span>
                <span className="ltr-nums">{l.quantity}</span> × {l.ticket.name}
              </span>
              <span className="ltr-nums">
                {formatPrice(l.quantity * l.ticket.priceMillimes, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-between border-t border-border pt-2 font-semibold">
        <span>{t('total')}</span>
        <span className="ltr-nums" data-testid="checkout-total">
          {formatPrice(total, locale)}
        </span>
      </div>
      {payDeposit && canDeposit ? (
        <div className="flex justify-between text-primary">
          <span>{t('dueNow')}</span>
          <span className="ltr-nums font-semibold">{formatPrice(dueNow, locale)}</span>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4 pb-32 sm:px-6 lg:pb-12">
      <Link
        href={`/events/${event.slug}`}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t('backToEvent')}
      </Link>

      {/* Event header with the summary folded in on phones. */}
      <div className="mt-2 rounded-2xl border border-border bg-card p-3 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {event.coverUrl ? (
              <Image src={event.coverUrl} alt="" fill sizes="56px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{event.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {when}
              {event.city ? ` · ${event.city}` : ''}
            </p>
          </div>
        </div>
        <details className="mt-2 border-t border-border pt-2 [&[open]_.chev]:rotate-180">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold">
            <span>{t('summary')}</span>
            <span className="flex items-center gap-1">
              <span className="ltr-nums">{formatPrice(dueNow, locale)}</span>
              <ChevronDown className="chev size-4 transition-transform" aria-hidden="true" />
            </span>
          </summary>
          <div className="pt-2">{summary}</div>
        </details>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{stepTitles[step]}</h1>
          <ol className="mt-4 grid grid-cols-3 gap-2" aria-label={t('progress')}>
            {STEPS.map((name, i) => (
              <li key={name} aria-current={i === step ? 'step' : undefined} className="min-w-0">
                <div className={cn('h-1.5 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />
                <p
                  className={cn(
                    'mt-1.5 flex items-center gap-1 truncate text-xs font-medium sm:text-sm',
                    i === step ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {i < step ? (
                    <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  ) : null}
                  {stepLabels[i]}
                </p>
              </li>
            ))}
          </ol>

          {step === 0 ? (
            <section className="mt-6 space-y-3" aria-label={t('stepTickets')}>
              <div id="tickets" tabIndex={-1} className="space-y-3 outline-none">
                {options.tickets.map((ticket) => {
                  const quantity = quantities[ticket.id] ?? 0;
                  const max = Math.min(10, ticket.left ?? 10);
                  const soldOut = ticket.left === 0 && !options.waitlistEnabled;
                  return (
                    <div
                      key={ticket.id}
                      className={cn(
                        'flex items-center justify-between gap-4 rounded-2xl border bg-card p-4 transition',
                        quantity > 0 ? 'border-primary ring-1 ring-primary/30' : 'border-border',
                        soldOut && 'opacity-60',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">{ticket.name}</p>
                        <p className="text-sm">
                          <span className="font-semibold text-primary">
                            {ticket.priceMillimes > 0
                              ? formatPrice(ticket.priceMillimes, locale)
                              : tEvent('free')}
                          </span>
                          {ticket.seatsPerTicket > 1 ? (
                            <span className="text-muted-foreground">
                              {' '}
                              · {t('seats', { count: ticket.seatsPerTicket })}
                            </span>
                          ) : null}
                        </p>
                        {ticket.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
                        ) : null}
                        {ticket.left !== null && ticket.left <= 10 ? (
                          <p className="mt-1 text-xs font-semibold text-highlight">
                            {ticket.left === 0 ? t('soldOut') : t('left', { count: ticket.left })}
                          </p>
                        ) : null}
                      </div>
                      <div
                        className="flex shrink-0 items-center gap-1 rounded-full border border-border p-1"
                        dir="ltr"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-10 rounded-full"
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
                          variant="ghost"
                          size="icon"
                          className="size-10 rounded-full"
                          aria-label={`${t('add')} · ${ticket.name}`}
                          disabled={soldOut || (quantity >= max && !options.waitlistEnabled)}
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
              </div>

              {canDeposit ? (
                <fieldset className="grid gap-2 sm:grid-cols-2">
                  <legend className="sr-only">{t('payDeposit')}</legend>
                  {[
                    { deposit: false, title: t('payFull'), amount: total, hint: t('payFullHint') },
                    {
                      deposit: true,
                      title: t('payDeposit'),
                      amount: depositDue,
                      hint: t('depositHint', {
                        deposit: formatPrice(depositDue, locale),
                        balance: formatPrice(total - depositDue, locale),
                      }),
                    },
                  ].map((option) => (
                    <label
                      key={String(option.deposit)}
                      className={cn(
                        'flex cursor-pointer gap-3 rounded-2xl border bg-card p-4',
                        payDeposit === option.deposit
                          ? 'border-primary ring-1 ring-primary/30'
                          : 'border-border',
                      )}
                    >
                      <input
                        type="radio"
                        name="deposit"
                        checked={payDeposit === option.deposit}
                        onChange={() => setPayDeposit(option.deposit)}
                        className="mt-1 size-4 accent-[var(--primary)]"
                      />
                      <span>
                        <span className="block font-medium">{option.title}</span>
                        <span className="ltr-nums block text-sm font-semibold text-primary">
                          {formatPrice(option.amount, locale)}
                        </span>
                        <span className="block text-xs text-muted-foreground">{option.hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : null}

              {waitlist ? (
                <p className="rounded-xl bg-highlight-soft p-3 text-sm text-highlight">
                  {t('waitlistNote')}
                </p>
              ) : null}
            </section>
          ) : null}

          {step === 1 ? (
            <section className="mt-6 space-y-6" aria-label={t('stepDetails')}>
              {people[0] ? (
                <fieldset className="space-y-3 rounded-2xl border border-border bg-card p-4">
                  <legend className="px-1 font-semibold">{t('yourDetails')}</legend>
                  <div className="space-y-1.5">
                    <Label htmlFor="name-0">{t('fullName')}</Label>
                    <Input
                      id="name-0"
                      autoComplete="name"
                      value={people[0].fullName}
                      onChange={(e) => updatePerson(0, { fullName: e.target.value })}
                      aria-invalid={invalid('name-0')}
                      className="h-11"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone-0">{t('phone')}</Label>
                      <Input
                        id="phone-0"
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        autoComplete="tel"
                        value={people[0].phone}
                        onChange={(e) => updatePerson(0, { phone: e.target.value })}
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
                        value={people[0].email}
                        onChange={(e) => updatePerson(0, { email: e.target.value })}
                        className="h-11 text-start"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('contactHint')}</p>
                </fieldset>
              ) : null}

              {people.length > 1 ? (
                <fieldset className="space-y-3 rounded-2xl border border-border bg-card p-4">
                  <legend className="px-1 font-semibold">{t('otherPeople')}</legend>
                  {people.slice(1).map((person, j) => {
                    const i = j + 1;
                    return (
                      <div key={i} className="space-y-1.5">
                        <Label htmlFor={`name-${i}`}>{t('person', { n: i + 1 })}</Label>
                        <Input
                          id={`name-${i}`}
                          autoComplete="off"
                          placeholder={t('fullName')}
                          value={person.fullName}
                          onChange={(e) => updatePerson(i, { fullName: e.target.value })}
                          aria-invalid={invalid(`name-${i}`)}
                          className="h-11"
                        />
                      </div>
                    );
                  })}
                </fieldset>
              ) : null}

              {options.meetingPoints.length > 0 ? (
                <fieldset id="meeting-point" tabIndex={-1} className="space-y-2 outline-none">
                  <legend className="mb-2 font-semibold">{t('meetingPoint')}</legend>
                  {options.meetingPoints.map((p) => (
                    <label
                      key={p.id}
                      className={cn(
                        'flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border bg-card p-4',
                        meetingPointId === p.id
                          ? 'border-primary ring-1 ring-primary/30'
                          : 'border-border',
                      )}
                    >
                      <input
                        type="radio"
                        name="meeting-point"
                        value={p.id}
                        checked={meetingPointId === p.id}
                        onChange={() => setMeetingPointId(p.id)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{p.name}</span>
                      <span className="ltr-nums shrink-0 text-sm font-semibold">
                        {formatTime(new Date(p.meetAt), locale)}
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : null}

              {options.questions.length > 0 ? (
                <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-4">
                  <legend className="px-1 font-semibold">{t('questions')}</legend>
                  {options.questions.map((q) => (
                    <div key={q.id} className="space-y-1.5">
                      <Label htmlFor={`q-${q.id}`}>
                        {q.label}
                        {q.required ? <span className="text-highlight"> *</span> : null}
                      </Label>
                      {q.type === 'select' ? (
                        <NativeSelect
                          id={`q-${q.id}`}
                          value={answers[q.id] ?? ''}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          aria-invalid={invalid(`q-${q.id}`)}
                          className="aria-invalid:border-destructive"
                        >
                          <option value="">{t('choose')}</option>
                          {q.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </NativeSelect>
                      ) : (
                        <Input
                          id={`q-${q.id}`}
                          type={q.type === 'number' ? 'number' : 'text'}
                          value={answers[q.id] ?? ''}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          aria-invalid={invalid(`q-${q.id}`)}
                          className="h-11"
                        />
                      )}
                    </div>
                  ))}
                </fieldset>
              ) : null}
            </section>
          ) : null}

          {step === 2 ? (
            <section className="mt-6 space-y-5" aria-label={t('stepPayment')}>
              {choosesPayment ? (
                <fieldset
                  id="payment"
                  tabIndex={-1}
                  className="grid gap-2 outline-none sm:grid-cols-2"
                >
                  <legend className="mb-2 font-semibold">{t('paymentMethod')}</legend>
                  {options.payments.map((method) => {
                    const Icon = methodIcons[method];
                    return (
                      <label
                        key={method}
                        data-testid={`pay-method-${method}`}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-4 transition',
                          payment === method
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-border hover:bg-accent/50',
                        )}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={method}
                          checked={payment === method}
                          onChange={() => setPayment(method)}
                          className="sr-only"
                        />
                        <span
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-full',
                            payment === method
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold">{t(`methods.${method}`)}</span>
                          <span className="block text-sm text-muted-foreground">
                            {t(`methodHints.${method}`)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : null}
              {waitlist ? (
                <p className="rounded-xl bg-highlight-soft p-3 text-sm text-highlight">
                  {t('waitlistNote')}
                </p>
              ) : null}
              <div className="space-y-1 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
                <p>{t('policyNote', { policy: tEvent(`policy.${event.cancellationPolicy}`) })}</p>
                {!buyer ? <p>{t('guestNote')}</p> : null}
              </div>
            </section>
          ) : null}

          {/* Bottom bar on phones, end of the column on desktop. */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            {showErrors && missing.length > 0 ? (
              <ul
                role="alert"
                className="mx-auto mb-3 max-w-5xl space-y-1 text-sm text-highlight"
                data-testid="checkout-missing"
              >
                {missing.map((m) => (
                  <li key={m.field} className="flex items-center gap-1.5">
                    <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                    {m.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {error ? (
              <p
                role="alert"
                className="mx-auto mb-3 max-w-5xl rounded-lg bg-highlight-soft p-3 text-sm text-highlight"
              >
                {error}
              </p>
            ) : null}
            <div className="mx-auto flex max-w-5xl items-center gap-3">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-full"
                  onClick={() => {
                    setShowErrors(false);
                    setStep(step - 1);
                  }}
                >
                  {t('back')}
                </Button>
              ) : (
                <div className="min-w-0 flex-1 lg:hidden">
                  <p className="text-xs text-muted-foreground">{t('total')}</p>
                  <p className="ltr-nums font-bold">{formatPrice(total, locale)}</p>
                </div>
              )}
              <Button
                type="button"
                className="min-h-12 flex-1 rounded-full px-6 text-base lg:ms-auto lg:flex-none"
                onClick={primary}
                disabled={book.isPending}
                data-testid={primaryTestId}
              >
                {primaryLabel}
              </Button>
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {event.coverUrl ? (
              <div className="relative aspect-[16/9] bg-muted">
                <Image src={event.coverUrl} alt="" fill sizes="320px" className="object-cover" />
              </div>
            ) : null}
            <div className="space-y-3 p-4">
              <div>
                <p className="font-semibold">{event.title}</p>
                <p className="text-sm text-muted-foreground">
                  {when}
                  {event.city ? ` · ${event.city}` : ''}
                </p>
              </div>
              {summary}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
