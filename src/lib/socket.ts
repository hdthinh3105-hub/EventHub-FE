import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, getAccessToken } from '@/api/client';
import type { TicketSoldEvent, HoldReleasedEvent, CheckinProcessedEvent, NotificationItem } from '@/types';

interface UseEventSocketOptions {
  eventIds: string[];
  enabled?: boolean;
  onTicketSold?: (event: TicketSoldEvent) => void;
  onHoldReleased?: (event: HoldReleasedEvent) => void;
  onCheckin?: (event: CheckinProcessedEvent) => void;
  onNotification?: (notification: NotificationItem) => void;
}

export function useEventSocket({
  eventIds,
  enabled = true,
  onTicketSold,
  onHoldReleased,
  onCheckin,
  onNotification,
}: UseEventSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef({ onTicketSold, onHoldReleased, onCheckin, onNotification });
  callbacksRef.current = { onTicketSold, onHoldReleased, onCheckin, onNotification };

  useEffect(() => {
    if (!enabled || eventIds.length === 0) return;

    const token = getAccessToken();

    // Không bắt buộc có token: trang công khai (VD chi tiết sự kiện) vẫn
    // kết nối được ở chế độ anonymous để nhận số vé còn lại realtime.
    // Nếu có token thì gửi kèm để BE xác thực và tự join room cá nhân
    // (nhận thông báo riêng tư như 'notification').
    const socket = io(API_URL, {
      auth: token ? { token } : {},
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      eventIds.forEach((id) => socket.emit('join_event', id));
    });

    socket.on('ticket_sold', (data: TicketSoldEvent) => {
      callbacksRef.current.onTicketSold?.(data);
    });

    socket.on('hold_released', (data: HoldReleasedEvent) => {
      callbacksRef.current.onHoldReleased?.(data);
    });

    socket.on('checkin_processed', (data: CheckinProcessedEvent) => {
      callbacksRef.current.onCheckin?.(data);
    });

    socket.on('notification', (data: NotificationItem) => {
      callbacksRef.current.onNotification?.(data);
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, eventIds.join(',')]);

  return socketRef;
}
