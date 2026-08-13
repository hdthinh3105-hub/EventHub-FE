import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/api/admin';
import { categoryApi, venueApi } from '@/api/events';
import { Modal } from '@/components/Modal';
import { Alert } from '@/components/Alert';
import { Spinner, EmptyState } from '@/components/Feedback';
import { useToast } from '@/components/Toast';
import { formatDateTime, roleLabel } from '@/lib/format';
import type { AdminUser, Category, RoleName, Venue } from '@/types';

type Tab = 'users' | 'categories' | 'venues';

const ROLES: RoleName[] = ['ADMIN', 'ORGANIZER', 'STAFF', 'CUSTOMER'];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-heading">Quản trị hệ thống</h1>
        <div className="tabs">
          <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
            Người dùng
          </button>
          <button className={`tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>
            Danh mục
          </button>
          <button className={`tab ${tab === 'venues' ? 'active' : ''}`} onClick={() => setTab('venues')}>
            Địa điểm
          </button>
        </div>
        {tab === 'users' && <UsersTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'venues' && <VenuesTab />}
      </div>
    </div>
  );
}

function UsersTab() {
  const { notify } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changingId, setChangingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await adminApi.listUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeRole = async (user: AdminUser, roleName: RoleName) => {
    setChangingId(user.id);
    try {
      await adminApi.assignRole(user.id, roleName);
      notify(`Đã đổi role của ${user.fullName} thành ${roleLabel(roleName)}`);
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Đổi role thất bại', 'error');
    } finally {
      setChangingId('');
    }
  };

  if (loading) {
    return <Spinner text="Đang tải người dùng..." />;
  }

  return (
    <div>
      {error && <Alert kind="error">{error}</Alert>}
      {users.length === 0 ? (
        <EmptyState title="Không có người dùng" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Đã xác thực</th>
                <th>Role</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.isVerified ? 'badge-success' : 'badge-warning'}`}>
                      {u.isVerified ? 'Đã xác thực' : 'Chưa'}
                    </span>
                  </td>
                  <td>
                    <select
                      className="select"
                      style={{ width: 150 }}
                      value={u.role.name}
                      disabled={changingId === u.id}
                      onChange={(e) => changeRole(u, e.target.value as RoleName)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const { notify } = useToast();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await categoryApi.list());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      notify('Tên tối thiểu 2 ký tự', 'error');
      return;
    }
    setSaving(true);
    try {
      await categoryApi.create(name.trim());
      notify('Thêm danh mục thành công');
      setName('');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Thất bại', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await categoryApi.update(editing.id, editing.name);
      notify('Cập nhật thành công');
      setEditing(null);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Thất bại', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    if (!window.confirm(`Xóa danh mục "${c.name}"?`)) return;
    try {
      await categoryApi.remove(c.id);
      notify('Xóa danh mục thành công');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Xóa thất bại', 'error');
    }
  };

  return (
    <div>
      <form className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', gap: 10 }} onSubmit={create}>
        <input className="input" placeholder="Tên danh mục mới" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Đang thêm...' : '+ Thêm'}
        </button>
      </form>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="Chưa có danh mục" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tên</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(c)}>
                      Sửa
                    </button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title="Sửa danh mục" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit}>
            <div className="form-field">
              <label>Tên</label>
              <input className="input" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" type="button" onClick={() => setEditing(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function VenuesTab() {
  const { notify } = useToast();
  const [items, setItems] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await venueApi.list());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (v: Venue) => {
    if (!window.confirm(`Xóa địa điểm "${v.name}"?`)) return;
    try {
      await venueApi.remove(v.id);
      notify('Xóa địa điểm thành công');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Xóa thất bại', 'error');
    }
  };

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            setCreating(true);
            setEditing({ id: '', name: '', address: '', city: '', capacity: null });
          }}
        >
          + Thêm địa điểm
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="Chưa có địa điểm" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Địa chỉ</th>
                <th>Thành phố</th>
                <th>Sức chứa</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>{v.name}</td>
                  <td>{v.address}</td>
                  <td>{v.city}</td>
                  <td>{v.capacity ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setCreating(false);
                        setEditing(v);
                      }}
                    >
                      Sửa
                    </button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(v)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={creating ? 'Thêm địa điểm' : 'Sửa địa điểm'}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        >
          <VenueForm
            key={editing.id || 'new'}
            venue={editing}
            onDone={async (data) => {
              try {
                if (creating) {
                  await venueApi.create(data);
                  notify('Thêm địa điểm thành công');
                } else {
                  await venueApi.update(editing.id, data);
                  notify('Cập nhật địa điểm thành công');
                }
                setEditing(null);
                setCreating(false);
                await load();
              } catch (err) {
                notify(err instanceof Error ? err.message : 'Thất bại', 'error');
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function VenueForm({
  venue,
  onDone,
}: {
  venue: Venue;
  onDone: (data: { name: string; address: string; city: string; capacity?: number | null }) => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    name: venue.name,
    address: venue.address,
    city: venue.city,
    capacity: venue.capacity !== null ? String(venue.capacity) : '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onDone({
        name: form.name,
        address: form.address,
        city: form.city,
        ...(form.capacity !== '' && Number(form.capacity) > 0 ? { capacity: Number(form.capacity) } : { capacity: null }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label>Tên địa điểm</label>
        <input className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="form-field">
        <label>Địa chỉ</label>
        <input className="input" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="form-field">
        <label>Thành phố</label>
        <input className="input" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <div className="form-field">
        <label>Sức chứa (để trống nếu không có)</label>
        <input
          className="input"
          type="number"
          min={0}
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" type="button" onClick={() => {}}>
          Hủy bỏ
        </button>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </form>
  );
}