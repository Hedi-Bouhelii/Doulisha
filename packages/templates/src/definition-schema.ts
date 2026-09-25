import { z } from 'zod';

import type { EventBrief, LocalizedBrief, TemplateDefinitionData } from './types';

const localized = z.object({
  ar: z.string().min(1),
  fr: z.string().min(1),
  en: z.string().min(1),
});

const fieldBase = {
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
  label: localized,
  help: localized.optional(),
  required: z.boolean().optional(),
};

const fieldSchema = z.discriminatedUnion('type', [
  z.object({
    ...fieldBase,
    type: z.literal('number'),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    unit: z.string().max(12).optional(),
  }),
  z.object({
    ...fieldBase,
    type: z.literal('text'),
    maxLength: z.number().int().positive().optional(),
    multiline: z.boolean().optional(),
  }),
  z.object({
    ...fieldBase,
    type: z.literal('select'),
    options: z.array(z.object({ value: z.string().min(1), label: localized })).min(1),
    multiple: z.boolean().optional(),
  }),
  z.object({ ...fieldBase, type: z.literal('boolean') }),
  z.object({ ...fieldBase, type: z.literal('gpx') }),
]);

const moduleSchema = z.enum([
  'tickets',
  'payments',
  'attendees',
  'checkin',
  'waitlist',
  'itinerary',
  'meeting_points',
  'invitations',
  'rsvp',
  'gift_pool',
  'providers',
  'slots',
]);

/**
 * Validates `templates.definition` when an admin edits a template (EVT-09),
 * so a broken definition can never reach the wizard.
 */
export const templateDefinitionSchema: z.ZodType<TemplateDefinitionData> = z
  .object({
    fields: z.array(fieldSchema).max(30),
    defaultBrief: z.object({
      whatToBring: z.array(localized).optional(),
      dressCode: localized.optional(),
      rules: localized.optional(),
      safety: localized.optional(),
    }),
    cancellationPolicy: z.enum(['flexible', 'moderate', 'strict']),
    registrationTypes: z.array(z.enum(['free_rsvp', 'paid', 'deposit', 'pay_at_door'])).min(1),
    modules: z.array(moduleSchema),
    searchFilters: z.array(z.string()),
    shareStyle: z.object({
      accent: z.string().min(1),
      layout: z.enum(['photo', 'poster', 'invitation']),
    }),
    defaultVisibility: z.enum(['public', 'unlisted', 'private']),
  })
  .superRefine((value, ctx) => {
    const keys = value.fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({ code: 'custom', message: 'Field keys must be unique', path: ['fields'] });
    }
    for (const filter of value.searchFilters) {
      if (!keys.includes(filter)) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown filter ${filter}`,
          path: ['searchFilters'],
        });
      }
    }
  });

/** The template's default brief in the event's language (EVT-05). */
export function localizeBrief(brief: LocalizedBrief, locale: 'ar' | 'fr' | 'en'): EventBrief {
  const out: EventBrief = {};
  if (brief.whatToBring?.length) out.whatToBring = brief.whatToBring.map((item) => item[locale]);
  if (brief.dressCode) out.dressCode = brief.dressCode[locale];
  if (brief.rules) out.rules = brief.rules[locale];
  if (brief.safety) out.safety = brief.safety[locale];
  return out;
}
