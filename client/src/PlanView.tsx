import { useState } from 'react';
import { api } from './api';
import type { EventItem } from './types';
import { errorText, money, useToast } from './ui';
import type { BudgetItem } from './types';

interface Props {
  event: EventItem;
  onEvent: (e: EventItem) => void;
  hasBudget: boolean;
  onBudget: (items: BudgetItem[]) => void;
}

export default function PlanView({ event, onEvent, hasBudget, onBudget }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const plan = event.aiPlan;

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const next = await api.generatePlan(event.id);
      onEvent({ ...event, aiPlan: next });
      toast.show('Your plan is ready.');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function applyBudget() {
    try {
      const items = await api.applyPlanBudget(event.id);
      onBudget(items);
      toast.show('Added ' + items.length + ' budget lines. See the Budget tab.');
    } catch (e) {
      toast.show(errorText(e), 'error');
    }
  }

  return (
    <section>
      <div className="card plan-actions">
        <div>
          <h2>{plan ? 'Your AI event plan' : 'Let the AI plan this event'}</h2>
          <p className="muted">{plan ? 'Not quite right? Update the event details or add notes, then regenerate.' : 'GLM-5.3 will draft a theme, timeline, checklist, budget split and tips. This takes up to a minute.'}</p>
        </div>
        <button className="btn primary" onClick={generate} disabled={busy}>{busy ? 'Planning...' : plan ? 'Regenerate plan' : 'Generate plan'}</button>
      </div>
      {busy && <p className="muted pulse" role="status">The AI is thinking through your event...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {plan && (
        <div className="plan">
          <div className="card">
            <h3>Theme: {plan.theme}</h3>
            <p>{plan.summary}</p>
            {plan.surprise_idea && <p className="surprise"><b>Surprise idea:</b> {plan.surprise_idea}</p>}
          </div>

          <div className="card">
            <h3>Timeline</h3>
            <ol className="timeline">
              {plan.timeline.map((t, i) => <li key={i}><b>{t.time}</b><span>{t.activity}</span></li>)}
            </ol>
          </div>

          <div className="card">
            <h3>Checklist</h3>
            <ul className="checklist">
              {plan.checklist.map((c, i) => (
                <li key={i}>
                  <label><input type="checkbox" /> <span>{c.task}</span></label>
                  {c.when && <em>{c.when}</em>}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3>Suggested budget</h3>
            <table className="table">
              <tbody>
                {plan.budget_breakdown.map((b, i) => <tr key={i}><td>{b.category}</td><td className="num">Rs {money(b.amount)}</td></tr>)}
              </tbody>
            </table>
            {plan.budget_breakdown.length > 0 && (
              <button className="btn ghost" onClick={applyBudget} disabled={hasBudget} title={hasBudget ? 'You already have budget lines' : ''}>
                {hasBudget ? 'Budget lines already added' : 'Add these to my budget'}
              </button>
            )}
          </div>

          {plan.tips.length > 0 && (
            <div className="card">
              <h3>Tips</h3>
              <ul>{plan.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
