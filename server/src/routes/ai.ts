// AI features: plan generation, applying the AI budget, and invitation writing (GLM-5.3 via Ollama Cloud).
import { Router } from 'express';
import { authOf } from '../middleware/auth.js';
import { dbError, idSchema, notFound, parse, wrap } from '../lib/http.js';
import { budgetOut, type BudgetRow, type EventRow } from '../lib/mappers.js';
import { creativeMessages, intakeMessages, invitationMessages, parseCreative, parseIntake, parsePlan, planMessages } from '../lib/prompts.js';
import type { ChatMessage, ChatOptions } from '../lib/ollama.js';
import { HttpError } from '../errors.js';
import { intakeInput, invitationInput, planSchema } from '../schemas.js';

export interface Llm {
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}

export function aiRouter(llm: Llm): Router {
  const r = Router();

  async function loadEvent(res: Parameters<typeof authOf>[0], id: string): Promise<EventRow> {
    const { db } = authOf(res);
    const { data, error } = await db.from('events').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('Event');
    return data as EventRow;
  }

  // Generate (or regenerate) the plan and save it on the event.
  r.post('/events/:id/plan', wrap(async (req, res) => {
    const { db } = authOf(res);
    const id = parse(idSchema, req.params.id);
    const event = await loadEvent(res, id);
    const raw = await llm.chat(planMessages(event), { json: true, maxTokens: 3500 });
    const plan = parsePlan(raw);
    const { error } = await db.from('events').update({ ai_plan: plan }).eq('id', id);
    if (error) throw dbError(error);
    res.json({ plan });
  }));

  // Creative Studio: palette, decor, menu, playlist vibes, activities and more. Saved on the event.
  r.post('/events/:id/creative', wrap(async (req, res) => {
    const { db } = authOf(res);
    const id = parse(idSchema, req.params.id);
    const event = await loadEvent(res, id);
    const raw = await llm.chat(creativeMessages(event), { json: true, maxTokens: 3000 });
    const creative = parseCreative(raw);
    const { error } = await db.from('events').update({ ai_creative: creative }).eq('id', id);
    if (error) throw dbError(error);
    res.json({ creative });
  }));

  // Chat intake: one conversational turn that returns a reply, the updated draft and tappable suggestions. Nothing is saved.
  r.post('/ai/intake', wrap(async (req, res) => {
    const { messages, draft } = parse(intakeInput, req.body ?? {});
    const today = new Date().toISOString().slice(0, 10);
    const raw = await llm.chat(intakeMessages(messages, draft, today), { json: true, maxTokens: 900 });
    res.json(parseIntake(raw, draft));
  }));

  // Turn the AI budget breakdown into real budget lines.
  r.post('/events/:id/plan/apply-budget', wrap(async (req, res) => {
    const { db, userId } = authOf(res);
    const id = parse(idSchema, req.params.id);
    const event = await loadEvent(res, id);
    const stored = planSchema.safeParse(event.ai_plan);
    if (!stored.success || stored.data.budget_breakdown.length === 0) {
      throw new HttpError(409, 'Generate a plan first, then add its budget.', 'no_plan');
    }
    const rows = stored.data.budget_breakdown
      .filter(b => b.category)
      .map(b => ({ event_id: id, user_id: userId, category: b.category, description: 'From the AI plan', estimated: b.amount }));
    const { data, error } = await db.from('budget_items').insert(rows).select('*');
    if (error) throw dbError(error);
    res.status(201).json({ items: ((data ?? []) as BudgetRow[]).map(budgetOut) });
  }));

  // Draft an invitation in a chosen tone. Not saved; the host copies it.
  r.post('/events/:id/invitation', wrap(async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const { tone } = parse(invitationInput, req.body ?? {});
    const event = await loadEvent(res, id);
    const text = await llm.chat(invitationMessages(event, tone), { maxTokens: 800 });
    res.json({ text });
  }));

  return r;
}
