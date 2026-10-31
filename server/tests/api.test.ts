// API behaviour with a fake signed-in user, a fake database and a fake AI. No network is used.
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { resetClients } from '../src/lib/supabase.js';
import { AiError } from '../src/errors.js';
import { EVENT_ID, authAs, fakeDb, goodPlanJson, sampleEvent } from './helpers.js';

const AUTH = { Authorization: 'Bearer good-token' };

beforeEach(() => {
  resetClients();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.OLLAMA_API_KEY = 'super-secret-ollama-key';
});

afterEach(() => {
  delete process.env.OLLAMA_API_KEY;
});

describe('health and config', () => {
  it('reports health without leaking secrets', async () => {
    const res = await request(createApp()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database).toBe('not_configured');
    expect(res.body.checks.ai).toBe('configured');
    expect(JSON.stringify(res.body)).not.toContain('super-secret-ollama-key');
  });

  it('exposes only public Supabase settings', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'public-anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-service-role';
    const res = await request(createApp()).get('/api/config').expect(200);
    expect(res.body).toEqual({ configured: true, supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-anon' });
    expect(JSON.stringify(res.body)).not.toContain('secret-service-role');
  });

  it('sets strict security headers', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    const res = await request(createApp()).get('/api/events').expect(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('rejects an invalid token', async () => {
    const app = createApp({ auth: authAs(fakeDb(null)) });
    await request(app).get('/api/events').set('Authorization', 'Bearer nope').expect(401);
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const app = createApp({ auth: authAs(fakeDb(null)) });
    const res = await request(app).get('/api/nothing-here').set(AUTH).expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});

describe('validation', () => {
  const app = () => createApp({ auth: authAs(fakeDb(null)) });

  it('rejects an event without a title', async () => {
    const res = await request(app()).post('/api/events').set(AUTH).send({ title: '  ' }).expect(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details[0].path).toBe('title');
  });

  it('rejects a malformed date', async () => {
    await request(app()).post('/api/events').set(AUTH).send({ title: 'Party', eventDate: '20/12/2026' }).expect(400);
  });

  it('rejects an invalid id', async () => {
    await request(app()).get('/api/events/not-a-uuid').set(AUTH).expect(400);
  });

  it('rejects invalid JSON', async () => {
    const res = await request(app())
      .post('/api/events')
      .set(AUTH)
      .set('Content-Type', 'application/json')
      .send('{"title": ')
      .expect(400);
    expect(res.body.error.code).toBe('invalid_json');
  });

  it('rejects a bad guest email and an unknown RSVP value', async () => {
    await request(app()).post('/api/events/' + EVENT_ID + '/guests').set(AUTH).send({ name: 'Ravi', email: 'nope' }).expect(400);
    await request(app()).patch('/api/guests/' + EVENT_ID).set(AUTH).send({ rsvp: 'definitely' }).expect(400);
  });
});

describe('AI plan', () => {
  it('generates a plan with the model and saves it', async () => {
    const db = fakeDb(sampleEvent);
    const app = createApp({ auth: authAs(db), llm: { chat: async () => goodPlanJson } });
    const res = await request(app).post('/api/events/' + EVENT_ID + '/plan').set(AUTH).expect(200);
    expect(res.body.plan.timeline).toHaveLength(2);
    expect(res.body.plan.budget_breakdown[0]).toEqual({ category: 'Venue', amount: 20000 });
    expect(db.updates[0]).toHaveProperty('ai_plan');
  });

  it('is honest when the AI fails: 503, nothing saved', async () => {
    const db = fakeDb(sampleEvent);
    const llm = {
      chat: async () => {
        throw new AiError('The AI service could not be reached. Please try again.', 'ai_unreachable');
      },
    };
    const res = await request(createApp({ auth: authAs(db), llm })).post('/api/events/' + EVENT_ID + '/plan').set(AUTH).expect(503);
    expect(res.body.error.message).toContain('could not be reached');
    expect(db.updates).toHaveLength(0);
  });

  it('rejects an unreadable AI answer with 502', async () => {
    const db = fakeDb(sampleEvent);
    const app = createApp({ auth: authAs(db), llm: { chat: async () => 'Sure! Here is a lovely party.' } });
    const res = await request(app).post('/api/events/' + EVENT_ID + '/plan').set(AUTH).expect(502);
    expect(res.body.error.code).toBe('ai_bad_format');
    expect(db.updates).toHaveLength(0);
  });

  it('returns 404 when the event does not exist', async () => {
    const app = createApp({ auth: authAs(fakeDb(null)), llm: { chat: async () => goodPlanJson } });
    await request(app).post('/api/events/' + EVENT_ID + '/plan').set(AUTH).expect(404);
  });

  it('writes an invitation in the requested tone', async () => {
    let seen = '';
    const llm = {
      chat: async (messages: { content: string }[]) => {
        seen = messages[0].content;
        return 'You are invited!';
      },
    };
    const app = createApp({ auth: authAs(fakeDb(sampleEvent)), llm });
    const res = await request(app).post('/api/events/' + EVENT_ID + '/invitation').set(AUTH).send({ tone: 'playful' }).expect(200);
    expect(res.body.text).toBe('You are invited!');
    expect(seen).toContain('playful');
  });

  it('creates a creative concept and saves it', async () => {
    const creative = JSON.stringify({
      tagline: 'Golden hour, grown-up fun',
      palette: ['#fff7ed', '#c2410c', '#f59e0b', '#431407', '#fed7aa'],
      decor: ['Marigold garlands', 'Fairy-light canopy'],
      menu: [{ course: 'Starter', idea: 'Chaat bar' }],
      playlist_vibes: ['90s Bollywood'],
      activities: ['Memory lane quiz'],
      photo_booth: ['Retro frames'],
      hashtag: '#Asha30',
      dress_code: 'Festive pastel',
      welcome_drink: 'Rose lemonade',
      return_gifts: ['Mini diyas'],
    });
    const db = fakeDb(sampleEvent);
    const app = createApp({ auth: authAs(db), llm: { chat: async () => creative } });
    const res = await request(app).post('/api/events/' + EVENT_ID + '/creative').set(AUTH).expect(200);
    expect(res.body.creative.palette).toHaveLength(5);
    expect(db.updates[0]).toHaveProperty('ai_creative');
  });

  it('chat intake merges new fields into the draft and returns suggestions', async () => {
    const answer = JSON.stringify({
      reply: 'Lovely! When is it?',
      fields: { title: "Asha's 30th birthday", eventType: 'Birthday', guestCount: 'lots' },
      suggestions: ['This Saturday', 'Next month'],
      ready: true,
    });
    const app = createApp({ auth: authAs(fakeDb(sampleEvent)), llm: { chat: async () => answer } });
    const res = await request(app)
      .post('/api/ai/intake')
      .set(AUTH)
      .send({ messages: [{ role: 'user', content: 'Birthday for Asha' }], draft: { location: 'Goa' } })
      .expect(200);
    expect(res.body.draft).toMatchObject({ title: "Asha's 30th birthday", eventType: 'Birthday', location: 'Goa' });
    expect(res.body.draft.guestCount).toBeUndefined();
    expect(res.body.suggestions).toHaveLength(2);
    expect(res.body.ready).toBe(true);
  });

  it('chat intake survives a plain-text AI answer and rejects an empty chat', async () => {
    const app = createApp({ auth: authAs(fakeDb(sampleEvent)), llm: { chat: async () => 'Sounds fun, tell me more!' } });
    const ok = await request(app).post('/api/ai/intake').set(AUTH).send({ messages: [{ role: 'user', content: 'hi' }] }).expect(200);
    expect(ok.body.reply).toContain('Sounds fun');
    expect(ok.body.ready).toBe(false);
    await request(app).post('/api/ai/intake').set(AUTH).send({ messages: [] }).expect(400);
  });

  it('refuses to add a budget before a plan exists', async () => {
    const app = createApp({ auth: authAs(fakeDb(sampleEvent)) });
    const res = await request(app).post('/api/events/' + EVENT_ID + '/plan/apply-budget').set(AUTH).expect(409);
    expect(res.body.error.code).toBe('no_plan');
  });
});
