// Guest list and RSVPs. Collection routes hang off an event; item routes are by guest id.
import { Router } from 'express';
import { HttpError } from '../errors.js';
import { authOf } from '../middleware/auth.js';
import { dbError, idSchema, notFound, parse, wrap } from '../lib/http.js';
import { guestColumns, guestOut } from '../lib/mappers.js';
import type { GuestRow } from '../lib/mappers.js';
import { guestInput, guestPatch } from '../schemas.js';

const MAX_GUESTS_PER_EVENT = 1000;

export function guestsRouter(): Router {
  const r = Router();

  r.get('/events/:eventId/guests', wrap(async (req, res) => {
    const { db } = authOf(res);
    const eventId = parse(idSchema, req.params.eventId);
    const { data, error } = await db.from('guests').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
    if (error) throw dbError(error);
    res.json({ guests: ((data ?? []) as GuestRow[]).map(guestOut) });
  }));

  r.post('/events/:eventId/guests', wrap(async (req, res) => {
    const { db, userId } = authOf(res);
    const eventId = parse(idSchema, req.params.eventId);
    const input = parse(guestInput, req.body);
    const { count, error: countError } = await db
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);
    if (countError) throw dbError(countError);
    if ((count ?? 0) >= MAX_GUESTS_PER_EVENT) {
      throw new HttpError(409, 'This event has reached the limit of ' + MAX_GUESTS_PER_EVENT + ' guests.', 'limit_reached');
    }
    const { data, error } = await db
      .from('guests')
      .insert({ ...guestColumns(input), event_id: eventId, user_id: userId })
      .select('*')
      .single();
    if (error) throw dbError(error);
    res.status(201).json({ guest: guestOut(data as GuestRow) });
  }));

  r.patch('/guests/:id', wrap(async (req, res) => {
    const { db } = authOf(res);
    const id = parse(idSchema, req.params.id);
    const patch = parse(guestPatch, req.body);
    const { data, error } = await db.from('guests').update(guestColumns(patch)).eq('id', id).select('*').maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('Guest');
    res.json({ guest: guestOut(data as GuestRow) });
  }));

  r.delete('/guests/:id', wrap(async (req, res) => {
    const { db } = authOf(res);
    const id = parse(idSchema, req.params.id);
    const { data, error } = await db.from('guests').delete().eq('id', id).select('id');
    if (error) throw dbError(error);
    if (!data || data.length === 0) throw notFound('Guest');
    res.json({ ok: true });
  }));

  return r;
}
