import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventApi } from '@/api/events';
import type { EventSummary, EventStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Spinner, EmptyState } from '@/components/Feedback';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatTime } from '@/lib/format';
import { useEventSocket } from '@/lib/socket';

const ALL_STATUSES: EventStatus[] = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'];
const PAGE_SIZE = 50;

export function OrganizerDashboard() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const results = await Promise.all(
        ALL_STATUSES.map((status) =>
          eventApi.list({ status, page: 1, limit: PAGE_SIZE }),
        ),
      );
      const mine = results
        .flatMap((r) => r.data)
        .filter((ev) => ev.organizer.id === user.id);
      setEvents(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEventSocket({
    enabled: !!user,
    eventIds: events.map((e) => e.id),
    onTicketSold: (data) => {
      // Chỉ hiện toast, KHÔNG tải lại danh sách — tránh phát sinh request
      // mỗi lần có vé bán (BE giới hạn 300-600 request/15 phút/IP).
      notify(`🎉 Có ${data.quantitySold} vé "${data.ticketTypeName}" vừa được bán!`);
    },
  });

  if (loading && events.length === 0) {
    return (
      <div className="page">
        <div className="container">
          <Spinner text="Đang tải sự kiện của bạn..." />
        </div>
      </div>
    );
  }

  const countBy = (s: EventStatus) => events.filter((e) => e.status === s).length;

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="page-heading" style={{ marginBottom: 0 }}>
            Sự kiện của tôi
          </h1>
          <Link className="btn btn-primary" to="/organizer/events/new">
            + Tạo sự kiện
          </Link>
        </div>

        <div className="grid grid-3" style={{ margin: '20px 0' }}>
          <div className="card stat" style={{ padding: 16 }}>
            <span className="value">{events.length}</span>
            <span className="label">Tổng sự kiện</span>
          </div>
          <div className="card stat" style={{ padding: 16 }}>
            <span className="value" style={{ color: 'var(--color-success)' }}>
              {countBy('PUBLISHED')}
            </span>
            <span className="label">Đang bán</span>
          </div>
          <div className="card stat" style={{ padding: 16 }}>
            <span className="value" style={{ color: 'var(--color-warning)' }}>
              {countBy('DRAFT')}
            </span>
            <span className="label">Bản nháp</span>
          </div>
        </div>

        {error && <div className="alert alert-error">✕ {error}</div>}

        {events.length === 0 ? (
          <EmptyState
            title="Bạn chưa có sự kiện nào"
            sub={
              <>
                Bấm <Link to="/organizer/events/new">Tạo sự kiện</Link> để bắt đầu
              </>
            }
          />
        ) : (
          <div className="grid grid-3">
            {events.map((ev) => (
              <div key={ev.id} className="card event-card">
                <div
                  className="thumb"
                  style={ev.coverImage ? { backgroundImage: `url(${ev.coverImage})` } : undefined}
                >
                  {ev.coverImage ? '' : ev.title.charAt(0).toUpperCase()}
                </div>
                <div className="body">
                  <h3 className="title">{ev.title}</h3>
                  <div className="meta">
                    <span>
                      🗓️ {formatDate(ev.startTime)} • {formatTime(ev.startTime)}
                    </span>
                    <span>📍 {ev.venue.name}, {ev.venue.city}</span>
                  </div>
                  <div>
                    <StatusBadge status={ev.status} />{' '}
                    <span className="badge badge-primary">{ev.category.name}</span>
                  </div>
                </div>
                <div className="footer">
                  <Link className="btn btn-outline btn-sm" to={`/organizer/events/${ev.id}`}>
                    Quản lý
                  </Link>
                  <Link
                    className="btn btn-outline btn-sm"
                    to={`/events/${ev.id}`}
                    style={{ color: 'var(--color-text-soft)' }}
                  >
                    Xem
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}