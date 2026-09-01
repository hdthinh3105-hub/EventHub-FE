import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { orderApi } from '@/api/tickets';
import { Spinner, EmptyState } from '@/components/Feedback';
import { formatCurrency } from '@/lib/format';
import type { Ticket } from '@/types';

interface LastCheckout {
  eventId: string;
  eventTitle: string;
  ticketTypeName: string;
  quantity: number;
  totalAmount: string;
  orderId: string;
  tickets: Ticket[];
}

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<LastCheckout | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFromSession = useCallback((): LastCheckout | null => {
    const raw = sessionStorage.getItem('last_checkout');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LastCheckout;
    } catch {
      return null;
    }
  }, []);

  const loadFromServer = useCallback(async (orderId: string) => {
    try {
      const result = await orderApi.getById(orderId);
      return {
        eventId: result.eventId,
        eventTitle: result.eventTitle,
        ticketTypeName: result.ticketTypeName,
        quantity: result.quantity,
        totalAmount: result.order.totalAmount,
        orderId: result.order.id,
        tickets: result.tickets,
      } as LastCheckout;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const sessionData = loadFromSession();
    if (sessionData) {
      setData(sessionData);
      setLoading(false);
      return;
    }

    const orderId = searchParams.get('orderId');
    if (orderId) {
      loadFromServer(orderId).then((d) => {
        if (d) {
          setData(d);
          sessionStorage.setItem('last_checkout', JSON.stringify(d));
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [loadFromSession, loadFromServer, searchParams]);

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <Spinner text="Đang tải thông tin đơn hàng..." />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="container">
          <EmptyState title="Không có đơn hàng nào để hiển thị" sub="Vui lòng kiểm tra lại link hoặc quay về trang chủ" />
          <div style={{ textAlign: 'center' }}>
            <Link className="btn btn-primary" to="/">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="alert alert-success" style={{ fontSize: 16 }}>
          <span>✓</span>
          <div>
            <strong>Thanh toán thành công!</strong> Vé của bạn đã được phát hành.
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div>
              <div className="stat">
                <span className="label">Sự kiện</span>
                <span className="value" style={{ fontSize: 17 }}>
                  <Link to={`/events/${data.eventId}`}>{data.eventTitle}</Link>
                </span>
              </div>
            </div>
            <div>
              <div className="stat">
                <span className="label">Loại vé / số lượng</span>
                <span className="value" style={{ fontSize: 17 }}>
                  {data.ticketTypeName} × {data.quantity}
                </span>
              </div>
            </div>
            <div>
              <div className="stat">
                <span className="label">Tổng tiền</span>
                <span className="value" style={{ fontSize: 17 }}>
                  {formatCurrency(data.totalAmount)}
                </span>
              </div>
            </div>
            <div>
              <div className="stat">
                <span className="label">Mã đơn hàng</span>
                <span className="value" style={{ fontSize: 14 }}>{data.orderId}</span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="section-title">Vé điện tử của bạn ({data.tickets.length})</h2>
        <div className="grid grid-2">
          {data.tickets.map((t, i) => (
            <div key={t.id} className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-soft)', marginBottom: 10 }}>
                Vé #{i + 1}
              </div>
              <div style={{ margin: '0 auto', width: 'fit-content' }}>
                <QRCodeSVG value={t.qrCode} size={180} level="M" />
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  wordBreak: 'break-all',
                  background: 'var(--color-bg)',
                  padding: '8px 12px',
                  borderRadius: 8,
                }}
              >
                {t.qrCode}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link className="btn btn-outline" to="/">
            Tiếp tục khám phá sự kiện
          </Link>
        </div>
      </div>
    </div>
  );
}