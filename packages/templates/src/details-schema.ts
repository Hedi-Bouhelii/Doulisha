import { z } from 'zod';

import type { TemplateDefinitionData, TemplateField } from './types';

function fieldSchema(field: TemplateField): z.ZodType {
  switch (field.type) {
    case 'number': {
      let schema = z.number();
      if (field.min !== undefined) schema = schema.min(field.min);
      if (field.max !== undefined) schema = schema.max(field.max);
      if (field.step !== undefined && Number.isInteger(field.step)) schema = schema.int();
      return schema;
    }
    case 'text':
      return z
        .string()
        .trim()
        .min(1)
        .max(field.maxLength ?? 2000);
    case 'select': {
      const values = field.options.map((o) => o.value);
      const one = z.string().refine((v) => values.includes(v), { message: 'Invalid option' });
      return field.multiple ? z.array(one).min(1) : one;
    }
    case 'boolean':
      return z.boolean();
    case 'gpx':
      return z.uuid();
  }
}

/**
 * Builds the Zod schema that validates `events.details` for a template.
 * Unknown keys are rejected so stored JSON always matches the template.
 */
export function buildDetailsSchema(definition: Pick<TemplateDefinitionData, 'fields'>) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of definition.fields) {
    const schema = fieldSchema(field);
    shape[field.key] = field.required ? schema : schema.optional();
  }
  return z.strictObject(shape);
}
