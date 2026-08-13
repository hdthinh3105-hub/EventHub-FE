// Test phần quan trọng nhất của API client FE: cơ chế refresh token
// single-flight + retry sau 401. Logic này tương đương bộ test middleware
// của BE (401 -> refresh -> retry), vì đây là chỗ dễ hỏng nhất của app.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, setSession, clearSession, handleExpiredSession } from '@/api/client';

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(status: number, body: unknown): Response {
  const headers = new Headers({ 'content-type': 'application/json' });
  return new Response(JSON.stringify(body), { status, headers });
}

function mockFetchSequence(...responses: Response[]): FetchMock {
  const fn = vi.fn();
  responses.forEach((r) => fn.mockResolvedValueOnce(r));
  fn.mockResolvedValue(jsonResponse(500, { message: 'unexpected' }));
  globalThis.fetch = fn;
  return fn;
}

describe('api client - auth header', () => {
  beforeEach(() => {
    clearSession();
  });

  it('gắn Authorization Bearer khi có access token', async () => {
    setSession('access-123', 'refresh-123', { id: 'u1', email: 'a@b.c', role: 'CUSTOMER' });
    const fetchMock = mockFetchSequence(jsonResponse(200, { success: true, data: [] }));

    await api.get('/api/events');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/events');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-123');
  });

  it('không gắn Authorization khi chưa đăng nhập', async () => {
    const fetchMock = mockFetchSequence(jsonResponse(200, { success: true, data: [] }));

    await api.get('/api/categories');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

describe('api client - refresh token', () => {
  it('401 -> refresh thành công -> retry lại request và trả dữ liệu', async () => {
    setSession('old-access', 'old-refresh', { id: 'u1', email: 'a@b.c', role: 'CUSTOMER' });
    const fetchMock = mockFetchSequence(
      jsonResponse(401, { success: false, message: 'Token hết hạn' }),
      jsonResponse(200, {
        success: true,
        data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
      }),
      jsonResponse(200, { success: true, data: [{ id: 'ev1', title: 'Concert' }] }),
    );

    const res = await api.get<{ data: { id: string }[] }>('/api/events');

    expect(res.data[0].id).toBe('ev1');
    // 3 lần fetch: request gốc, refresh, retry
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const refreshCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(refreshCall[0]).toContain('/api/auth/refresh');
    // Retry phải dùng access token MỚI
    const retryCall = fetchMock.mock.calls[2] as [string, RequestInit];
    expect((retryCall[1].headers as Record<string, string>).Authorization).toBe('Bearer new-access');
    // Token mới được lưu lại
    expect(localStorage.getItem('eh_access_token')).toBe('new-access');
    expect(localStorage.getItem('eh_refresh_token')).toBe('new-refresh');
  });

  it('401 -> refresh thất bại -> xoá session + bắn event eh:logout + ném ApiError 401', async () => {
    setSession('old-access', 'old-refresh', { id: 'u1', email: 'a@b.c', role: 'CUSTOMER' });
    mockFetchSequence(
      jsonResponse(401, { success: false, message: 'Token hết hạn' }),
      jsonResponse(401, { success: false, message: 'Refresh không hợp lệ' }),
    );

    const logoutSpy = vi.spyOn(window, 'dispatchEvent');
    const onLogout = vi.fn();
    window.addEventListener('eh:logout', onLogout);

    await expect(api.get('/api/events')).rejects.toMatchObject({ status: 401 });

    expect(onLogout).toHaveBeenCalled();
    expect(localStorage.getItem('eh_access_token')).toBeNull();
    expect(localStorage.getItem('eh_user')).toBeNull();
    logoutSpy.mockRestore();
  });

  it('hai request song song cùng 401 chỉ gọi refresh MỘT lần (single-flight)', async () => {
    setSession('old-access', 'old-refresh', { id: 'u1', email: 'a@b.c', role: 'CUSTOMER' });
    const fetchMock = mockFetchSequence(
      jsonResponse(401, {}),
      jsonResponse(401, {}),
      jsonResponse(200, {
        success: true,
        data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
      }),
      jsonResponse(200, { success: true, data: { ok: 1 } }),
      jsonResponse(200, { success: true, data: { ok: 2 } }),
    );

    const [a, b] = await Promise.all([api.get('/api/events'), api.get('/api/orders')]);

    expect(a).toMatchObject({ success: true, data: { ok: 1 } });
    expect(b).toMatchObject({ success: true, data: { ok: 2 } });
    // 2 request gốc + 1 refresh (dùng chung) + 2 retry = 5 lần fetch
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });
});

describe('api client - lỗi mạng', () => {
  it('không kết nối được server -> ném ApiError(0) với message tiếng Việt', async () => {
    clearSession();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(api.get('/api/events')).rejects.toMatchObject({
      status: 0,
      message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra lại kết nối mạng.',
    });
    vi.unstubAllGlobals();
  });
});

describe('handleExpiredSession', () => {
  it('xoá toàn bộ session và bắn event eh:logout', () => {
    setSession('a', 'r', { id: 'u1', email: 'a@b.c', role: 'CUSTOMER' });
    const onLogout = vi.fn();
    window.addEventListener('eh:logout', onLogout);

    handleExpiredSession();

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('eh_access_token')).toBeNull();
    expect(localStorage.getItem('eh_refresh_token')).toBeNull();
  });
});
