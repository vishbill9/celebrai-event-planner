// Budget line items for an event. Collection routes hang off an event; item routes are by item id.
import { Router } from 'express';
import { HttpError } from '../errors.js';
import { authOf } from '../middleware/auth.js';
import { dbError, idSchema, notFound, parse, wrap } from '../lib/http.js';
import { budgetColumns, budgetOut } from '../lib/mappers.js';
import type { BudgetRow } from '../lib/mappers.js';
import { budgetInput, budgetPatch } from '../schemas.js';

const MAX_ITEMS_PER_EVENT = 200;

export function budgetRouter(): Router {
  const r = Router();

  r.get('/events/:eventId/budget', wrap(async (req, res) => {
    const { db } = authOf(res);
    const eventId = parse(idSchema, req.params.eventId);
    const { data, error } = await db.from('budget_items').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
    if (error) throw dbError(error);
    res.json({ items: ((data ?? []) as BudgetRow[]).map(budgetOut) });
  }));

  r.post('/events/:eventId/budget', wrap(async (req, res) => {
    const { db, userId } = authOf(res);
    const eventId = parse(idSchema, req.params.eventId);
    const input = parse(budgetInput, req.body);
    const { count, error: countError } = await db
      .from('budget_items')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);
    if (countError) throw dbError(countError);
    if ((count ?? 0) >= MAX_ITEMS_PER_EVENT) {
      throw new HttpError(409, 'This event has reached the limit of ' + MAX_ITEMS_PER_EVENT + ' budget lines.', 'limit_reached');
    }
    const { data, error } = await db
      .from('budget_items')
      .insert({ ...budgetColumns(input), event_id: eventId, user_id: userId })
      .select('*')
      .single();
    if (error) throw dbError(error);
    res.status(201).json({ item: budgetOut(data as BudgetRow) });
  }));

  r.patch('/budget/:id', wrap(async (req, res) => {
    const { db } = authOf(res);
    const id = parse(idSchema, req.params.id);
    const patch = parse(budgetPatch, req.body);
    const { data, error } = await db.from('budget_items').update(budgetColumns(patch)).eq('id', id).select('*').maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('Budget item');
    res.json({ item: budgetOut(data as BudgetRow) });
  }));

  r.delete('/budget/:id', wrap(async (req, res) => {
    const { db } = authOf(res);
    const id = parse(idSchema, req.params.id);
    const { data, error } = await db.from('budget_items').delete().eq('id', id).select('id');
    if (error) throw dbError(error);
    if (!data || data.length === 0) throw notFound('Budget item');
    res.json({ ok: true });
  }));

  return r;
}
