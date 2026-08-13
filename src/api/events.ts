import { api } from './client';
import type { ApiEnvelope, Paginated, EventSummary, EventDetail, Category, Venue, EventStatus, TicketType } from '@/types';

export interface EventQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  status?: EventStatus;
  search?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  categoryId: string;
  venueId: string;
  startTime: string;
  endTime: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  categoryId?: string;
  venueId?: string;
  startTime?: string;
  endTime?: string;
  status?: EventStatus;
}

export const eventApi = {
  list: async (query: EventQuery = {}): Promise<Paginated<EventSummary>> => {
    const params = new URLSearchParams();
    params.set('page', String(query.page ?? 1));
    params.set('limit', String(query.limit ?? 9));
    if (query.categoryId) params.set('categoryId', query.categoryId);
    if (query.status) params.set('status', query.status);
    if (query.search) params.set('search', query.search);
    const res = await api.get<Paginated<EventSummary>>(`/api/events?${params.toString()}`);
    return res;
  },

  getById: async (id: string): Promise<EventDetail> => {
    const res = await api.get<ApiEnvelope<EventDetail>>(`/api/events/${id}`);
    if (!res.data) throw new Error('Không tìm thấy sự kiện');
    return res.data;
  },

  create: async (input: CreateEventInput): Promise<EventDetail> => {
    const res = await api.post<ApiEnvelope<EventDetail>>('/api/events', input);
    return res.data!;
  },

  update: async (id: string, input: UpdateEventInput): Promise<EventDetail> => {
    const res = await api.patch<ApiEnvelope<EventDetail>>(`/api/events/${id}`, input);
    return res.data!;
  },

  remove: (id: string) => api.delete<ApiEnvelope<null>>(`/api/events/${id}`),

  uploadCover: async (id: string, file: File): Promise<EventDetail> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.upload<ApiEnvelope<EventDetail>>(`/api/events/${id}/image`, formData);
    return res.data!;
  },
};

export const categoryApi = {
  list: async (): Promise<Category[]> => {
    const res = await api.get<ApiEnvelope<Category[]>>('/api/categories');
    return res.data ?? [];
  },
  create: (name: string) => api.post<ApiEnvelope<Category>>('/api/categories', { name }),
  update: (id: string, name: string) => api.patch<ApiEnvelope<Category>>(`/api/categories/${id}`, { name }),
  remove: (id: string) => api.delete<ApiEnvelope<null>>(`/api/categories/${id}`),
};

export const venueApi = {
  list: async (): Promise<Venue[]> => {
    const res = await api.get<ApiEnvelope<Venue[]>>('/api/venues');
    return res.data ?? [];
  },
  create: (input: Partial<Venue>) => api.post<ApiEnvelope<Venue>>('/api/venues', input),
  update: (id: string, input: Partial<Venue>) => api.patch<ApiEnvelope<Venue>>(`/api/venues/${id}`, input),
  remove: (id: string) => api.delete<ApiEnvelope<null>>(`/api/venues/${id}`),
};

export const ticketTypeApi = {
  listByEvent: async (eventId: string): Promise<TicketType[]> => {
    const res = await api.get<ApiEnvelope<TicketType[]>>(`/api/ticket-types/event/${eventId}`);
    return res.data ?? [];
  },
  create: async (eventId: string, input: { name: string; price: number; totalQuantity: number }): Promise<TicketType> => {
    const res = await api.post<ApiEnvelope<TicketType>>(`/api/ticket-types/event/${eventId}`, input);
    return res.data!;
  },
  update: async (id: string, input: { name?: string; price?: number; totalQuantity?: number }): Promise<TicketType> => {
    const res = await api.patch<ApiEnvelope<TicketType>>(`/api/ticket-types/${id}`, input);
    return res.data!;
  },
  remove: (id: string) => api.delete<ApiEnvelope<null>>(`/api/ticket-types/${id}`),
};

export const eventStaffApi = {
  list: async (eventId: string): Promise<import('@/types').EventStaff[]> => {
    const res = await api.get<ApiEnvelope<import('@/types').EventStaff[]>>(`/api/event-staff/event/${eventId}`);
    return res.data ?? [];
  },
  assign: (eventId: string, userId: string) =>
    api.post<ApiEnvelope<import('@/types').EventStaff>>(`/api/event-staff/event/${eventId}`, { userId }),
  remove: (eventId: string, userId: string) =>
    api.delete<ApiEnvelope<null>>(`/api/event-staff/event/${eventId}/user/${userId}`),
};