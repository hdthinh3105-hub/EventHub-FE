import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { eventApi, ticketTypeApi, eventStaffApi } from '@/api/events';
import { orderApi, checkinApi } from '@/api/tickets';
import { notificationApi } from '@/api/auth';
import { adminApi } from '@/api/admin';
import { EventForm } from '@/components/EventForm';
import { Modal } from '@/components/Modal';
import { Spinner, EmptyState } from '@/components/Feedback';
import { Alert } from '@/components/Alert';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useEventSocket } from '@/lib/socket';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { EventDetail, EventStatus, EventStaff, NotificationItem, TicketType, CheckinResult, CheckinProcessedEvent } from '@/types';

type Tab = 'info' | 'ticket-types' | 'staff' | 'checkin' | 'data';

const EVENT_STATUSES: EventStatus[] = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'];

export function EventManagePage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('info');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  // Luồng check-in realtime nhận qua socket (khách vừa vào cổng).
  const [liveCheckins, setLiveCheckins] = useState<CheckinProcessedEvent[]>([]);

  const load = useCallback(async () => {
    try {
      const ev = await eventApi.getById(id);
      setEvent(ev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được sự kiện');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadNotifications = useCallback(async () => {
    try {
      setNotifications(await notificationApi.list());
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEventSocket({
    enabled: !!user && !!event,
    eventIds: [id],
    onTicketSold: (data) => {
      notify(`🎉 ${data.quantitySold} vé "${data.ticketTypeName}" vừa được bán!`);
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              ticketTypes: prev.ticketTypes.map((tt) =>
                tt.id === data.ticketTypeId
                  ? { ...tt, soldQuantity: data.newSoldQuantity }
                  : tt,
              ),
            }
          : prev,
      );
    },
    // Khách vừa được quét vé vào cổng -> cập nhật luồng check-in realtime
    // ngay lập tức, không cần F5.
    onCheckin: (data) => {
      notify(`✅ ${data.customerName} vừa check-in vào sự kiện!`);
      setLiveCheckins((prev) => [data, ...prev].slice(0, 30));
    },
    // Thông báo (VD: "Có vé mới được bán") do BE đẩy realtime tới room
    // cá nhân -> thêm thẳng vào danh sách thay vì chờ refetch.
    onNotification: (notification) => {
      notify(`🔔 ${notification.title}`);
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
    },
  });

  const isOwner = user?.role === 'ADMIN' || event?.organizerId === user?.id;

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <Spinner text="Đang tải sự kiện..." />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page">
        <div className="container">
          <EmptyState title="Không tìm thấy sự kiện" sub={error} />
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="page">
        <div className="container">
          <EmptyState title="Bạn không có quyền quản lý sự kiện này" />
        </div>
      </div>
    );
  }

  const markAllRead = async () => {
    for (const n of notifications.filter((x) => !x.isRead)) {
      try {
        await notificationApi.markRead(n.id);
      } catch {
        /* ignore */
      }
    }
    await loadNotifications();
  };

  return (
    <div className="page">
      <div className="container">
        <Link to="/organizer" style={{ fontSize: 14 }}>
          ← Về danh sách sự kiện
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-heading" style={{ marginBottom: 6 }}>
              {event.title}
            </h1>
            <StatusBadge status={event.status} />{' '}
            <span style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>
              {formatDateTime(event.startTime)} — {formatDateTime(event.endTime)}
            </span>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
            Thông tin & Ảnh bìa
          </button>
          <button className={`tab ${tab === 'ticket-types' ? 'active' : ''}`} onClick={() => setTab('ticket-types')}>
            Loại vé ({event.ticketTypes.length})
          </button>
          <button className={`tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}>
            Nhân viên check-in
          </button>
          <button className={`tab ${tab === 'checkin' ? 'active' : ''}`} onClick={() => setTab('checkin')}>
            Check-in
          </button>
          <button className={`tab ${tab === 'data' ? 'active' : ''}`} onClick={() => setTab('data')}>
            Doanh thu & Vé mời
          </button>
        </div>

        {tab === 'info' && <InfoTab event={event} onReload={load} notify={notify} />}
        {tab === 'ticket-types' && <TicketTypesTab event={event} onReload={load} notify={notify} />}
        {tab === 'staff' && <StaffTab event={event} notify={notify} />}
        {tab === 'checkin' && <CheckinTab notify={notify} liveCheckins={liveCheckins} />}
        {tab === 'data' && <DataTab event={event} notify={notify} />}

        <h2 className="section-title">Thông báo gần đây</h2>
        <div className="card" style={{ padding: 16 }}>
          {notifications.length === 0 ? (
            <div style={{ color: 'var(--color-text-soft)', fontSize: 14 }}>
              Chưa có thông báo nào.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={markAllRead}>
                  Đánh dấu tất cả đã đọc
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: n.isRead ? 'transparent' : 'var(--color-primary-soft)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>{n.message}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-soft)', marginTop: 4 }}>
                      {formatDateTime(n.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tab: Thông tin ---------------- */

function InfoTab({
  event,
  onReload,
  notify,
}: {
  event: EventDetail;
  onReload: () => Promise<void>;
  notify: (m: string, k?: 'success' | 'error') => void;
}) {
  const [status, setStatus] = useState<EventStatus>(event.status);
  const [savingStatus, setSavingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();

  const saveStatus = async () => {
    setSavingStatus(true);
    try {
      await eventApi.update(event.id, { status });
      notify('Cập nhật trạng thái thành công');
      await onReload();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Cập nhật thất bại', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCover = async (file: File) => {
    setUploading(true);
    try {
      await eventApi.uploadCover(event.id, file);
      notify('Tải ảnh bìa thành công');
      await onReload();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Tải ảnh thất bại', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await eventApi.remove(event.id);
      notify('Xóa sự kiện thành công');
      navigate('/organizer');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Xóa thất bại', 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Trạng thái sự kiện</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 200 }} value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={saveStatus} disabled={savingStatus || status === event.status}>
            {savingStatus ? 'Đang lưu...' : 'Lưu trạng thái'}
          </button>
          <span className="badge badge-neutral">Công khai khi chuyển sang PUBLISHED</span>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Ảnh bìa</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {event.coverImage && (
            <img src={event.coverImage} alt="Ảnh bìa" style={{ width: 220, height: 120, objectFit: 'cover', borderRadius: 8 }} />
          )}
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
            {uploading ? 'Đang tải...' : 'Chọn ảnh bìa (jpg/png/webp, ≤5MB)'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCover(f);
              }}
            />
          </label>
        </div>
      </div>

      <EventForm initial={event} submitting={false} onSubmit={async (data) => {
        try {
          await eventApi.update(event.id, data);
          notify('Cập nhật thông tin thành công');
          await onReload();
        } catch (e) {
          notify(e instanceof Error ? e.message : 'Cập nhật thất bại', 'error');
        }
      }} />

      <div className="card" style={{ padding: 20, marginTop: 20, borderColor: '#fecaca' }}>
        <h3 style={{ marginTop: 0, color: 'var(--color-danger)' }}>Vùng nguy hiểm</h3>
        <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
          Xóa sự kiện
        </button>
        <div style={{ fontSize: 13, color: 'var(--color-text-soft)', marginTop: 8 }}>
          Sự kiện đã bán vé sẽ không thể xóa — hãy chuyển sang CANCELLED.
        </div>
      </div>

      {confirmDelete && (
        <Modal
          title="Xóa sự kiện?"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>
                Hủy
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </>
          }
        >
          Bạn có chắc muốn xóa sự kiện "{event.title}"? Hành động này không thể hoàn tác.
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Tab: Loại vé ---------------- */

function TicketTypesTab({
  event,
  onReload,
  notify,
}: {
  event: EventDetail;
  onReload: () => Promise<void>;
  notify: (m: string, k?: 'success' | 'error') => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('1');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TicketType | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await ticketTypeApi.create(event.id, {
        name,
        price: Number(price),
        totalQuantity: Number(totalQuantity),
      });
      notify('Thêm loại vé thành công');
      setName('');
      setPrice('');
      setTotalQuantity('1');
      await onReload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Thất bại', 'error');
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async (data: { name: string; price: string; totalQuantity: string }) => {
    try {
      await ticketTypeApi.update(editing!.id, {
        name: data.name,
        price: Number(data.price),
        totalQuantity: Number(data.totalQuantity),
      });
      notify('Cập nhật loại vé thành công');
      setEditing(null);
      await onReload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Cập nhật thất bại', 'error');
    }
  };

  const remove = async (tt: TicketType) => {
    if (!window.confirm(`Xóa loại vé "${tt.name}"?`)) return;
    try {
      await ticketTypeApi.remove(tt.id);
      notify('Xóa loại vé thành công');
      await onReload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Xóa thất bại', 'error');
    }
  };

  const locked = event.status === 'CANCELLED' || event.status === 'COMPLETED';

  return (
    <div>
      {locked && (
        <Alert kind="warning">Sự kiện đã hủy/kết thúc — không thể thay đổi loại vé.</Alert>
      )}

      <form className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }} onSubmit={create}>
        <div className="form-field" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
          <label>Tên vé</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Vé VIP" />
        </div>
        <div className="form-field" style={{ width: 130, marginBottom: 0 }}>
          <label>Giá (₫)</label>
          <input className="input" type="number" min={0} required value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="form-field" style={{ width: 130, marginBottom: 0 }}>
          <label>Tổng số vé</label>
          <input className="input" type="number" min={1} required value={totalQuantity} onChange={(e) => setTotalQuantity(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={creating || locked}>
          {creating ? 'Đang thêm...' : '+ Thêm vé'}
        </button>
      </form>

      {event.ticketTypes.length === 0 ? (
        <EmptyState title="Chưa có loại vé nào" sub="Thêm loại vé đầu tiên để mở bán" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Loại vé</th>
                <th>Giá</th>
                <th>Đã bán</th>
                <th>Còn lại</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {event.ticketTypes.map((tt) => {
                const available = Math.max(0, tt.totalQuantity - tt.soldQuantity);
                const soldOut = available <= 0;
                return (
                  <tr key={tt.id}>
                    <td style={{ fontWeight: 600 }}>{tt.name}</td>
                    <td>{formatCurrency(tt.price)}</td>
                    <td>{tt.soldQuantity}</td>
                    <td>
                      <span className={`badge ${soldOut ? 'badge-danger' : 'badge-success'}`}>{available}</span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-outline btn-sm" disabled={locked} onClick={() => setEditing(tt)}>
                        Sửa
                      </button>{' '}
                      <button className="btn btn-danger btn-sm" disabled={locked} onClick={() => remove(tt)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={`Sửa loại vé: ${editing.name}`} onClose={() => setEditing(null)}>
          <EditTicketTypeForm tt={editing} onSave={saveEdit} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

function EditTicketTypeForm({
  tt,
  onSave,
  onCancel,
}: {
  tt: TicketType;
  onSave: (data: { name: string; price: string; totalQuantity: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(tt.name);
  const [price, setPrice] = useState(tt.price);
  const [totalQuantity, setTotalQuantity] = useState(String(tt.totalQuantity));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name, price, totalQuantity });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-field">
        <label>Tên vé</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-field">
        <label>Giá (₫)</label>
        <input className="input" type="number" min={0} required value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="form-field">
        <label>Tổng số vé (không được thấp hơn số đã bán: {tt.soldQuantity})</label>
        <input className="input" type="number" min={tt.soldQuantity} required value={totalQuantity} onChange={(e) => setTotalQuantity(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" type="button" onClick={onCancel}>
          Hủy
        </button>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </form>
  );
}

/* ---------------- Tab: Nhân viên check-in ---------------- */

function StaffTab({ event, notify }: { event: EventDetail; notify: (m: string, k?: 'success' | 'error') => void }) {
  const { user } = useAuth();
  const [staff, setStaff] = useState<EventStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateId, setCandidateId] = useState('');
  const [manualId, setManualId] = useState('');
  const [staffUsers, setStaffUsers] = useState<{ id: string; email: string; fullName: string }[]>([]);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStaff(await eventStaffApi.list(event.id));
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      adminApi
        .listUsers()
        .then((users) => {
          setStaffUsers(users.filter((u) => u.role.name === 'STAFF').map((u) => ({ id: u.id, email: u.email, fullName: u.fullName })));
        })
        .catch(() => setStaffUsers([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assign = async () => {
    const targetId = candidateId || manualId.trim();
    if (!targetId) {
      notify('Vui lòng chọn nhân viên', 'error');
      return;
    }
    setAssigning(true);
    try {
      await eventStaffApi.assign(event.id, targetId);
      notify('Gán nhân viên thành công');
      setCandidateId('');
      setManualId('');
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Gán thất bại', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const remove = async (userId: string) => {
    try {
      await eventStaffApi.remove(event.id, userId);
      notify('Đã bỏ gán nhân viên');
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Thao tác thất bại', 'error');
    }
  };

  if (loading) {
    return <Spinner text="Đang tải nhân viên..." />;
  }

  const canAssignMore = staff.length < 6;

  return (
    <div>
      <Alert kind="info">
        Chỉ nhân viên có role <b>STAFF</b> mới được gán check-in. Quyền: Admin được quét mọi vé, Organizer chỉ quét vé sự kiện mình sở hữu.
      </Alert>

      {canAssignMore && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Gán nhân viên mới</h3>
          {user?.role === 'ADMIN' ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select className="select" style={{ maxWidth: 320 }} value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
                <option value="">-- Chọn nhân viên (role STAFF) --</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id} disabled={staff.some((s) => s.userId === u.id)}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={assign} disabled={assigning || !candidateId}>
                {assigning ? 'Đang gán...' : 'Gán'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  className="input"
                  style={{ maxWidth: 380 }}
                  placeholder="Nhập userId của nhân viên STAFF (dán tại đây)"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                />
                <button className="btn btn-primary" onClick={assign} disabled={assigning || !manualId}>
                  {assigning ? 'Đang gán...' : 'Gán'}
                </button>
              </div>
              <div className="hint" style={{ marginTop: 6 }}>
                Do API chỉ cho Admin xem danh sách user, nhà tổ chức cần có userId của nhân viên (Admin xem ở trang quản trị).
              </div>
            </div>
          )}
        </div>
      )}

      {staff.length === 0 ? (
        <EmptyState title="Chưa có nhân viên" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Gán lúc</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.user.fullName}</td>
                  <td>{s.user.email}</td>
                  <td>{formatDateTime(s.createdAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(s.userId)}>
                      Bỏ gán
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- Tab: Check-in ---------------- */

function CheckinTab({
  notify,
  liveCheckins,
}: {
  notify: (m: string, k?: 'success' | 'error') => void;
  liveCheckins: CheckinProcessedEvent[];
}) {
  const [qrCode, setQrCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setError('');
    if (!qrCode.trim()) {
      setError('Nhập mã QR');
      return;
    }
    setChecking(true);
    try {
      const res = await checkinApi.checkin(qrCode.trim());
      setResult(res);
      notify('Check-in thành công 🎉');
      setQrCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in thất bại');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: 24, maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>Quét vé tại cổng</h3>
        {result && (
          <div className="alert alert-success">
            <div>
              <strong>Check-in thành công!</strong>
              <div>Khách: {result.customerName}</div>
              <div>Sự kiện: {result.eventTitle}</div>
              <div>Lúc: {formatDateTime(result.checkedInAt)}</div>
            </div>
          </div>
        )}
        {error && !result && <Alert kind="error">{error}</Alert>}
        <form onSubmit={submit} style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Nhập hoặc dán mã QR của vé"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            autoFocus
          />
          <button className="btn btn-success" type="submit" disabled={checking}>
            {checking ? 'Đang quét...' : 'Check-in'}
          </button>
        </form>
        <div style={{ fontSize: 13, color: 'var(--color-text-soft)', marginTop: 8 }}>
          Mỗi vé chỉ check-in được đúng 1 lần (quét lại sẽ báo lỗi 409).
        </div>
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 560, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>
          Luồng check-in realtime{' '}
          {liveCheckins.length > 0 && (
            <span className="badge badge-success">{liveCheckins.length} lượt</span>
          )}
        </h3>
        {liveCheckins.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--color-text-soft)' }}>
            Chưa có ai check-in. Khi nhân viên quét vé tại cổng, mục này cập nhật ngay lập tức
            qua WebSocket.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {liveCheckins.map((c) => (
              <div key={c.ticketId} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="badge badge-success">✓</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.customerName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-soft)' }}>
                    {formatDateTime(c.checkedInAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Tab: Doanh thu & Vé mời ---------------- */

function DataTab({ event, notify }: { event: EventDetail; notify: (m: string, k?: 'success' | 'error') => void }) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [targetTypeId, setTargetTypeId] = useState(event.ticketTypes[0]?.id ?? '');
  const [file, setFile] = useState<File | null>(null);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await orderApi.exportRevenue(event.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      notify('Đã tải báo cáo doanh thu');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Xuất Excel thất bại', 'error');
    } finally {
      setExporting(false);
    }
  };

  const importExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTypeId || !file) {
      notify('Chọn loại vé và file Excel', 'error');
      return;
    }
    setImporting(true);
    setImportResult('');
    try {
      const res = await orderApi.importGuests(targetTypeId, file);
      setImportResult(`Đã nhập ${res.importedGuests} khách mời, tổng ${res.totalTickets} vé mời. Email kèm QR đang được gửi.`);
      notify('Nhập vé mời thành công');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Nhập vé mời thất bại', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Xuất báo cáo doanh thu</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-soft)', margin: '0 0 12px' }}>
          Tải file Excel thống kê từng đơn hàng PAID theo loại vé, khách hàng và tổng doanh thu sự kiện.
        </p>
        <button className="btn btn-primary" onClick={exportExcel} disabled={exporting}>
          {exporting ? 'Đang xuất...' : '⬇️ Xuất Excel'}
        </button>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Nhập vé mời hàng loạt (Excel)</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-soft)', margin: '0 0 12px' }}>
          File Excel cột: <b>A</b> Họ tên | <b>B</b> Email | <b>C</b> Số lượng. Dòng 1 là header sẽ bị bỏ qua.
          Vé mời miễn phí, gửi email kèm QR cho từng khách.
        </p>
        <form onSubmit={importExcel}>
          <div className="form-field">
            <label>Loại vé nhận vé mời</label>
            <select className="select" value={targetTypeId} onChange={(e) => setTargetTypeId(e.target.value)}>
              {event.ticketTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name} (còn {Math.max(0, tt.totalQuantity - tt.soldQuantity)} vé)
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>File .xlsx</label>
            <input
              className="input"
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setImportResult('');
              }}
            />
          </div>
          <button className="btn btn-success" type="submit" disabled={importing}>
            {importing ? 'Đang nhập...' : 'Nhập vé mời'}
          </button>
        </form>
        {importResult && <div className="alert alert-success" style={{ marginTop: 12 }}>✓ {importResult}</div>}
      </div>
    </div>
  );
}