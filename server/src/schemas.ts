// Request validation (zod) and the shape of the AI-generated plan.
import { z } from 'zod';

const money = z.number().finite().min(0).max(1_000_000_000);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');

export const eventInput = z.object({
  title: z.string().trim().min(1, 'Give your event a name').max(120),
  eventType: z.string().trim().max(60).default(''),
  eventDate: day.nullable().optional(),
  location: z.string().trim().max(160).default(''),
  guestCount: z.number().int().min(0).max(5000).default(0),
  budgetTotal: money.default(0),
  description: z.string().trim().max(2000).default(''),
});
export type EventInput = z.infer<typeof eventInput>;

export const eventPatch = z
  .object({
    title: z.string().trim().min(1).max(120),
    eventType: z.string().trim().max(60),
    eventDate: day.nullable(),
    location: z.string().trim().max(160),
    guestCount: z.number().int().min(0).max(5000),
    budgetTotal: money,
    description: z.string().trim().max(2000),
  })
  .partial()
  .refine(v => Object.keys(v).length > 0, 'Nothing to update');
export type EventPatch = z.infer<typeof eventPatch>;

const rsvp = z.enum(['pending', 'yes', 'no', 'maybe']);

export const guestInput = z.object({
  name: z.string().trim().min(1, 'Guest name is required').max(120),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email').max(200)]).default(''),
  rsvp: rsvp.default('pending'),
  plusOnes: z.number().int().min(0).max(20).default(0),
  notes: z.string().trim().max(500).default(''),
});
export type GuestInput = z.infer<typeof guestInput>;

export const guestPatch = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.union([z.literal(''), z.string().trim().email().max(200)]),
    rsvp,
    plusOnes: z.number().int().min(0).max(20),
    notes: z.string().trim().max(500),
  })
  .partial()
  .refine(v => Object.keys(v).length > 0, 'Nothing to update');
export type GuestPatch = z.infer<typeof guestPatch>;

export const budgetInput = z.object({
  category: z.string().trim().min(1, 'Category is required').max(80),
  description: z.string().trim().max(200).default(''),
  estimated: money.default(0),
  actual: money.default(0),
  paid: z.boolean().default(false),
});
export type BudgetInput = z.infer<typeof budgetInput>;

export const budgetPatch = z
  .object({
    category: z.string().trim().min(1).max(80),
    description: z.string().trim().max(200),
    estimated: money,
    actual: money,
    paid: z.boolean(),
  })
  .partial()
  .refine(v => Object.keys(v).length > 0, 'Nothing to update');
export type BudgetPatch = z.infer<typeof budgetPatch>;

export const invitationInput = z.object({
  tone: z.enum(['warm', 'playful', 'formal']).default('warm'),
});

const text = (max: number) => z.string().trim().max(max).catch('');

/** The plan the model must return. Lenient on small slips, strict on shape. */
export const planSchema = z.object({
  summary: text(1200),
  theme: text(200),
  surprise_idea: text(600).default(''),
  timeline: z.array(z.object({ time: text(60), activity: text(300) })).max(20).default([]),
  checklist: z.array(z.object({ task: text(300), when: text(80) })).max(30).default([]),
  budget_breakdown: z
    .array(z.object({ category: text(80), amount: z.coerce.number().finite().min(0).catch(0) }))
    .max(20)
    .default([]),
  tips: z.array(text(300)).max(12).default([]),
});
export type Plan = z.infer<typeof planSchema>;
