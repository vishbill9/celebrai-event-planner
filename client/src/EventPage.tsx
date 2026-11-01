import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from './api';
import type { BudgetItem, EventItem, Guest } from './types';
import { daysUntil, errorText, formatDate, money, useToast } from './ui';
import PlanView from './PlanView';
import Guests from './Guests';
import Budget from './Budget';
import Invitation from './Invitation';
import Studio from './Studio';
import Venues from './Venues';
import CardDesigner from './CardDesigner';
import { emojiFor } from './cardSvg';

type Tab = 'plan' | 'venues' | 'studio' | 'design' | 'guests' | 'budget' | 'invite';
const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'AI plan' },
  { id: 'venues', label: 'Venues' },
  { id: 'studio', label: 'Studio' },
  { id: 'design', label: 'Card designer' },
  { id: 'guests', label: 'Guests' },
  { id: 'budget', label: 'Budget' },
  { id: 'invite', label: 'Invitation' },
];

export default function EventPage() {
  const { id = '' } = useParams();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('plan');
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(() => {
    setError('');
    api.getEvent(id).then(r => {
      setEvent(r.event);
      setGuests(r.guests);
      setBudget(r.budget);
    }).catch(e => setError(errorText(e)));
  }, [id]);
  useEffect(load, [load]);

  async function remove() {
    if (!window.confirm('Delete this event with its guests and budget? This cannot be undone.')) return;
    try {
      await api.deleteEvent(id);
      toast.show('Event deleted.');
      navigate('/');
    } catch (e) {
      toast.show(errorText(e), 'error');
    }
  }

  if (error) {
    return (
      <main className="page">
        <p className="form-error" role="alert">{error}</p>
        <Link to="/" className="btn ghost">Back to events</Link>
      </main>
    );
  }
  if (!event) return <main className="page"><p className="muted">Loading event...</p></main>;

  const d = daysUntil(event.eventDate);
  const attending = guests.filter(g => g.rsvp === 'yes').reduce((n, g) => n + 1 + g.plusOnes, 0);
  const spent = budget.reduce((n, b) => n + b.actual, 0);

  return (
    <main className="page">
      <Link to="/" className="back">All events</Link>
      <section className="card hero">
        <div className="chip-row">
          {event.eventType && <span className="chip">{event.eventType}</span>}
          {d !== null && d >= 0 && <span className="chip accent">{d === 0 ? 'Today!' : d + (d === 1 ? ' day' : ' days') + ' to go'}</span>}
        </div>
        <h1><span aria-hidden="true">{emojiFor(event.eventType)}</span> {event.title}</h1>
        <p className="muted">{formatDate(event.eventDate)}{event.location ? ' - ' + event.location : ''}</p>
        {event.description && <p>{event.description}</p>}
        <div className="stats">
          <div className="stat-ring" style={{ '--p': Math.min(100, event.guestCount > 0 ? Math.round((attending / event.guestCount) * 100) : 0) } as CSSProperties}>
            <i aria-hidden="true" /><b>{attending}</b><span>confirmed{event.guestCount > 0 ? ' of ' + event.guestCount + ' expected' : ''}</span>
          </div>
          <div className="stat-ring" style={{ '--p': guests.length ? Math.round((guests.filter(g => g.rsvp !== 'pending').length / guests.length) * 100) : 0 } as CSSProperties}>
            <i aria-hidden="true" /><b>{guests.length}</b><span>on the list, {guests.filter(g => g.rsvp !== 'pending').length} replied</span>
          </div>
          <div className="stat-ring" style={{ '--p': event.budgetTotal > 0 ? Math.min(100, Math.round((spent / event.budgetTotal) * 100)) : 0 } as CSSProperties}>
            <i aria-hidden="true" /><b>Rs {money(spent)}</b><span>of Rs {money(event.budgetTotal)} spent</span>
          </div>
        </div>
        <button className="btn ghost small danger" onClick={remove}>Delete event</button>
      </section>

      <div className="tabs" role="tablist">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'plan' && <PlanView event={event} onEvent={setEvent} hasBudget={budget.length > 0} onBudget={items => setBudget(b => b.concat(items))} />}
      {tab === 'venues' && <Venues event={event} />}
      {tab === 'studio' && <Studio event={event} onEvent={setEvent} />}
      {tab === 'design' && <CardDesigner key={event.aiCreative ? 'c' : 'n'} event={event} />}
      {tab === 'guests' && <Guests eventId={id} guests={guests} onChange={setGuests} />}
      {tab === 'budget' && <Budget eventId={id} total={event.budgetTotal} items={budget} onChange={setBudget} />}
      {tab === 'invite' && <Invitation eventId={id} />}
    </main>
  );
}
