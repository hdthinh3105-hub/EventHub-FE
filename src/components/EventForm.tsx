import { useEffect, useState } from 'react';
import { categoryApi, venueApi } from '@/api/events';
import type { Category, Venue, EventDetail } from '@/types';
import { Alert } from '@/components/Alert';
import { toLocalInputValue } from '@/lib/format';

interface EventFormState {
  title: string;
  description: string;
  categoryId: string;
  venueId: string;
  startTime: string;
  endTime: string;
}

export function EventForm({
  initial,
  submitting,
  onSubmit,
}: {
  initial?: EventDetail;
  submitting: boolean;
  onSubmit: (data: {
    title: string;
    description?: string;
    categoryId: string;
    venueId: string;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState<EventFormState>(() => ({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    categoryId: initial?.categoryId ?? '',
    venueId: initial?.venueId ?? '',
    startTime: initial ? toLocalInputValue(initial.startTime) : '',
    endTime: initial ? toLocalInputValue(initial.endTime) : '',
  }));
  const [categories, setCategories] = useState<Category[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    categoryApi
      .list()
      .then(setCategories)
      .catch(() => setCategories([]));
    venueApi
      .list()
      .then(setVenues)
      .catch(() => setVenues([]));
  }, []);

  const onField = (key: keyof EventFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.title.trim().length < 5) {
      setError('Tiêu đề tối thiểu 5 ký tự');
      return;
    }
    if (!form.categoryId || !form.venueId) {
      setError('Vui lòng chọn danh mục và địa điểm');
      return;
    }
    if (!form.startTime || !form.endTime) {
      setError('Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }
    await onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId,
      venueId: form.venueId,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
    });
  };

  return (
    <form className="card" style={{ padding: 24 }} onSubmit={handleSubmit}>
      <Alert kind="error">{error}</Alert>
      <div className="form-field">
        <label>Tiêu đề *</label>
        <input
          className="input"
          minLength={5}
          maxLength={200}
          required
          value={form.title}
          onChange={(e) => onField('title', e.target.value)}
          placeholder="VD: Đêm nhạc Acoustic Sài Gòn"
        />
      </div>
      <div className="form-field">
        <label>Mô tả</label>
        <textarea
          className="textarea"
          value={form.description}
          onChange={(e) => onField('description', e.target.value)}
          placeholder="Giới thiệu về sự kiện..."
        />
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-field">
          <label>Danh mục *</label>
          <select
            className="select"
            required
            value={form.categoryId}
            onChange={(e) => onField('categoryId', e.target.value)}
          >
            <option value="">-- Chọn danh mục --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Địa điểm *</label>
          <select
            className="select"
            required
            value={form.venueId}
            onChange={(e) => onField('venueId', e.target.value)}
          >
            <option value="">-- Chọn địa điểm --</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.city})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-field">
          <label>Bắt đầu *</label>
          <input
            className="input"
            type="datetime-local"
            required
            value={form.startTime}
            onChange={(e) => onField('startTime', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Kết thúc *</label>
          <input
            className="input"
            type="datetime-local"
            required
            value={form.endTime}
            onChange={(e) => onField('endTime', e.target.value)}
          />
        </div>
      </div>
      <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
        {submitting ? 'Đang lưu...' : 'Lưu sự kiện'}
      </button>
    </form>
  );
}