import { useState } from 'react';
import { api, type Venue } from './api';
import type { EventItem } from './types';
import { errorText } from './ui';
import './venues.css';

interface Saved { area: string; venues: Venue[] }

function load(id: string): Saved | null {
  try {
    const raw = sessionStorage.getItem('venues:' + id);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(id: string, v: Saved) {
  try {
    sessionStorage.setItem('venues:' + id, JSON.stringify(v));
  } catch {
    /* storage can be blocked; the list still shows */
  }
}

function Stars({ rating }: { rating: number }) {
  if (!rating) return null;
  const full = Math.round(rating);
  return <span className="stars" aria-label={'About ' + rating.toFixed(1) + ' out of 5'}>{'★'.repeat(full)}{'☆'.repeat(5 - full)} <b>{rating.toFixed(1)}</b></span>;
}

export default function Venues({ event }: { event: EventItem }) {
  const [saved, setSaved] = useState<Saved | null>(() => load(event.id));
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function find() {
    setBusy(true);
    setError('');
    try {
      const r = await api.findVenues(event.id, area.trim() || undefined);
      setSaved(r);
      save(event.id, r);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="card plan-actions venue-bar">
        <div>
          <h2>Venue ideas</h2>
          <p className="muted">Well-reviewed places near {saved?.area || event.location || 'your event'}, sized for {event.guestCount > 0 ? event.guestCount + ' guests' : 'your guest list'}.</p>
        </div>
        <div className="venue-form">
          <input aria-label="Area or city" placeholder={event.location ? 'Near ' + event.location : 'Type a city or area'} value={area} onChange={e => setArea(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !busy) void find(); }} />
          <button className="btn primary" onClick={find} disabled={busy}>{busy ? 'Scouting...' : saved ? 'Find again' : 'Find venues'}</button>
        </div>
      </div>
      {busy && <p className="muted pulse" role="status">The AI is scouting venues...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && (
        <>
          <p className="muted venue-note">Ideas from the AI's general knowledge. Ratings are estimates, so check current reviews, availability and prices on Google Maps before you book.</p>
          <div className="venue-grid">
            {saved.venues.map(v => (
              <article key={v.name + v.area} className="card venue-card">
                <div className="chip-row">
                  {v.venueType && <span className="chip">{v.venueType}</span>}
                  {v.fits === true && <span className="chip accent">Fits {event.guestCount} guests</span>}
                  {v.fits === false && <span className="chip warn">May not fit {event.guestCount} guests</span>}
                </div>
                <h3>{v.name}</h3>
                <p className="muted">{v.area}</p>
                <p><Stars rating={v.rating} /></p>
                {v.capacityMax > 0 && <p className="venue-cap"><b>Capacity</b> {v.capacityMin > 0 ? v.capacityMin + ' to ' : 'up to '}{v.capacityMax} guests</p>}
                {v.priceNote && <p className="venue-cap"><b>Cost</b> {v.priceNote}</p>}
                {v.whyItFits && <p>{v.whyItFits}</p>}
                {v.amenities.length > 0 && <ul className="amenities">{v.amenities.map(a => <li key={a}>{a}</li>)}</ul>}
                <a className="btn ghost small" href={v.mapsUrl} target="_blank" rel="noopener noreferrer">View on Google Maps</a>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
