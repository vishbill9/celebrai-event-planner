import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from './api';
import type { EventItem } from './types';
import { emojiFor } from './CardDesigner';
import ChatIntake from './ChatIntake';
import './chat.css';
import type { EventInput } from './types';
import { confetti, daysUntil, errorText, formatDate, money, useToast } from './ui';

const TYPES = ['Birthday', 'Wedding', 'Anniversary', 'Baby shower', 'Corporate', 'Festival', 'Graduation', 'Other'];

export default function Dashboard() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [classic, setClassic] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  function load() {
    setError('');
    api.listEvents().then(setEvents).catch(e => setError(errorText(e)));
  }
  useEffect(load, []);

  async function createFrom(input: Partial<EventInput>) {
    setCreating(true);
    try {
      const event = await api.createEvent(input);
      confetti();
      toast.show('Event created. Now let the AI plan it!');
      navigate('/events/' + event.id);
    } catch (err) {
      toast.show(errorText(err), 'error');
    } finally {
      setCreating(false);
    }
  }

  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void createFrom({
      title: String(f.get('title') ?? ''),
      eventType: String(f.get('eventType') ?? ''),
      eventDate: String(f.get('eventDate') ?? '') || null,
      location: String(f.get('location') ?? ''),
      guestCount: Number(f.get('guestCount') || 0),
      budgetTotal: Number(f.get('budgetTotal') || 0),
      description: String(f.get('description') ?? ''),
    });
  }

  return (
    <main className="page">
      <section className="card">
        <div className="card-head">
          <h2>{classic ? 'Start a new event' : 'Plan something with your AI planner'}</h2>
          <button className="link" onClick={() => setClassic(!classic)}>{classic ? 'Chat instead' : 'Use the classic form'}</button>
        </div>
        {!classic && <ChatIntake onCreate={input => void createFrom(input)} creating={creating} />}
        {classic && <form className="grid-form" onSubmit={create}>
          <label className="span2">Event name
            <input name="title" required maxLength={120} placeholder="Asha's 30th birthday" />
          </label>
          <label>Type
            <select name="eventType" defaultValue="Birthday">{TYPES.map(t => <option key={t}>{t}</option>)}</select>
          </label>
          <label>Date
            <input name="eventDate" type="date" />
          </label>
          <label>Location
            <input name="location" maxLength={160} placeholder="Rooftop cafe, Bengaluru" />
          </label>
          <label>Guests
            <input name="guestCount" type="number" min={0} max={5000} placeholder="40" />
          </label>
          <label>Budget (INR)
            <input name="budgetTotal" type="number" min={0} placeholder="50000" />
          </label>
          <label className="span2">Ideas, mood or must-haves
            <textarea name="description" rows={3} maxLength={2000} placeholder="Fairy lights, live acoustic music, a surprise for Asha..." />
          </label>
          <div className="span2"><button className="btn primary" disabled={creating}>{creating ? 'Creating...' : 'Create event'}</button></div>
        </form>}
      </section>

      <h2 className="section-title">Your events</h2>
      {error && <p className="form-error" role="alert">{error} <button className="link" onClick={load}>Retry</button></p>}
      {!events && !error && <p className="muted">Loading your events...</p>}
      {events && events.length === 0 && <p className="empty">No events yet. Create your first one above and the AI will plan it for you.</p>}
      <div className="event-grid">
        {events?.map(ev => {
          const d = daysUntil(ev.eventDate);
          return (
            <Link key={ev.id} to={'/events/' + ev.id} className="card event-card">
              <div className="chip-row">
                {ev.eventType && <span className="chip">{ev.eventType}</span>}
                {d !== null && d >= 0 && <span className="chip accent">{d === 0 ? 'Today' : d + (d === 1 ? ' day' : ' days') + ' to go'}</span>}
                {ev.aiPlan && <span className="chip good">AI plan ready</span>}
              </div>
              <h3><span aria-hidden="true">{emojiFor(ev.eventType)}</span> {ev.title}</h3>
              <p className="muted">{formatDate(ev.eventDate)}{ev.location ? ' - ' + ev.location : ''}</p>
              <p className="meta">{ev.guestsInvited ?? 0} guests on the list - budget Rs {money(ev.budgetTotal)}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
