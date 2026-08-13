// Test luồng điều hướng của ProtectedPage - nhánh quyết định của toàn bộ
// phân quyền giao diện (chưa đăng nhập -> /login, sai role -> /, đúng role
// -> render children).
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedPage } from '@/components/ProtectedPage';
import type { User } from '@/types';

vi.mock('@/api/auth', () => ({
  authApi: { login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

function renderWithAuth(initialEntry: string, user: User | null, roles?: string[]) {
  localStorage.setItem('eh_user', user ? JSON.stringify(user) : '');
  localStorage.setItem('eh_access_token', user ? 'access' : '');
  localStorage.setItem('eh_refresh_token', user ? 'refresh' : '');

  const children = <div>Nội dung bảo vệ</div>;
  const element = roles ? (
    <ProtectedPage roles={roles}>{children}</ProtectedPage>
  ) : (
    <ProtectedPage>{children}</ProtectedPage>
  );

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/organizer" element={element} />
          <Route path="/login" element={<div>Trang đăng nhập</div>} />
          <Route path="/" element={<div>Trang chủ</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('ProtectedPage', () => {
  it('chưa đăng nhập -> chuyển hướng về /login', async () => {
    renderWithAuth('/organizer', null);

    expect(await screen.findByText('Trang đăng nhập')).toBeInTheDocument();
    expect(screen.queryByText('Nội dung bảo vệ')).not.toBeInTheDocument();
  });

  it('sai role -> chuyển hướng về trang chủ', async () => {
    const customer = { id: 'u1', email: 'a@b.c', role: 'CUSTOMER', fullName: 'A' } as User;
    renderWithAuth('/organizer', customer, ['ORGANIZER', 'ADMIN']);

    expect(await screen.findByText('Trang chủ')).toBeInTheDocument();
  });

  it('đúng role -> render nội dung bên trong', async () => {
    const admin = { id: 'u2', email: 'admin@b.c', role: 'ADMIN', fullName: 'Admin' } as User;
    renderWithAuth('/organizer', admin, ['ORGANIZER', 'ADMIN']);

    expect(await screen.findByText('Nội dung bảo vệ')).toBeInTheDocument();
  });
});
