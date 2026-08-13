export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '0đ';
  return `${num.toLocaleString('vi-VN')}đ`;
}

export function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Bản nháp',
    PUBLISHED: 'Đang bán',
    CANCELLED: 'Đã hủy',
    COMPLETED: 'Đã kết thúc',
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    FAILED: 'Thất bại',
    EXPIRED: 'Hết hạn',
  };
  return map[status] ?? status;
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'Quản trị viên',
    ORGANIZER: 'Nhà tổ chức',
    STAFF: 'Nhân viên',
    CUSTOMER: 'Khách hàng',
  };
  return map[role] ?? role;
}

export function timeLeft(iso: string, nowMs = Date.now()): string {
  const diff = new Date(iso).getTime() - nowMs;
  if (diff <= 0) return 'Đã hết hạn';
  const totalSec = Math.floor(diff / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}