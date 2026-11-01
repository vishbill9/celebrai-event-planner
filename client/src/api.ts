// Small typed wrapper around the CelebrAI REST API. Every call carries the user's access token.
import { getSupabase } from './supabase';
import type { BudgetItem, Creative, Draft, EventInput, EventItem, Guest, IntakeReply, Plan, Rsvp } from './types';

export interface Venue {
  name: string;
  area: string;
  venueType: string;
  rating: number;
  capacityMin: number;
  capacityMax: number;
  amenities: string[];
  priceNote: string;
  whyItFits: string;
  mapsUrl: string;
  fits: boolean | null;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  let res: Response;
  try {
    res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the server. Check your connection and try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (json as { error?: { code?: string; message?: string } }).error;
    if (res.status === 401) await supabase.auth.signOut();
    throw new ApiError(res.status, e?.code ?? 'error', e?.message ?? 'Something went wrong.');
  }
  return json as T;
}

export const api = {
  listEvents: () => call<{ events: EventItem[] }>('GET', '/events').then(r => r.events),
  createEvent: (i: Partial<EventInput>) => call<{ event: EventItem }>('POST', '/events', i).then(r => r.event),
  getEvent: (id: string) => call<{ event: EventItem; guests: Guest[]; budget: BudgetItem[] }>('GET', '/events/' + id),
  updateEvent: (id: string, i: Partial<EventInput>) => call<{ event: EventItem }>('PATCH', '/events/' + id, i).then(r => r.event),
  deleteEvent: (id: string) => call<{ ok: true }>('DELETE', '/events/' + id),

  addGuest: (eventId: string, g: { name: string; email?: string; rsvp?: Rsvp; plusOnes?: number }) =>
    call<{ guest: Guest }>('POST', '/events/' + eventId + '/guests', g).then(r => r.guest),
  updateGuest: (id: string, g: Partial<Guest>) => call<{ guest: Guest }>('PATCH', '/guests/' + id, g).then(r => r.guest),
  deleteGuest: (id: string) => call<{ ok: true }>('DELETE', '/guests/' + id),

  addBudget: (eventId: string, b: { category: string; description?: string; estimated?: number; actual?: number }) =>
    call<{ item: BudgetItem }>('POST', '/events/' + eventId + '/budget', b).then(r => r.item),
  updateBudget: (id: string, b: Partial<BudgetItem>) => call<{ item: BudgetItem }>('PATCH', '/budget/' + id, b).then(r => r.item),
  deleteBudget: (id: string) => call<{ ok: true }>('DELETE', '/budget/' + id),

  generatePlan: (eventId: string) => call<{ plan: Plan }>('POST', '/events/' + eventId + '/plan').then(r => r.plan),
  generateCreative: (eventId: string) => call<{ creative: Creative }>('POST', '/events/' + eventId + '/creative').then(r => r.creative),
  findVenues: (eventId: string, area?: string) => call<{ area: string; venues: Venue[] }>('POST', '/events/' + eventId + '/venues', area ? { area } : {}),
  intake: (messages: { role: 'user' | 'assistant'; content: string }[], draft: Draft) => call<IntakeReply>('POST', '/ai/intake', { messages, draft }),
  applyPlanBudget: (eventId: string) => call<{ items: BudgetItem[] }>('POST', '/events/' + eventId + '/plan/apply-budget').then(r => r.items),
  writeInvitation: (eventId: string, tone: string) => call<{ text: string }>('POST', '/events/' + eventId + '/invitation', { tone }).then(r => r.text),
};
