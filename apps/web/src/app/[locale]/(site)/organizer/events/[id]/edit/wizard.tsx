'use client';

import { toTunisInput } from '@doulisha/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CloudOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
}: {
  initial: Editable;
  profiles: { id: string; name: string }[];
}) {
  const t = useTranslations('Wizard');
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
    <div className="mt-4 grid gap-6 lg:grid-cols-[14rem_1fr]">
      <nav aria-label={t('steps.basics')} className="lg:sticky lg:top-24 lg:self-start">
        <Progress value={((step + 1) / STEPS.length) * 100} className="mb-3 h-1.5 lg:hidden" />
        <ol className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {STEPS.map((name, index) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => void goTo(index)}
                aria-current={index === step ? 'step' : undefined}
                data-testid={`wizard-step-${name}`}
                className={cn(
                  'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-start text-sm font-medium whitespace-nowrap',
                  index === step ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                <span
                  className={cn(
                    'ltr-nums flex size-6 shrink-0 items-center justify-center rounded-full text-xs',
                    index === step ? 'bg-primary-foreground/20' : 'bg-muted',
                  )}
                >
                  {index + 1}
                </span>
                {t(`steps.${name}`)}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0">
        <div
          className="mb-4 flex min-h-6 items-center justify-end text-sm text-muted-foreground"
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
            <span className="flex items-center gap-1.5 text-highlight">
              <CloudOff className="size-4" aria-hidden="true" />
              {t('saveError')}
            </span>
          ) : null}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
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
          <p role="alert" className="mt-3 rounded-lg bg-highlight-soft p-3 text-sm text-highlight">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-full"
            onClick={() => void goTo(step - 1)}
            disabled={step === 0}
          >
            {t('previous')}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="min-h-11 rounded-full px-6"
              onClick={() => void goTo(step + 1)}
              data-testid="wizard-next"
            >
              {t('next')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
