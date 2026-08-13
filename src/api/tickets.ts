import { api } from './client';
import type { ApiEnvelope, Hold, CheckoutResult } from '@/types';

export const holdApi = {
  create: async (ticketTypeId: string, quantity: number): Promise<Hold> => {
    const res = await api.post<ApiEnvelope<Hold>>('/api/ticket-holds', { ticketTypeId, quantity });
    return res.data!;
  },
};

export const orderApi = {
  checkout: async (holdId: string): Promise<CheckoutResult> => {
    const res = await api.post<ApiEnvelope<CheckoutResult>>('/api/orders/checkout', { holdId });
    return res.data!;
  },
  exportRevenue: async (eventId: string): Promise<{ blob: Blob; filename: string }> =>
    api.getBlob(`/api/orders/event/${eventId}/export`),
  importGuests: async (ticketTypeId: string, file: File): Promise<{ importedGuests: number; totalTickets: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.upload<ApiEnvelope<{ importedGuests: number; totalTickets: number }>>(
      `/api/orders/ticket-type/${ticketTypeId}/import`,
      formData,
    );
    return res.data!;
  },
};

export const checkinApi = {
  checkin: async (qrCode: string): Promise<import('@/types').CheckinResult> => {
    const res = await api.post<ApiEnvelope<import('@/types').CheckinResult>>('/api/checkins', { qrCode });
    return res.data!;
  },
};