export type RoleName = 'ADMIN' | 'ORGANIZER' | 'STAFF' | 'CUSTOMER';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  success: boolean;
  data: T[];
  meta: PaginatedMeta;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  role: { name: RoleName };
}

export interface AuthPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  capacity: number | null;
}

export interface EventSummary {
  id: string;
  organizerId: string;
  categoryId: string;
  venueId: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  startTime: string;
  endTime: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string };
  venue: { id: string; name: string; city: string };
  organizer: { id: string; fullName: string };
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  price: string;
  totalQuantity: number;
  soldQuantity: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventDetail extends EventSummary {
  category: Category;
  venue: Venue;
  organizer: { id: string; fullName: string; email: string };
  ticketTypes: TicketType[];
}

export interface Hold {
  id: string;
  ticketTypeId: string;
  userId: string;
  quantity: number;
  expiresAt: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  orderItemId: string;
  qrCode: string;
  isCheckedIn: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutResult {
  order: Order;
  tickets: Ticket[];
}

export interface EventStaff {
  id: string;
  eventId: string;
  userId: string;
  createdAt: string;
  user: { id: string; fullName: string; email: string };
}

export interface CheckinResult {
  ticketId: string;
  eventTitle: string;
  customerName: string;
  checkedInAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface TicketSoldEvent {
  ticketTypeId: string;
  ticketTypeName: string;
  quantitySold: number;
  newSoldQuantity: number;
  totalQuantity: number;
}

// BE đẩy qua socket khi 1 hold hết hạn -> số vé của ticketType được hoàn
// trả về quỹ vé (khách xem trang sẽ thấy "Còn lại" tăng lên realtime).
export interface HoldReleasedEvent {
  eventId: string;
  releases: { ticketTypeId: string; quantityReleased: number }[];
}

// BE đẩy qua socket khi 1 vé vừa được check-in tại cổng -> Organizer
// theo dõi thấy luồng khách vào sự kiện realtime.
export interface CheckinProcessedEvent {
  ticketId: string;
  eventId: string;
  customerName: string;
  customerEmail: string;
  checkedInAt: string;
}