'use client';

import { toTunisInput } from '@doulisha/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CloudOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { HillsBackdrop, LeafSprig } from '@/components/doulisha/decor';
import { Button } from '@/components/ui/button';
import { useErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/trpc/client';

import {
  type Editable,
  type EventForm,
  type PointForm,
  type QuestionForm,
  type StepForm,
  type TicketForm,
  toForm,
  toPatch,
  toPointInputs,
  toQuestionInputs,
  toStepInputs,
  toTicketForm,
  toTicketInputs,
} from './wizard-form';
import {
  BasicsStep,
  BriefStep,
  DetailsStep,
  LogisticsStep,
  PlaceStep,
  PublishStep,
  STEP_ICONS,
  TicketsStep,
} from './wizard-steps';

const STEPS = ['basics', 'place', 'details', 'tickets', 'logistics', 'brief', 'publish'] as const;
type Lists = 'tickets' | 'points' | 'steps' | 'questions';

/**
 * EVT-01..06 create-event wizard. Event fields auto-save a second after the
 * last change; lists (tickets, pick-up points, programme, questions) save when
 * the organizer changes step. Publishing shows the same checks as the server.
 */
export function Wizard({
  initial,
  profiles,
  header,
}: {
  initial: Editable;
  profiles: { id: string; name: string }[];
  /** The event's title block, drawn by the page. */
  header: ReactNode;
}) {
  const t = useTranslations('Wizard');
  const tOrganizer = useTranslations('Organizer');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const eventId = initial.event.id;
  const isDraft = initial.event.status === 'draft';

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EventForm>(() => toForm(initial.event));
  const [tickets, setTickets] = useState<TicketForm[]>(() =>
    initial.tickets.filter((ticket) => ticket.isActive).map(toTicketForm),
  );
  const [points, setPoints] = useState<PointForm[]>(() =>
    initial.meetingPoints.map((p) => ({ name: p.name, meetAt: toTunisInput(p.meetAt) })),
  );
  const [programme, setProgramme] = useState<StepForm[]>(() =>
    initial.programme.map((s) => ({
      day: String(s.day),
      title: s.title,
      startsAt: s.startsAt ? toTunisInput(s.startsAt) : '',
    })),
  );
  const [questions, setQuestions] = useState<QuestionForm[]>(() =>
    initial.questions.map((q) => ({
      label: q.label,
      type: q.type as QuestionForm['type'],
      options: q.options.join(', '),
      required: q.required,
    })),
  );
  const [problems, setProblems] = useState<string[]>(initial.problems);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef({
    event: false,
    tickets: false,
    points: false,
    steps: false,
    questions: false,
  });

  const update = useMutation(trpc.editor.update.mutationOptions());
  const saveTickets = useMutation(trpc.editor.setTickets.mutationOptions());
  const savePoints = useMutation(trpc.editor.setMeetingPoints.mutationOptions());
  const saveProgramme = useMutation(trpc.editor.setProgramme.mutationOptions());
  const saveQuestions = useMutation(trpc.editor.setQuestions.mutationOptions());

  function patchForm(patch: Partial<EventForm>) {
    dirty.current.event = true;
    setForm((current) => ({ ...current, ...patch }));
  }

  function changeList(list: Lists) {
    dirty.current[list] = true;
  }

  /** Saves whatever changed, then refreshes the publish checks (and ticket ids). */
  async function save(): Promise<boolean> {
    const d = dirty.current;
    const jobs: Promise<unknown>[] = [];
    const savedTickets = d.tickets;
    if (d.event) jobs.push(update.mutateAsync({ eventId, patch: toPatch(form) }));
    if (d.tickets) {
      jobs.push(
        saveTickets.mutateAsync({
          eventId,
          tickets: toTicketInputs(tickets, form.registrationType),
        }),
      );
    }
    if (d.points) jobs.push(savePoints.mutateAsync({ eventId, points: toPointInputs(points) }));
    if (d.steps) jobs.push(saveProgramme.mutateAsync({ eventId, steps: toStepInputs(programme) }));
    if (d.questions) {
      jobs.push(saveQuestions.mutateAsync({ eventId, questions: toQuestionInputs(questions) }));
    }
    if (jobs.length === 0) return true;
    const snapshot = { ...d };
    dirty.current = { event: false, tickets: false, points: false, steps: false, questions: false };
    setSaveState('saving');
    setError(null);
    try {
      await Promise.all(jobs);
      const fresh = await queryClient.fetchQuery({
        ...trpc.editor.get.queryOptions({ eventId }),
        staleTime: 0,
      });
      setProblems(fresh.problems);
      if (savedTickets) {
        setTickets(fresh.tickets.filter((ticket) => ticket.isActive).map(toTicketForm));
      }
      setSaveState('saved');
      return true;
    } catch (e) {
      // Keep the changes marked so the next save retries them.
      for (const key of Object.keys(snapshot) as (keyof typeof snapshot)[]) {
        if (snapshot[key]) dirty.current[key] = true;
      }
      setSaveState('error');
      setError(errorMessage(e));
      return false;
    }
  }

  // Auto-save event fields one second after the last change.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    if (!dirty.current.event) return;
    const timer = setTimeout(() => void saveRef.current(), 1000);
    return () => clearTimeout(timer);
  }, [form]);

  async function goTo(next: number) {
    await save();
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const modules = initial.template.definition.modules;
  const stepProps = { form, patchForm, eventId };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <nav aria-label={t('stepsLabel')}>
          <ol className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
            {STEPS.map((name, index) => {
              const Icon = STEP_ICONS[name];
              const current = index === step;
              return (
                <li key={name} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => void goTo(index)}
                    aria-current={current ? 'step' : undefined}
                    data-testid={`wizard-step-${name}`}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-2.5 rounded-full px-2 pe-4 text-start text-sm font-medium whitespace-nowrap transition-colors lg:min-h-12 lg:rounded-2xl',
                      current
                        ? 'bg-primary text-primary-foreground shadow-card'
                        : 'text-foreground/80 hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'ltr-nums flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        current
                          ? 'bg-primary-foreground/20'
                          : index < step
                            ? 'bg-primary-soft text-primary'
                            : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {index + 1}
                    </span>
                    <Icon className="hidden size-4 shrink-0 lg:block" aria-hidden="true" />
                    {t(`steps.${name}`)}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        {/* Founder's mockup: a quiet illustration under the steps. */}
        <div
          aria-hidden="true"
          className="relative mt-10 hidden h-52 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)] lg:block"
        >
          <p className="relative z-10 max-w-40 -rotate-3 font-display text-lg leading-snug text-muted-foreground italic">
            {tOrganizer('thanksTitle')}
          </p>
          <LeafSprig className="absolute start-0 bottom-0 h-36 w-auto" />
          <HillsBackdrop className="absolute inset-x-0 bottom-0 h-24" />
        </div>
      </aside>

      <div className="min-w-0 rounded-3xl border border-border/70 bg-card/70 p-4 shadow-card sm:p-6 lg:p-8">
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">{header}</div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <span className="ltr-nums w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              {t('stepOf', { current: step + 1, total: STEPS.length })}
            </span>
            <div className="flex gap-1" aria-hidden="true">
              {STEPS.map((name, index) => (
                <span
                  key={name}
                  className={cn(
                    'h-1.5 w-6 rounded-full transition-colors sm:w-7',
                    index <= step ? 'bg-primary' : 'bg-muted',
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="mt-4 flex min-h-6 items-center justify-end text-sm text-muted-foreground"
          aria-live="polite"
        >
          {saveState === 'saving' ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t('saving')}
            </span>
          ) : saveState === 'saved' ? (
            <span className="flex items-center gap-1.5" data-testid="wizard-saved">
              <Check className="size-4 text-success" aria-hidden="true" />
              {t('saved')}
            </span>
          ) : saveState === 'error' ? (
            <span className="flex items-center gap-1.5 text-destructive">
              <CloudOff className="size-4" aria-hidden="true" />
              {t('saveError')}
            </span>
          ) : null}
        </div>

        <div className="mt-2 rounded-2xl border border-border/70 bg-card p-4 shadow-xs sm:p-6">
          {step === 0 ? <BasicsStep {...stepProps} profiles={profiles} /> : null}
          {step === 1 ? <PlaceStep {...stepProps} /> : null}
          {step === 2 ? (
            <DetailsStep {...stepProps} fields={initial.template.definition.fields} />
          ) : null}
          {step === 3 ? (
            <TicketsStep
              {...stepProps}
              registrationTypes={initial.template.definition.registrationTypes}
              tickets={tickets}
              setTickets={(next) => {
                changeList('tickets');
                setTickets(next);
              }}
            />
          ) : null}
          {step === 4 ? (
            <LogisticsStep
              showPoints={modules.includes('meeting_points')}
              showProgramme={modules.includes('itinerary')}
              points={points}
              setPoints={(next) => {
                changeList('points');
                setPoints(next);
              }}
              programme={programme}
              setProgramme={(next) => {
                changeList('steps');
                setProgramme(next);
              }}
              questions={questions}
              setQuestions={(next) => {
                changeList('questions');
                setQuestions(next);
              }}
            />
          ) : null}
          {step === 5 ? <BriefStep {...stepProps} /> : null}
          {step === 6 ? (
            <PublishStep
              eventId={eventId}
              isDraft={isDraft}
              problems={problems}
              fields={initial.template.definition.fields}
              beforePublish={save}
              goTo={(index) => void goTo(index)}
            />
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void goTo(step - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
            {t('previous')}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="min-w-32"
              onClick={() => void goTo(step + 1)}
              data-testid="wizard-next"
            >
              {t('next')}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
