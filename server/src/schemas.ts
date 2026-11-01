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

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).catch('#7c3aed');
const list = (max: number, len = 200) => z.array(z.string().trim().max(len).catch('')).max(max).default([]);

/** The creative moodboard the model returns for an event. */
export const creativeSchema = z.object({
  tagline: text(160),
  palette: z.array(hex).min(1).max(6).catch(['#7c3aed', '#ec4899', '#f59e0b', '#1e1b2e', '#faf7ff']),
  decor: list(8),
  menu: z.array(z.object({ course: text(60), idea: text(200) })).max(8).default([]),
  playlist_vibes: list(8),
  activities: list(8),
  photo_booth: list(8),
  hashtag: text(60),
  dress_code: text(160),
  welcome_drink: text(160),
  return_gifts: list(6),
});
export type Creative = z.infer<typeof creativeSchema>;

// Chat intake: the AI fills these fields as the host talks. Invalid or unknown values are dropped.
const opt = <T extends z.ZodTypeAny>(t: T) => t.optional().catch(undefined);
/** Models sometimes send numbers as strings ("25", "40,000"); accept those. */
const num = (t: z.ZodTypeAny) =>
  z.preprocess(v => (typeof v === 'string' && /^[\d,]+(\.\d+)?$/.test(v.trim()) ? Number(v.replace(/,/g, '')) : v), t);
export const draftSchema = z.object({
  title: opt(z.string().trim().max(120)),
  eventType: opt(z.string().trim().max(60)),
  eventDate: opt(day.nullable()),
  location: opt(z.string().trim().max(160)),
  guestCount: opt(num(z.number().int().min(0).max(5000))),
  budgetTotal: opt(num(money)),
  description: opt(z.string().trim().max(2000)),
});
export type Draft = z.infer<typeof draftSchema>;

export const intakeInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(600) }))
    .min(1)
    .max(30),
  draft: draftSchema.default({}),
});

const asObject = (v: unknown): unknown => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const asStrings = (v: unknown): unknown =>
  Array.isArray(v)
    ? v
        .map(x => (typeof x === 'number' ? String(x) : x))
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0 && x.length <= 60)
        .slice(0, 8)
    : [];

/** The AI answer. Lenient on everything except the reply sentence. */
export const intakeOutSchema = z.object({
  reply: z.string().trim().min(1).max(600),
  fields: z.preprocess(asObject, draftSchema),
  suggestions: z.preprocess(asStrings, z.array(z.string())),
  ready: z.boolean().catch(false),
});
