import type { ReactNode } from 'react';

type AlertKind = 'error' | 'success' | 'info' | 'warning';

const colors: Record<AlertKind, string> = {
  error: 'alert-error',
  success: 'alert-success',
  info: 'alert-info',
  warning: 'alert-warning',
};

const icons: Record<AlertKind, string> = {
  error: '✕',
  success: '✓',
  info: 'ℹ',
  warning: '⚠',
};

export function Alert({
  kind = 'info',
  children,
}: {
  kind?: AlertKind;
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <div className={`alert ${colors[kind]}`}>
      <span>{icons[kind]}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}