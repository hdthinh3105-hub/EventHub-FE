import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { clearSession } from '@/api/client';

// jsdom (Vitest) không có sẵn fetch/Response của Node - gán mock sẵn để
// mọi test đều chạy được, tránh mỗi file phải tự gán.
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn();
}

beforeEach(() => {
  localStorage.clear();
  clearSession();
});
