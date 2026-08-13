// Test HomePage với API được mock - đảm bảo render danh sách sự kiện và
// lọc danh mục hoạt động, tương ứng với việc BE mock fetch ở ci.yml.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { eventApi, categoryApi } from '@/api/events';
import type { EventSummary, Category } from '@/types';

vi.mock('@/api/events', () => ({
  eventApi: { list: vi.fn() },
  categoryApi: { list: vi.fn() },
}));

const category: Category = { id: 'cat1', name: 'Âm nhạc' };

const event: EventSummary = {
  id: 'ev1',
  title: 'Concert Hà Nội 2026',
  startTime: '2026-12-31T20:00:00.000Z',
  category,
  venue: { id: 'v1', name: 'Nhà hát Lớn', city: 'Hà Nội' },
  organizer: { id: 'o1', fullName: 'BTC EventHub' },
  coverImage: null,
};

beforeEach(() => {
  vi.mocked(categoryApi.list).mockResolvedValue([category]);
});

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('hiển thị danh sách sự kiện trả về từ API', async () => {
    vi.mocked(eventApi.list).mockResolvedValue({
      data: [event],
      meta: { page: 1, limit: 9, total: 1, totalPages: 2 },
    });

    renderHome();

    expect(await screen.findByText('Concert Hà Nội 2026')).toBeInTheDocument();
    expect(screen.getAllByText('Âm nhạc').length).toBeGreaterThan(0);
    expect(screen.getByText(/1 sự kiện/)).toBeInTheDocument();
  });

  it('hiển thị danh mục trong dropdown lọc', async () => {
    vi.mocked(eventApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 9, total: 0, totalPages: 0 },
    });

    renderHome();

    await waitFor(() => expect(categoryApi.list).toHaveBeenCalled());
    expect(await screen.findByRole('option', { name: 'Âm nhạc' })).toBeInTheDocument();
    expect(await screen.findByText('Chưa có sự kiện nào')).toBeInTheDocument();
  });

  it('gọi API với tham số phân trang mặc định', async () => {
    vi.mocked(eventApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 9, total: 0, totalPages: 0 },
    });

    renderHome();

    await waitFor(() =>
      expect(eventApi.list).toHaveBeenCalledWith({ page: 1, limit: 9 }),
    );
  });

  it('hiển thị lỗi khi API thất bại', async () => {
    vi.mocked(eventApi.list).mockRejectedValue(new Error('Lỗi máy chủ'));

    renderHome();

    expect(await screen.findByText(/Lỗi máy chủ/)).toBeInTheDocument();
  });
});