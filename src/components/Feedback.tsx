import type { ReactNode } from 'react';

export function Spinner({ text }: { text?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div className="spinner" />
      {text && <p style={{ color: 'var(--color-text-soft)', marginTop: 12 }}>{text}</p>}
    </div>
  );
}

export function EmptyState({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="empty">
      <div style={{ fontSize: 40, marginBottom: 8 }}>🗂️</div>
      <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-text)' }}>{title}</div>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  );
}