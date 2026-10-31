// Shared bits: toast messages, money/date formatting and a tiny confetti burst.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export const money = (n: number): string => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

export function formatDate(d: string | null): string {
  if (!d) return 'Date to be decided';
  const parsed = new Date(d + 'T00:00:00');
  return parsed.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const target = new Date(d + 'T00:00:00').getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

export const errorText = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong.');

interface ToastApi {
  show: (message: string, kind?: 'ok' | 'error') => void;
}
const ToastContext = createContext<ToastApi>({ show: () => undefined });
export const useToast = (): ToastApi => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: string; id: number } | null>(null);
  const show = useCallback((message: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now();
    setToast({ message, kind, id });
    window.setTimeout(() => setToast(t => (t && t.id === id ? null : t)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toast && <div className={'toast ' + toast.kind}>{toast.message}</div>}
      </div>
    </ToastContext.Provider>
  );
}

const COLORS = ['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export function confetti(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('i');
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
    piece.style.setProperty('--drift', Math.round(Math.random() * 200 - 100) + 'px');
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 3500);
}
