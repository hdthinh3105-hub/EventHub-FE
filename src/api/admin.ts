import { api } from './client';
import type { ApiEnvelope, AdminUser, RoleName } from '@/types';

export const adminApi = {
  listUsers: async (): Promise<AdminUser[]> => {
    const res = await api.get<ApiEnvelope<AdminUser[]>>('/api/users');
    return res.data ?? [];
  },
  assignRole: (userId: string, roleName: RoleName) =>
    api.patch<ApiEnvelope<AdminUser>>(`/api/users/${userId}/role`, { roleName }),
};