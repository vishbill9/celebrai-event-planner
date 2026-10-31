import { useState, type FormEvent } from 'react';
import { api } from './api';
import type { BudgetItem } from './types';
import { errorText, money, useToast } from './ui';

interface Props {
  eventId: string;
  total: number;
  items: BudgetItem[];
  onChange: (items: BudgetItem[]) => void;
}

export default function Budget({ eventId, total, items, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const estimated = items.reduce((n, i) => n + i.estimated, 0);
  const actual = items.reduce((n, i) => n + i.actual, 0);
  const pct = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0;

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    try {
      const item = await api.addBudget(eventId, {
        category: String(f.get('category') ?? ''),
        estimated: Number(f.get('estimated') || 0),
        actual: Number(f.get('actual') || 0),
      });
      onChange(items.concat(item));
      form.reset();
    } catch (err) {
      toast.show(errorText(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function patch(item: BudgetItem, change: Partial<BudgetItem>) {
    try {
      const next = await api.updateBudget(item.id, change);
      onChange(items.map(x => (x.id === item.id ? next : x)));
    } catch (err) {
      toast.show(errorText(err), 'error');
    }
  }

  async function remove(item: BudgetItem) {
    try {
      await api.deleteBudget(item.id);
      onChange(items.filter(x => x.id !== item.id));
    } catch (err) {
      toast.show(errorText(err), 'error');
    }
  }

  return (
    <section>
      <div className="card">
        <h2>Budget</h2>
        <div className="meter" role="img" aria-label={pct + ' percent of budget spent'}><div style={{ width: pct + '%' }} className={actual > total && total > 0 ? 'over' : ''} /></div>
        <p className="muted">Spent Rs {money(actual)} of Rs {money(total)} - planned Rs {money(estimated)}{total > 0 && actual > total ? ' - over budget!' : ''}</p>
        <form className="inline-form" onSubmit={add}>
          <label>Category<input name="category" required maxLength={80} placeholder="Catering" /></label>
          <label>Planned (Rs)<input name="estimated" type="number" min={0} /></label>
          <label>Spent (Rs)<input name="actual" type="number" min={0} /></label>
          <button className="btn primary" disabled={busy}>Add</button>
        </form>
      </div>
      {items.length === 0 ? <p className="empty">No budget lines yet. Add one, or use the AI plan's suggested budget.</p> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Category</th><th className="num">Planned</th><th className="num">Spent</th><th>Paid</th><th></th></tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td>{i.category}{i.description && <small>{i.description}</small>}</td>
                  <td className="num">
                    <input className="money-input" type="number" min={0} defaultValue={i.estimated} aria-label={'Planned for ' + i.category}
                      onBlur={e => Number(e.target.value) !== i.estimated && patch(i, { estimated: Number(e.target.value) })} />
                  </td>
                  <td className="num">
                    <input className="money-input" type="number" min={0} defaultValue={i.actual} aria-label={'Spent on ' + i.category}
                      onBlur={e => Number(e.target.value) !== i.actual && patch(i, { actual: Number(e.target.value) })} />
                  </td>
                  <td><input type="checkbox" checked={i.paid} onChange={e => patch(i, { paid: e.target.checked })} aria-label={'Paid: ' + i.category} /></td>
                  <td className="num"><button className="btn ghost small danger" onClick={() => remove(i)} aria-label={'Remove ' + i.category}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
