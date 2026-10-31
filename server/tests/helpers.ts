// Test helpers: a fake signed-in user and a tiny in-memory stand-in for the Supabase query builder.
import type { AuthDeps } from '../src/middleware/auth.js';

export const EVENT_ID = '11111111-1111-4111-8111-111111111111';

export interface FakeDb {
  updates: Record<string, unknown>[];
  inserts: Record<string, unknown>[];
  from(table: string): unknown;
}

/** Every query resolves to the given event row; writes are recorded so tests can assert on them. */
export function fakeDb(event: Record<string, unknown> | null): FakeDb {
  const updates: Record<string, unknown>[] = [];
  const inserts: Record<string, unknown>[] = [];
  return {
    updates,
    inserts,
    from() {
      const q: Record<string, unknown> = {};
      const chain = () => q;
      q.select = chain;
      q.eq = chain;
      q.order = chain;
      q.update = (v: Record<string, unknown>) => {
        updates.push(v);
        return q;
      };
      q.insert = (v: Record<string, unknown>) => {
        inserts.push(v);
        return q;
      };
      q.maybeSingle = async () => ({ data: event, error: null });
      q.single = async () => ({ data: event, error: null });
      q.then = (resolve: (v: unknown) => unknown) => resolve({ data: event ? [event] : [], error: null });
      return q;
    },
  };
}

export function authAs(db: FakeDb): AuthDeps {
  return {
    verify: async token => (token === 'good-token' ? { id: 'user-1', email: 'host@example.com' } : null),
    userDb: () => db as never,
  };
}

export const sampleEvent = {
  id: EVENT_ID,
  title: 'Asha’s 30th birthday',
  event_type: 'Birthday',
  event_date: '2026-12-20',
  location: 'Rooftop cafe',
  guest_count: 40,
  budget_total: 50000,
  description: 'Fairy lights and live music',
  ai_plan: null,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
};

export const goodPlanJson = JSON.stringify({
  summary: 'A warm rooftop evening with music.',
  theme: 'Fairy lights and marigolds',
  surprise_idea: 'A video of friends sending wishes.',
  timeline: [
    { time: '6:00 pm', activity: 'Guests arrive' },
    { time: '7:30 pm', activity: 'Cake and toasts' },
  ],
  checklist: [{ task: 'Book the venue', when: '6 weeks before' }],
  budget_breakdown: [
    { category: 'Venue', amount: 20000 },
    { category: 'Food', amount: 30000 },
  ],
  tips: ['Confirm headcount a week ahead'],
});
