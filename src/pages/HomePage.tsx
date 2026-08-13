import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { eventApi, categoryApi } from '@/api/events';
import type { EventSummary, Category } from '@/types';
import { Spinner, EmptyState } from '@/components/Feedback';
import { formatDate, formatTime } from '@/lib/format';

function EventCard({ event }: { event: EventSummary }) {
  return (
    <div className="card event-card">
      <div
        className="thumb"
        style={event.coverImage ? { backgroundImage: `url(${event.coverImage})` } : undefined}
      >
        {event.coverImage ? '' : event.title.charAt(0).toUpperCase()}
      </div>
      <div className="body">
        <h3 className="title">
          <Link to={`/events/${event.id}`}>{event.title}</Link>
        </h3>
        <div className="meta">
          <span>🗓️ {formatDate(event.startTime)} • {formatTime(event.startTime)}</span>
          <span>📍 {event.venue.name}, {event.venue.city}</span>
        </div>
      </div>
      <div className="footer">
        <span className="badge badge-primary">{event.category.name}</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>
          {event.organizer.fullName}
        </span>
      </div>
    </div>
  );
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const search = searchParams.get('q') ?? '';
  const categoryId = searchParams.get('category') ?? '';
  const page = Number(searchParams.get('page') ?? 1);

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    categoryApi
      .list()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventApi.list({
        page,
        limit: 9,
        ...(categoryId ? { categoryId } : {}),
        ...(search ? { search } : {}),
      });
      setEvents(res.data);
      setMeta(res.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách sự kiện');
    } finally {
      setLoading(false);
    }
  }, [page, categoryId, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilter = (key: 'q' | 'category' | 'page', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilter('q', searchInput.trim());
  };

  return (
    <div>
      <section className="hero">
        <div className="container">
          <h1>Khám phá những sự kiện tuyệt vời</h1>
          <p>Đặt vé nhanh chóng, an toàn với EventHub</p>
        </div>
      </section>

      <div className="container">
        <form className="search-bar" onSubmit={onSubmitSearch}>
          <input
            className="input"
            placeholder="Tìm kiếm sự kiện..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="select"
            style={{ width: 200 }}
            value={categoryId}
            onChange={(e) => applyFilter('category', e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">
            Tìm kiếm
          </button>
        </form>

        {error && <div className="alert alert-error">✕ {error}</div>}

        {loading ? (
          <Spinner text="Đang tải sự kiện..." />
        ) : events.length === 0 ? (
          <EmptyState
            title="Chưa có sự kiện nào"
            sub="Hãy thử thay đổi bộ lọc hoặc quay lại sau"
          />
        ) : (
          <div className="grid grid-3">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}

        {meta.totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => applyFilter('page', String(page - 1))}
            >
              Trước
            </button>
            <span style={{ alignSelf: 'center', fontSize: 14, color: 'var(--color-text-soft)' }}>
              Trang {page} / {meta.totalPages} ({meta.total} sự kiện)
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={page >= meta.totalPages}
              onClick={() => applyFilter('page', String(page + 1))}
            >
              Sau
            </button>
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 13, color: 'var(--color-text-soft)' }}>
          Bạn là nhà tổ chức?{' '}
          <Link to="/register" onClick={() => navigate('/register')}>
            Đăng ký
          </Link>{' '}
          để tạo sự kiện đầu tiên
        </div>
      </div>
    </div>
  );
}