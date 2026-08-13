import { api, setSession, clearSession } from './client';
import type { ApiEnvelope, AuthPayload, User, NotificationItem } from '@/types';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export const authApi = {
  register: async (input: RegisterInput): Promise<AuthPayload> => {
    const res = await api.post<ApiEnvelope<AuthPayload>>('/api/auth/register', input);
    const payload = res.data!;
    setSession(payload.accessToken, payload.refreshToken, payload.user);
    return payload;
  },

  login: async (email: string, password: string): Promise<AuthPayload> => {
    const res = await api.post<ApiEnvelope<AuthPayload>>('/api/auth/login', { email, password });
    const payload = res.data!;
    setSession(payload.accessToken, payload.refreshToken, payload.user);
    return payload;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('eh_refresh_token');
    try {
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken });
      }
    } finally {
      clearSession();
    }
  },

  verifyEmail: (token: string) =>
    api.post<ApiEnvelope<null>>('/api/auth/verify-email', { token }),

  forgotPassword: (email: string) =>
    api.post<ApiEnvelope<null>>('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<ApiEnvelope<null>>('/api/auth/reset-password', { token, newPassword }),
};

export const notificationApi = {
  list: async (): Promise<NotificationItem[]> => {
    const res = await api.get<ApiEnvelope<NotificationItem[]>>('/api/notifications');
    return res.data ?? [];
  },
  markRead: (id: string) =>
    api.patch<ApiEnvelope<NotificationItem>>(`/api/notifications/${id}/read`),
};

export type { User as AuthUser };