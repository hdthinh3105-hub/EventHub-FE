import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { eventApi } from '@/api/events';
import { holdApi, orderApi } from '@/api/tickets';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Spinner, EmptyState } from '@/components/Feedback';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDateTime, timeLeft } from '@/lib/format';
import type { EventDetail as EventDetailType, TicketType } from '@/types';

interface PendingHold {
  holdId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  expiresAt: string;
  price: string;
}

const TICKET_QUANTITIES = [1, 2, 3, 4, 5];

export function EventDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();

  const [event, setEvent] = useState<EventDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [holding, setHolding] = useState(false);
  const [pendingHold, setPendingHold] = useState<PendingHold | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const ev = await eventApi.getById(id);
      setEvent(ev);
      const init: Record<string, number> = {};
      ev.ticketTypes.forEach((tt) => {
        init[tt.id] = 1;
      });
      setQuantities((prev) => ({ ...init, ...prev }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tìm thấy sự kiện');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableFor = (tt: TicketType) => Math.max(0, tt.totalQuantity - tt.soldQuantity);

  const handleBuy = async (tt: TicketType) => {
    if (!user) {
      notify('Vui lòng đăng nhập để mua vé', 'error');
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    if (user.role !== 'CUSTOMER') {
      notify('Chỉ tài khoản Khách hàng mới mua được vé', 'error');
      return;
    }
    const quantity = quantities[tt.id] ?? 1;
    setHolding(true);
    try {
      const hold = await holdApi.create(tt.id, quantity);
      setPendingHold({
        holdId: hold.id,
        ticketTypeId: tt.id,
        ticketTypeName: tt.name,
        quantity,
        expiresAt: hold.expiresAt,
        price: tt.price,
      });
      notify('Đã giữ chỗ thành công! Bạn có 10 phút để thanh toán');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Không thể giữ chỗ', 'error');
    } finally {
      setHolding(false);
    }
  };

  const handleCheckout = async () => {
    if (!pendingHold) return;
    setCheckoutLoading(true);
    try {
      const result = await orderApi.checkout(pendingHold.holdId);
      sessionStorage.setItem(
        'last_checkout',
        JSON.stringify({
          eventId: id,
          eventTitle: event?.title ?? '',
          ticketTypeName: pendingHold.ticketTypeName,
          quantity: pendingHold.quantity,
          totalAmount: pendingHold.price,
          tickets: result.tickets,
          orderId: result.order.id,
        }),
      );
      setPendingHold(null);
      navigate('/checkout/success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Thanh toán thất bại';
      notify(msg, 'error');
      if ((e as { status?: number }).status === 410) {
        setPendingHold(null);
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const cancelHold = () => setPendingHold(null);

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <Spinner text="Đang tải sự kiện..." />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="page">
        <div className="container">
          <EmptyState title="Không tìm thấy sự kiện" sub={error} />
        </div>
      </div>
    );
  }

  const soldOut = event.ticketTypes.every((tt) => availableFor(tt) <= 0);

  return (
    <div className="page">
      <div className="container">
        <Link to="/" style={{ fontSize: 14 }}>
          ← Quay lại danh sách
        </Link>

        <div
          className="card"
          style={{
            marginTop: 12,
            padding: 0,
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: 0,
          }}
        >
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                height: '100%',
                minHeight: 260,
                background: 'linear-gradient(135deg, #c7d2fe, #a5b4fc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                fontWeight: 800,
                color: '#fff',
              }}
            >
              {event.title.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span className="badge badge-primary">{event.category.name}</span>
              <StatusBadge status={event.status} />
            </div>
            <h1 style={{ margin: 0, fontSize: 26 }}>{event.title}</h1>
            <p style={{ color: 'var(--color-text-soft)' }}>
              🕒 {formatDateTime(event.startTime)} — {formatDateTime(event.endTime)}
            </p>
            <p style={{ marginTop: 4 }}>
              📍 {event.venue.name}, {event.venue.address}, {event.venue.city}
            </p>
            <p style={{ marginTop: 4 }}>
              👤 {event.organizer.fullName}
              {event.venue.capacity ? ` • Sức chứa: ${event.venue.capacity}` : ''}
            </p>
            {event.description && (
              <p style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{event.description}</p>
            )}
          </div>
        </div>

        <h2 className="section-title">Chọn loại vé</h2>

        {pendingHold && (
          <div className="card" style={{ padding: 16, marginBottom: 16, borderColor: 'var(--color-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <strong>Đã giữ chỗ:</strong> {pendingHold.quantity} vé
                <span className="badge badge-neutral" style={{ marginLeft: 8 }}>
                  {pendingHold.ticketTypeName}
                </span>
                <div style={{ fontSize: 13, color: 'var(--color-text-soft)', marginTop: 4 }}>
                  Thời gian giữ chỗ còn lại:{' '}
                  <span className="countdown">{timeLeft(pendingHold.expiresAt, now)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" onClick={cancelHold}>
                  Hủy
                </button>
                <button className="btn btn-success btn-lg" onClick={handleCheckout} disabled={checkoutLoading}>
                  {checkoutLoading ? 'Đang thanh toán...' : 'Thanh toán ngay'}
                </button>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              Tổng tiền: <strong>{formatCurrency(Number(pendingHold.price) * pendingHold.quantity)}</strong>
            </div>
          </div>
        )}

        {event.ticketTypes.length === 0 ? (
          <EmptyState title="Chưa có loại vé nào" sub="Quay lại sau khi nhà tổ chức thêm vé" />
        ) : soldOut ? (
          <EmptyState title="Sự kiện đã cháy vé" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {event.ticketTypes.map((tt) => {
              const available = availableFor(tt);
              const soldOutType = available <= 0;
              return (
                <div key={tt.id} className="ticket-box">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{tt.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>
                      Còn {available} / {tt.totalQuantity} vé
                    </div>
                  </div>
                  <div className="price">{formatCurrency(tt.price)}</div>
                  {!soldOutType && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        className="select"
                        style={{ width: 76 }}
                        value={quantities[tt.id] ?? 1}
                        disabled={soldOutType || holding}
                        onChange={(e) =>
                          setQuantities((prev) => ({ ...prev, [tt.id]: Number(e.target.value) }))
                        }
                      >
                        {TICKET_QUANTITIES.map((q) => (
                          <option key={q} value={q} disabled={q > available}>
                            {q}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-primary"
                        disabled={soldOutType || holding || !user || user.role !== 'CUSTOMER'}
                        onClick={() => handleBuy(tt)}
                        title={
                          !user
                            ? 'Đăng nhập để mua vé'
                            : user.role !== 'CUSTOMER'
                              ? 'Chỉ Khách hàng được mua'
                              : ''
                        }
                      >
                        {holding ? 'Đang xử lý...' : 'Mua ngay'}
                      </button>
                    </div>
                  )}
                  {soldOutType && <span className="badge badge-danger">Hết vé</span>}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>
          💡 Sau khi thanh toán, vé điện tử kèm mã QR sẽ được gửi qua email và hiển thị tại màn hình tiếp theo.
          Xuất trình mã QR tại cổng để check-in.
        </div>
      </div>
    </div>
  );
}