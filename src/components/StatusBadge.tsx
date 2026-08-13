import { statusLabel } from '@/lib/format';

export function StatusBadge({ status }: { status: string }) {
  let cls = 'badge-neutral';
  if (['PUBLISHED', 'PAID'].includes(status)) cls = 'badge-success';
  if (['DRAFT', 'PENDING'].includes(status)) cls = 'badge-warning';
  if (['CANCELLED', 'FAILED', 'EXPIRED'].includes(status)) cls = 'badge-danger';
  if (status === 'COMPLETED') cls = 'badge-primary';
  return <span className={`badge ${cls}`}>{statusLabel(status)}</span>;
}