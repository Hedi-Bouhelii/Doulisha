'use client';

import type { Locale } from '@doulisha/i18n';
import type { TemplateField } from '@doulisha/templates';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRef, useState, type ReactNode } from 'react';

import { Field, NativeSelect } from '@/components/doulisha/form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { useErrorMessage } from '@/lib/errors';
import { putFile } from '@/lib/upload';
import { useTRPC } from '@/trpc/client';

import {
  type Audience,
  type EventForm,
  type PointForm,
  type Policy,
  type QuestionForm,
  type RegistrationType,
  stepForProblem,
  type StepForm,
  type TicketForm,
  type Visibility,
} from './wizard-form';

interface StepProps {
  form: EventForm;
  patchForm: (patch: Partial<EventForm>) => void;
  eventId: string;
}

const inputClass = 'h-11';

function Heading({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="font-sans text-xl font-semibold">{children}</h2>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SwitchRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <Label htmlFor={id} className="leading-snug">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Step 1: title, description, language, cover and who publishes. */
export function BasicsStep({
  form,
  patchForm,
  eventId,
  profiles,
}: StepProps & { profiles: { id: string; name: string }[] }) {
  const t = useTranslations('Wizard');
  const tLang = useTranslations('Languages');
  return (
    <div className="space-y-5">
      <Heading>{t('steps.basics')}</Heading>
      <Field id="title" label={t('title')} hint={t('titleHint')}>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => patchForm({ title: e.target.value })}
          maxLength={120}
          className={inputClass}
          data-testid="wizard-title"
        />
      </Field>
      <Field id="description" label={t('description')}>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => patchForm({ description: e.target.value })}
          maxLength={5000}
          rows={6}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="language" label={t('language')}>
          <NativeSelect
            id="language"
            value={form.language}
            onChange={(e) => patchForm({ language: e.target.value as Locale })}
          >
            {(['ar', 'fr', 'en'] as const).map((l) => (
              <option key={l} value={l}>
                {tLang(l)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="publish-as" label={t('publishAs')}>
          <NativeSelect
            id="publish-as"
            value={form.organizerProfileId}
            onChange={(e) => patchForm({ organizerProfileId: e.target.value })}
          >
            <option value="">{t('myself')}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <CoverUpload
        eventId={eventId}
        coverUrl={form.coverUrl}
        onUploaded={(coverUrl) => patchForm({ coverUrl })}
      />
    </div>
  );
}

function CoverUpload({
  eventId,
  coverUrl,
  onUploaded,
}: {
  eventId: string;
  coverUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const t = useTranslations('Wizard');
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createUpload = useMutation(trpc.uploads.create.mutationOptions());
  const update = useMutation(trpc.editor.update.mutationOptions());

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const ticket = await createUpload.mutateAsync({
        purpose: 'event-cover',
        contentType: file.type,
        size: file.size,
      });
      const key = await putFile(ticket, file);
      await update.mutateAsync({ eventId, patch: { coverKey: key } });
      if (ticket.publicUrl) onUploaded(ticket.publicUrl);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('cover')}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative aspect-[16/9] w-48 overflow-hidden rounded-lg bg-muted">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill sizes="192px" className="object-cover" />
          ) : null}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={t('uploadCover')}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          <ImagePlus aria-hidden="true" />
          {coverUrl ? t('changeCover') : t('uploadCover')}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-highlight">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Step 2: dates (Tunisia time) and place. */
export function PlaceStep({ form, patchForm }: StepProps) {
  const t = useTranslations('Wizard');
  return (
    <div className="space-y-5">
      <Heading>{t('steps.place')}</Heading>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="starts" label={t('startsAt')}>
          <Input
            id="starts"
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => patchForm({ startsAt: e.target.value })}
            className={inputClass}
            data-testid="wizard-starts"
          />
        </Field>
        <Field id="ends" label={t('endsAt')}>
          <Input
            id="ends"
            type="datetime-local"
            value={form.endsAt}
            min={form.startsAt}
            onChange={(e) => patchForm({ endsAt: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <Field id="venue" label={t('venueName')}>
        <Input
          id="venue"
          value={form.venueName}
          onChange={(e) => patchForm({ venueName: e.target.value })}
          maxLength={120}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <Field id="address" label={t('address')}>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => patchForm({ address: e.target.value })}
            maxLength={300}
            className={inputClass}
          />
        </Field>
        <Field id="city" label={t('city')}>
          <Input
            id="city"
            value={form.city}
            onChange={(e) => patchForm({ city: e.target.value })}
            maxLength={80}
            className={inputClass}
            data-testid="wizard-city"
          />
        </Field>
      </div>
      <SwitchRow
        id="hide-location"
        label={t('hideLocation')}
        checked={form.locationHiddenUntilBooking}
        onChange={(value) => patchForm({ locationHiddenUntilBooking: value })}
      />
    </div>
  );
}

/** Step 3: who can see it, for whom, and the template's own fields. */
export function DetailsStep({ form, patchForm, fields }: StepProps & { fields: TemplateField[] }) {
  const t = useTranslations('Wizard');
  const tExplore = useTranslations('Explore');
  const locale = useLocale() as Locale;
  const setDetail = (key: string, value: unknown) =>
    patchForm({ details: { ...form.details, [key]: value } });

  return (
    <div className="space-y-6">
      <Heading>{t('steps.details')}</Heading>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">{t('visibility')}</legend>
        <RadioGroup
          value={form.visibility}
          onValueChange={(v) => patchForm({ visibility: v as Visibility })}
        >
          {(['public', 'unlisted'] as const).map((v) => (
            <div key={v} className="flex min-h-11 items-center gap-3">
              <RadioGroupItem id={`vis-${v}`} value={v} />
              <Label htmlFor={`vis-${v}`}>{t(`visibilityOptions.${v}`)}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('audience')}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {(['solo', 'couple', 'friends', 'family', 'kids'] as const).map((a: Audience) => (
            <div key={a} className="flex min-h-11 items-center gap-2">
              <Checkbox
                id={`aud-${a}`}
                checked={form.audience.includes(a)}
                onCheckedChange={(checked) =>
                  patchForm({
                    audience: checked
                      ? [...form.audience, a]
                      : form.audience.filter((x) => x !== a),
                  })
                }
              />
              <Label htmlFor={`aud-${a}`}>{tExplore(`audience.${a}`)}</Label>
            </div>
          ))}
        </div>
      </fieldset>

      <Field id="min-age" label={t('minAge')} className="max-w-40">
        <Input
          id="min-age"
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={form.minAge}
          onChange={(e) => patchForm({ minAge: e.target.value })}
          className={inputClass}
        />
      </Field>

      {fields
        // GPX tracks need a file upload type that is not available yet (OPEN_QUESTIONS).
        .filter((field) => field.type !== 'gpx')
        .map((field) => {
          const id = `detail-${field.key}`;
          const label = `${field.label[locale]}${field.required ? ' *' : ''}`;
          const hint = field.help?.[locale];
          const value = form.details[field.key];
          switch (field.type) {
            case 'number':
              return (
                <Field
                  key={field.key}
                  id={id}
                  label={field.unit ? `${label} (${field.unit})` : label}
                  hint={hint}
                  className="max-w-60"
                >
                  <Input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 'any'}
                    value={typeof value === 'number' ? value : ''}
                    onChange={(e) =>
                      setDetail(
                        field.key,
                        e.target.value === '' ? undefined : Number(e.target.value),
                      )
                    }
                    className={inputClass}
                  />
                </Field>
              );
            case 'text':
              return (
                <Field key={field.key} id={id} label={label} hint={hint}>
                  {field.multiline ? (
                    <Textarea
                      id={id}
                      value={typeof value === 'string' ? value : ''}
                      maxLength={field.maxLength}
                      onChange={(e) => setDetail(field.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={id}
                      value={typeof value === 'string' ? value : ''}
                      maxLength={field.maxLength}
                      onChange={(e) => setDetail(field.key, e.target.value)}
                      className={inputClass}
                    />
                  )}
                </Field>
              );
            case 'select':
              if (field.multiple) {
                const selected = Array.isArray(value) ? (value as string[]) : [];
                return (
                  <fieldset key={field.key}>
                    <legend className="mb-2 text-sm font-medium">{label}</legend>
                    <div className="flex flex-wrap gap-x-5 gap-y-1">
                      {field.options.map((option) => (
                        <div key={option.value} className="flex min-h-11 items-center gap-2">
                          <Checkbox
                            id={`${id}-${option.value}`}
                            checked={selected.includes(option.value)}
                            onCheckedChange={(checked) =>
                              setDetail(
                                field.key,
                                checked
                                  ? [...selected, option.value]
                                  : selected.filter((x) => x !== option.value),
                              )
                            }
                          />
                          <Label htmlFor={`${id}-${option.value}`}>{option.label[locale]}</Label>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                );
              }
              return (
                <Field key={field.key} id={id} label={label} hint={hint} className="max-w-sm">
                  <NativeSelect
                    id={id}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => setDetail(field.key, e.target.value || undefined)}
                    data-testid={id}
                  >
                    <option value="">—</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label[locale]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              );
            case 'boolean':
              return (
                <SwitchRow
                  key={field.key}
                  id={id}
                  label={label}
                  checked={value === true}
                  onChange={(v) => setDetail(field.key, v)}
                />
              );
            default:
              return null;
          }
        })}
    </div>
  );
}

const KINDS = ['standard', 'early_bird', 'vip', 'student', 'couple', 'group'] as const;

/** Step 4: registration type, capacity, waitlist and ticket types (TKT-01/02). */
export function TicketsStep({
  form,
  patchForm,
  registrationTypes,
  tickets,
  setTickets,
}: StepProps & {
  registrationTypes: RegistrationType[];
  tickets: TicketForm[];
  setTickets: (tickets: TicketForm[]) => void;
}) {
  const t = useTranslations('Wizard');
  const free = form.registrationType === 'free_rsvp';
  const deposit = form.registrationType === 'deposit';
  const edit = (index: number, patch: Partial<TicketForm>) =>
    setTickets(tickets.map((ticket, i) => (i === index ? { ...ticket, ...patch } : ticket)));

  return (
    <div className="space-y-6">
      <Heading>{t('steps.tickets')}</Heading>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('registration')}</legend>
        <RadioGroup
          value={form.registrationType}
          onValueChange={(v) => patchForm({ registrationType: v as RegistrationType })}
          className="grid gap-1 sm:grid-cols-2"
        >
          {registrationTypes.map((type) => (
            <div key={type} className="flex min-h-11 items-center gap-3">
              <RadioGroupItem
                id={`reg-${type}`}
                value={type}
                data-testid={`wizard-registration-${type}`}
              />
              <Label htmlFor={`reg-${type}`}>{t(`registrationOptions.${type}`)}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="capacity" label={t('capacity')} hint={t('capacityHint')}>
          <Input
            id="capacity"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.capacity}
            onChange={(e) => patchForm({ capacity: e.target.value })}
            className={inputClass}
            data-testid="wizard-capacity"
          />
        </Field>
        <Field id="min-confirm" label={t('minToConfirm')}>
          <Input
            id="min-confirm"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.minToConfirm}
            onChange={(e) => patchForm({ minToConfirm: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <SwitchRow
        id="waitlist"
        label={t('waitlist')}
        checked={form.waitlistEnabled}
        onChange={(v) => patchForm({ waitlistEnabled: v })}
      />

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium">{t('ticketTypes')}</legend>
        {tickets.map((ticket, index) => (
          <div
            key={ticket.id ?? `new-${index}`}
            className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-6"
          >
            <Field id={`t-name-${index}`} label={t('ticketName')} className="sm:col-span-2">
              <Input
                id={`t-name-${index}`}
                value={ticket.name}
                maxLength={80}
                onChange={(e) => edit(index, { name: e.target.value })}
                className={inputClass}
                data-testid={`ticket-name-${index}`}
              />
            </Field>
            <Field id={`t-kind-${index}`} label={t('ticketKind')}>
              <NativeSelect
                id={`t-kind-${index}`}
                value={ticket.kind}
                onChange={(e) => edit(index, { kind: e.target.value as TicketForm['kind'] })}
              >
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`kinds.${kind}`)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {!free ? (
              <Field id={`t-price-${index}`} label={t('price')}>
                <Input
                  id={`t-price-${index}`}
                  inputMode="decimal"
                  value={ticket.price}
                  onChange={(e) => edit(index, { price: e.target.value })}
                  className={inputClass}
                  data-testid={`ticket-price-${index}`}
                />
              </Field>
            ) : null}
            {deposit ? (
              <Field id={`t-deposit-${index}`} label={t('deposit')}>
                <Input
                  id={`t-deposit-${index}`}
                  inputMode="decimal"
                  value={ticket.deposit}
                  onChange={(e) => edit(index, { deposit: e.target.value })}
                  className={inputClass}
                />
              </Field>
            ) : null}
            <Field id={`t-qty-${index}`} label={t('quantity')}>
              <Input
                id={`t-qty-${index}`}
                type="number"
                inputMode="numeric"
                min={1}
                value={ticket.quantity}
                onChange={(e) => edit(index, { quantity: e.target.value })}
                className={inputClass}
              />
            </Field>
            <div className="flex items-end gap-2 sm:col-span-6 sm:justify-between">
              <Field id={`t-seats-${index}`} label={t('seats')} className="max-w-32">
                <Input
                  id={`t-seats-${index}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  value={ticket.seats}
                  onChange={(e) => edit(index, { seats: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 text-destructive"
                onClick={() => setTickets(tickets.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden="true" />
                {t('removeTicket')}
              </Button>
            </div>
          </div>
        ))}
        {tickets.length < 10 ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-full"
            onClick={() =>
              setTickets([
                ...tickets,
                { kind: 'standard', name: '', price: '', deposit: '', quantity: '', seats: '1' },
              ])
            }
            data-testid="add-ticket-type"
          >
            <Plus aria-hidden="true" />
            {t('addTicket')}
          </Button>
        ) : null}
      </fieldset>
    </div>
  );
}

/** Step 5: pick-up points (LOG-01), programme (EVT-06) and booking questions (TKT-03). */
export function LogisticsStep({
  showPoints,
  showProgramme,
  points,
  setPoints,
  programme,
  setProgramme,
  questions,
  setQuestions,
}: {
  showPoints: boolean;
  showProgramme: boolean;
  points: PointForm[];
  setPoints: (points: PointForm[]) => void;
  programme: StepForm[];
  setProgramme: (steps: StepForm[]) => void;
  questions: QuestionForm[];
  setQuestions: (questions: QuestionForm[]) => void;
}) {
  const t = useTranslations('Wizard');
  const remove = (label: string, onClick: () => void) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-11 shrink-0 text-destructive"
      onClick={onClick}
      aria-label={label ? `${t('removeTicket')}: ${label}` : t('removeTicket')}
    >
      <Trash2 aria-hidden="true" />
    </Button>
  );

  return (
    <div className="space-y-8">
      <Heading>{t('steps.logistics')}</Heading>

      {showPoints ? (
        <fieldset className="space-y-3">
          <legend className="mb-1 font-medium">{t('meetingPoints')}</legend>
          {points.map((point, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3">
              <Field id={`p-name-${index}`} label={t('pointName')} className="min-w-48 flex-1">
                <Input
                  id={`p-name-${index}`}
                  value={point.name}
                  maxLength={120}
                  onChange={(e) =>
                    setPoints(
                      points.map((p, i) => (i === index ? { ...p, name: e.target.value } : p)),
                    )
                  }
                  className={inputClass}
                />
              </Field>
              <Field id={`p-time-${index}`} label={t('pointTime')}>
                <Input
                  id={`p-time-${index}`}
                  type="datetime-local"
                  value={point.meetAt}
                  onChange={(e) =>
                    setPoints(
                      points.map((p, i) => (i === index ? { ...p, meetAt: e.target.value } : p)),
                    )
                  }
                  className={inputClass}
                />
              </Field>
              {remove(point.name, () => setPoints(points.filter((_, i) => i !== index)))}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-full"
            onClick={() => setPoints([...points, { name: '', meetAt: '' }])}
          >
            <Plus aria-hidden="true" />
            {t('addPoint')}
          </Button>
        </fieldset>
      ) : null}

      {showProgramme ? (
        <fieldset className="space-y-3">
          <legend className="mb-1 font-medium">{t('programme')}</legend>
          {programme.map((step, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3">
              <Field id={`s-day-${index}`} label={t('stepDay')} className="w-20">
                <Input
                  id={`s-day-${index}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={30}
                  value={step.day}
                  onChange={(e) =>
                    setProgramme(
                      programme.map((s, i) => (i === index ? { ...s, day: e.target.value } : s)),
                    )
                  }
                  className={inputClass}
                />
              </Field>
              <Field id={`s-title-${index}`} label={t('stepTitle')} className="min-w-48 flex-1">
                <Input
                  id={`s-title-${index}`}
                  value={step.title}
                  maxLength={160}
                  onChange={(e) =>
                    setProgramme(
                      programme.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)),
                    )
                  }
                  className={inputClass}
                />
              </Field>
              <Field id={`s-time-${index}`} label={t('stepTime')}>
                <Input
                  id={`s-time-${index}`}
                  type="datetime-local"
                  value={step.startsAt}
                  onChange={(e) =>
                    setProgramme(
                      programme.map((s, i) =>
                        i === index ? { ...s, startsAt: e.target.value } : s,
                      ),
                    )
                  }
                  className={inputClass}
                />
              </Field>
              {remove(step.title, () => setProgramme(programme.filter((_, i) => i !== index)))}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-full"
            onClick={() =>
              setProgramme([
                ...programme,
                { day: String(programme.at(-1)?.day ?? 1), title: '', startsAt: '' },
              ])
            }
          >
            <Plus aria-hidden="true" />
            {t('addStep')}
          </Button>
        </fieldset>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="mb-1 font-medium">{t('questions')}</legend>
        {questions.map((question, index) => {
          const set = (patch: Partial<QuestionForm>) =>
            setQuestions(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
          return (
            <div key={index} className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-end gap-3">
                <Field
                  id={`q-label-${index}`}
                  label={t('questionLabel')}
                  className="min-w-48 flex-1"
                >
                  <Input
                    id={`q-label-${index}`}
                    value={question.label}
                    maxLength={160}
                    onChange={(e) => set({ label: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field id={`q-type-${index}`} label={t('questionType')}>
                  <NativeSelect
                    id={`q-type-${index}`}
                    value={question.type}
                    onChange={(e) => set({ type: e.target.value as QuestionForm['type'] })}
                  >
                    {(['text', 'select', 'number'] as const).map((type) => (
                      <option key={type} value={type}>
                        {t(`questionTypes.${type}`)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                {remove(question.label, () =>
                  setQuestions(questions.filter((_, i) => i !== index)),
                )}
              </div>
              {question.type === 'select' ? (
                <Field id={`q-options-${index}`} label={t('questionOptions')}>
                  <Input
                    id={`q-options-${index}`}
                    value={question.options}
                    onChange={(e) => set({ options: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              ) : null}
              <div className="flex min-h-11 items-center gap-2">
                <Checkbox
                  id={`q-req-${index}`}
                  checked={question.required}
                  onCheckedChange={(checked) => set({ required: checked === true })}
                />
                <Label htmlFor={`q-req-${index}`}>{t('questionRequired')}</Label>
              </div>
            </div>
          );
        })}
        {questions.length < 10 ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-full"
            onClick={() =>
              setQuestions([
                ...questions,
                { label: '', type: 'text', options: '', required: false },
              ])
            }
          >
            <Plus aria-hidden="true" />
            {t('addQuestion')}
          </Button>
        ) : null}
      </fieldset>
    </div>
  );
}

/** Step 6: participant brief (EVT-05) and cancellation policy. */
export function BriefStep({ form, patchForm }: StepProps) {
  const t = useTranslations('Wizard');
  const tEvent = useTranslations('Event');
  return (
    <div className="space-y-5">
      <Heading>{t('steps.brief')}</Heading>
      <Field id="bring" label={t('whatToBring')}>
        <Textarea
          id="bring"
          rows={5}
          value={form.whatToBring}
          onChange={(e) => patchForm({ whatToBring: e.target.value })}
        />
      </Field>
      <Field id="dress" label={t('dressCode')}>
        <Input
          id="dress"
          value={form.dressCode}
          maxLength={300}
          onChange={(e) => patchForm({ dressCode: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id="rules" label={t('rules')}>
        <Textarea
          id="rules"
          value={form.rules}
          maxLength={2000}
          onChange={(e) => patchForm({ rules: e.target.value })}
        />
      </Field>
      <Field id="safety" label={t('safety')}>
        <Textarea
          id="safety"
          value={form.safety}
          maxLength={2000}
          onChange={(e) => patchForm({ safety: e.target.value })}
        />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('policy')}</legend>
        <RadioGroup
          value={form.cancellationPolicy}
          onValueChange={(v) => patchForm({ cancellationPolicy: v as Policy })}
        >
          {(['flexible', 'moderate', 'strict'] as const).map((policy) => (
            <div key={policy} className="flex min-h-11 items-center gap-3">
              <RadioGroupItem id={`policy-${policy}`} value={policy} />
              <Label htmlFor={`policy-${policy}`} className="leading-snug">
                {tEvent(`policy.${policy}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
    </div>
  );
}

/** Step 7: what is missing, then publish. */
export function PublishStep({
  eventId,
  isDraft,
  problems,
  fields,
  beforePublish,
  goTo,
}: {
  eventId: string;
  isDraft: boolean;
  problems: string[];
  fields: TemplateField[];
  beforePublish: () => Promise<boolean>;
  goTo: (step: number) => void;
}) {
  const t = useTranslations('Wizard');
  const tOrg = useTranslations('Organizer');
  const locale = useLocale() as Locale;
  const trpc = useTRPC();
  const errorMessage = useErrorMessage();
  const publish = useMutation(trpc.editor.publish.mutationOptions());
  const [current, setCurrent] = useState(problems);
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = current;

  function describe(problem: string) {
    if (problem === 'details.invalid') return t('problems.invalid');
    if (problem.startsWith('details.')) {
      const field = fields.find((f) => f.key === problem.slice('details.'.length));
      return t('problems.details', { field: field?.label[locale] ?? problem });
    }
    return t(`problems.${problem as 'title'}`);
  }

  async function submit() {
    setError(null);
    if (!(await beforePublish())) return;
    try {
      const result = await publish.mutateAsync({ eventId });
      if (result.problems.length > 0) setCurrent(result.problems);
      else setSlug(result.slug);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (slug || !isDraft) {
    return (
      <div className="space-y-4 text-center" data-testid="wizard-published">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
        <h2 className="font-sans text-xl font-semibold">{t('published')}</h2>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild className="min-h-11 rounded-full">
            <Link href={`/organizer/events/${eventId}`} data-testid="manage-published">
              {tOrg('open')}
            </Link>
          </Button>
          {slug ? (
            <Button asChild variant="outline" className="min-h-11 rounded-full">
              <Link href={`/events/${slug}`} data-testid="view-published">
                {tOrg('view')}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Heading>{t('steps.publish')}</Heading>
      {list.length > 0 ? (
        <div className="rounded-lg border border-highlight/30 bg-highlight-soft p-4">
          <p className="mb-2 font-medium text-highlight">{t('missingTitle')}</p>
          <ul className="space-y-1" data-testid="publish-problems">
            {list.map((problem) => (
              <li key={problem}>
                <button
                  type="button"
                  onClick={() => goTo(stepForProblem(problem))}
                  className="flex min-h-11 items-center gap-2 text-start text-sm underline-offset-2 hover:underline"
                >
                  <AlertCircle className="size-4 shrink-0 text-highlight" aria-hidden="true" />
                  {describe(problem)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-success">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {t('ready')}
        </p>
      )}
      {error ? (
        <p role="alert" className="text-sm text-highlight">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="lg"
        className="min-h-11 rounded-full px-8"
        onClick={() => void submit()}
        disabled={publish.isPending}
        data-testid="publish-event"
      >
        {publish.isPending ? t('publishing') : t('publish')}
      </Button>
    </div>
  );
}
