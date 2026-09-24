import type { LocalizedText } from '@doulisha/i18n';

/** The four event models (spec 6.1). */
export type EventModel = 'ticketed' | 'group_trip' | 'private' | 'slot_booking';

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

export type RegistrationType = 'free_rsvp' | 'paid' | 'deposit' | 'pay_at_door';

/** Modules a template switches on (spec 6.2). */
export type TemplateModule =
  | 'tickets'
  | 'payments'
  | 'attendees'
  | 'checkin'
  | 'waitlist'
  | 'itinerary'
  | 'meeting_points'
  | 'invitations'
  | 'rsvp'
  | 'gift_pool'
  | 'providers'
  | 'slots';

interface FieldBase {
  /** Key inside `events.details`. */
  key: string;
  label: LocalizedText;
  help?: LocalizedText;
  required?: boolean;
}

export type TemplateField =
  | (FieldBase & { type: 'number'; min?: number; max?: number; step?: number; unit?: string })
  | (FieldBase & { type: 'text'; maxLength?: number; multiline?: boolean })
  | (FieldBase & {
      type: 'select';
      options: { value: string; label: LocalizedText }[];
      multiple?: boolean;
    })
  | (FieldBase & { type: 'boolean' })
  /** A media id pointing to an uploaded GPX track. */
  | (FieldBase & { type: 'gpx' });

/** EVT-05 brief as stored on an event, in the event's language. */
export interface EventBrief {
  whatToBring?: string[];
  dressCode?: string;
  rules?: string;
  safety?: string;
}

/** Default brief offered by the wizard, in the three interface languages. */
export interface LocalizedBrief {
  whatToBring?: LocalizedText[];
  dressCode?: LocalizedText;
  rules?: LocalizedText;
  safety?: LocalizedText;
}

/** JSON stored in `templates.definition`. Admins can edit it (EVT-09). */
export interface TemplateDefinitionData {
  fields: TemplateField[];
  defaultBrief: LocalizedBrief;
  cancellationPolicy: CancellationPolicy;
  registrationTypes: RegistrationType[];
  modules: TemplateModule[];
  /** Keys of `fields` exposed as search filters (DSC-01). */
  searchFilters: string[];
  /** Visual style for generated share images (SHR-02). */
  shareStyle: { accent: string; layout: 'photo' | 'poster' | 'invitation' };
  defaultVisibility: 'public' | 'unlisted' | 'private';
}

/** A template as shipped in code; the seed writes these to the `templates` table. */
export interface TemplateDefinition {
  key: string;
  categorySlug: string;
  model: EventModel;
  name: LocalizedText;
  /** Launch verticals are active; V1 templates are defined but inactive. */
  isActive: boolean;
  definition: TemplateDefinitionData;
}

export interface CategoryDefinition {
  slug: string;
  name: LocalizedText;
  /** lucide icon name. */
  icon: string;
  /** Category accent token in @doulisha/ui-tokens. */
  accent: string;
  sort: number;
}
