const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000';

const ACCESS_KEY = 'eh_access_token';
const REFRESH_KEY = 'eh_refresh_token';
const USER_KEY = 'eh_user';

let accessToken: string | null = localStorage.getItem(ACCESS_KEY);
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY);

export function getStoredUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setSession(access: string, refresh: string, user?: unknown) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  if (user !== undefined) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearSession() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const token = refreshToken;
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as ApiEnvelopeLike;
    if (!json.data?.accessToken || !json.data?.refreshToken) return false;
    accessToken = json.data.accessToken;
    refreshToken = json.data.refreshToken;
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    return true;
  } catch {
    return false;
  }
}

interface ApiEnvelopeLike {
  success?: boolean;
  data?: { accessToken?: string; refreshToken?: string };
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  let body: BodyInit | null | undefined;

  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
    });
  } catch {
    throw new ApiError(0, 'Không thể kết nối tới máy chủ. Hãy kiểm tra lại kết nối mạng.');
  }

  if (res.status === 401 && accessToken && !retried && !path.startsWith('/api/auth/')) {
    const ok = await tryRefresh();
    if (ok) {
      return request<T>(path, options, true);
    }
    handleExpiredSession();
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
  }

  const contentType = res.headers.get('content-type') ?? '';
  let data: unknown;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : 'Đã có lỗi xảy ra, vui lòng thử lại';
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export function handleExpiredSession() {
  clearSession();
  window.dispatchEvent(new Event('eh:logout'));
}

export const api = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'GET', headers }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, headers }),
  patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PATCH', body, headers }),
  delete: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'DELETE', headers }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', formData }),
  uploadPatch: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'PATCH', formData }),
  getBlob: async (path: string): Promise<{ blob: Blob; filename: string }> => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${API_URL}${path}`, { method: 'GET', headers });
    if (!res.ok) {
      let message = 'Đã có lỗi xảy ra';
      try {
        const json = (await res.json()) as { message?: string };
        message = json.message ?? message;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, message);
    }
    const disposition = res.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match ? match[1] : `download-${Date.now()}.xlsx`;
    return { blob: await res.blob(), filename };
  },
};

export { API_URL };