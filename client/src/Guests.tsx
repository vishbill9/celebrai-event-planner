import { useState, type FormEvent } from 'react';
import { api } from './api';
import type { Guest, Rsvp } from './types';
import { errorText, useToast } from './ui';

interface Props {
  eventId: string;
  guests: Guest[];
  onChange: (g: Guest[]) => void;
}

const LABEL: Record<Rsvp, string> = { pending: 'Waiting', yes: 'Coming', maybe: 'Maybe', no: 'Not coming' };

export default function Guests({ eventId, guests, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const count = (r: Rsvp) => guests.filter(g => g.rsvp === r).length;

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    try {
      const guest = await api.addGuest(eventId, {
        name: String(f.get('name') ?? ''),
        email: String(f.get('email') ?? ''),
        plusOnes: Number(f.get('plusOnes') || 0),
      });
      onChange(guests.concat(guest));
      form.reset();
    } catch (err) {
      toast.show(errorText(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function setRsvp(g: Guest, rsvp: Rsvp) {
    try {
      const next = await api.updateGuest(g.id, { rsvp });
      onChange(guests.map(x => (x.id === g.id ? next : x)));
    } catch (err) {
      toast.show(errorText(err), 'error');
    }
  }

  async function remove(g: Guest) {
    try {
      await api.deleteGuest(g.id);
      onChange(guests.filter(x => x.id !== g.id));
    } catch (err) {
      toast.show(errorText(err), 'error');
    }
  }

  return (
    <section>
      <div className="card">
        <h2>Add a guest</h2>
        <form className="inline-form" onSubmit={add}>
          <label>Name<input name="name" required maxLength={120} /></label>
          <label>Email (optional)<input name="email" type="email" maxLength={200} /></label>
          <label>Plus ones<input name="plusOnes" type="number" min={0} max={20} defaultValue={0} /></label>
          <button className="btn primary" disabled={busy}>Add</button>
        </form>
      </div>
      <div className="chip-row summary-row">
        {(['yes', 'maybe', 'pending', 'no'] as Rsvp[]).map(r => <span key={r} className="chip">{LABEL[r]}: {count(r)}</span>)}
      </div>
      {guests.length > 0 && (
        <button className="btn ghost small" onClick={() => {
          const lines = guests.map(g => g.name + ' - ' + LABEL[g.rsvp] + (g.plusOnes ? ' (+' + g.plusOnes + ')' : ''));
          navigator.clipboard.writeText(lines.join('\n')).then(() => toast.show('Guest list copied.'), () => toast.show('Copy is not available here.', 'error'));
        }}>Copy guest list</button>
      )}
      {guests.length === 0 ? <p className="empty">No guests yet. Add the first one above.</p> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>RSVP</th><th>+1</th><th></th></tr></thead>
            <tbody>
              {guests.map(g => (
                <tr key={g.id}>
                  <td>{g.name}{g.email && <small>{g.email}</small>}</td>
                  <td>
                    <select aria-label={'RSVP for ' + g.name} value={g.rsvp} onChange={e => setRsvp(g, e.target.value as Rsvp)}>
                      {(Object.keys(LABEL) as Rsvp[]).map(r => <option key={r} value={r}>{LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td>{g.plusOnes}</td>
                  <td className="num"><button className="btn ghost small danger" onClick={() => remove(g)} aria-label={'Remove ' + g.name}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
