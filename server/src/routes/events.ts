// Events: list, create, read (with guests and budget), update and delete.
import { Router } from 'express';
import { authOf } from '../middleware/auth.js';
import { dbError, idSchema, notFound, parse, wrap } from '../lib/http.js';
import { budgetOut, eventColumns, eventListOut, eventOut, guestOut } from '../lib/mappers.js';
import type { BudgetRow, EventRow, GuestRow } from '../lib/mappers.js';
import { eventInput, eventPatch } from '../schemas.js';

export function eventsRouter(): Router {
  const r = Router();

  r.get('/', wrap(async (_req, res) => {
    const { db } = authOf(res);
    const { data, error } = await db
      .from('events')
      .select('*, guests(count), budget_items(count)')
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw dbError(error);
    res.json({ events: ((data ?? []) as EventRow[]).map(eventListOut) });
  }));

  r.post('/', wrap(async (req, res) => {
    const { db, userId } = authOf(res);
    const input = parse(eventInput, req.body);
    const { data, error } = await db
      .from('events')
      .insert({ ...eventColumns(input), user_id: userId })
      .select('*')
      .single();
    if (error) throw dbError(error);
    res.status(201).json({ event: eventOut(data as EventRow) });
  }));

  r.get('/:id', wrap(async (req, res) => {
    const { db } = authOf(res);
    const id = parse(idSchema, req.params.id);
    const { data: event, error } = await db.from('events').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    if (!event) throw notFound('Event');
    const [guests, budget] = await Promise.all([
      db.from('guests').select('*').eq('event_id', id).order('created_at', { ascending: true }),
      db.from('budget_items').select('*').eq('event_id', id).order('created_at', { ascending: true }),
    ]);
    if (guests.error) throw dbError(guests.error);
    if (budget.error) throw dbError(budget.error);
    res.json({
      event: eventOut(event as EventRow),
      guests: ((guests.data ?? []) as GuestRow[]).map(guestOut),
      budget: ((budget.data ?? []) as BudgetRow[]).map(budgetOut),
    });
  }));

  r.patch('/:id', wrap(async (req, res) => {
    const { db } = authOf(res);
    const id = parse(idSchema, req.params.id);
    const patch = parse(eventPatch, req.body);
    const { data, error } = await db.from('events').update(eventColumns(patch)).eq('id', id).select('*').maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('Event');
    res.json({ event: eventOut(data as EventRow) });
  }));

  r.delete('/:id', wrap(async (req, res) => {
    const { db } = authOf(res);
    const id = parse(idSchema, req.params.id);
    const { data, error } = await db.from('events').delete().eq('id', id).select('id');
    if (error) throw dbError(error);
    if (!data || data.length === 0) throw notFound('Event');
    res.json({ ok: true });
  }));

  return r;
}
