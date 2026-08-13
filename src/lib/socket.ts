import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, getAccessToken } from '@/api/client';
import type { TicketSoldEvent } from '@/types';

interface UseEventSocketOptions {
  eventIds: string[];
  enabled?: boolean;
  onTicketSold?: (event: TicketSoldEvent) => void;
}

export function useEventSocket({ eventIds, enabled = true, onTicketSold }: UseEventSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onTicketSold);
  callbackRef.current = onTicketSold;

  useEffect(() => {
    if (!enabled || eventIds.length === 0) return;
    const token = getAccessToken();
    if (!token) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      eventIds.forEach((id) => socket.emit('join_event', id));
    });

    socket.on('ticket_sold', (data: TicketSoldEvent) => {
      callbackRef.current?.(data);
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, eventIds.join(',')]);

  return socketRef;
}