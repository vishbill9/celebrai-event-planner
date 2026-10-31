// Translate between database rows (snake_case) and the API (camelCase).
import type { BudgetInput, BudgetPatch, EventInput, EventPatch, GuestInput, GuestPatch } from '../schemas.js';

export interface EventRow {
  id: string;
  title: string;
  event_type: string;
  event_date: string | null;
  location: string;
  guest_count: number;
  budget_total: number | string;
  description: string;
  ai_plan: unknown;
  ai_creative?: unknown;
  created_at: string;
  updated_at: string;
  guests?: { count: number }[];
  budget_items?: { count: number }[];
}

export interface GuestRow {
  id: string;
  event_id: string;
  name: string;
  email: string;
  rsvp: string;
  plus_ones: number;
  notes: string;
  created_at: string;
}

export interface BudgetRow {
  id: string;
  event_id: string;
  category: string;
  description: string;
  estimated: number | string;
  actual: number | string;
  paid: boolean;
  created_at: string;
}

export function eventOut(r: EventRow) {
  return {
    id: r.id,
    title: r.title,
    eventType: r.event_type,
    eventDate: r.event_date,
    location: r.location,
    guestCount: r.guest_count,
    budgetTotal: Number(r.budget_total),
    description: r.description,
    aiPlan: r.ai_plan ?? null,
    aiCreative: r.ai_creative ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function eventListOut(r: EventRow) {
  return {
    ...eventOut(r),
    guestsInvited: r.guests?.[0]?.count ?? 0,
    budgetItems: r.budget_items?.[0]?.count ?? 0,
  };
}

export function guestOut(r: GuestRow) {
  return {
    id: r.id,
    eventId: r.event_id,
    name: r.name,
    email: r.email,
    rsvp: r.rsvp,
    plusOnes: r.plus_ones,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

export function budgetOut(r: BudgetRow) {
  return {
    id: r.id,
    eventId: r.event_id,
    category: r.category,
    description: r.description,
    estimated: Number(r.estimated),
    actual: Number(r.actual),
    paid: r.paid,
    createdAt: r.created_at,
  };
}

export function eventColumns(i: EventInput | EventPatch): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  if (i.title !== undefined) c.title = i.title;
  if (i.eventType !== undefined) c.event_type = i.eventType;
  if (i.eventDate !== undefined) c.event_date = i.eventDate;
  if (i.location !== undefined) c.location = i.location;
  if (i.guestCount !== undefined) c.guest_count = i.guestCount;
  if (i.budgetTotal !== undefined) c.budget_total = i.budgetTotal;
  if (i.description !== undefined) c.description = i.description;
  return c;
}

export function guestColumns(i: GuestInput | GuestPatch): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  if (i.name !== undefined) c.name = i.name;
  if (i.email !== undefined) c.email = i.email;
  if (i.rsvp !== undefined) c.rsvp = i.rsvp;
  if (i.plusOnes !== undefined) c.plus_ones = i.plusOnes;
  if (i.notes !== undefined) c.notes = i.notes;
  return c;
}

export function budgetColumns(i: BudgetInput | BudgetPatch): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  if (i.category !== undefined) c.category = i.category;
  if (i.description !== undefined) c.description = i.description;
  if (i.estimated !== undefined) c.estimated = i.estimated;
  if (i.actual !== undefined) c.actual = i.actual;
  if (i.paid !== undefined) c.paid = i.paid;
  return c;
}
