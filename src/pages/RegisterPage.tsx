import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Alert } from '@/components/Alert';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      setError('Mật khẩu tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa và 1 chữ số');
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        ...(form.phone ? { phone: form.phone } : {}),
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 440 }}>
        <div className="card" style={{ padding: 28 }}>
          <h1 style={{ marginTop: 0 }}>Đăng ký tài khoản</h1>
          <Alert kind="error">{error}</Alert>
          <form onSubmit={onSubmit}>
            <div className="form-field">
              <label>Họ và tên</label>
              <input className="input" required minLength={2} value={form.fullName} onChange={(e) => onField('fullName', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input className="input" type="email" required value={form.email} onChange={(e) => onField('email', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Điện thoại (không bắt buộc)</label>
              <input className="input" value={form.phone} onChange={(e) => onField('phone', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Mật khẩu</label>
              <input
                className="input"
                type="password"
                required
                value={form.password}
                onChange={(e) => onField('password', e.target.value)}
              />
              <div className="hint">Tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa và 1 chữ số</div>
            </div>
            <div className="form-field">
              <label>Xác nhận mật khẩu</label>
              <input className="input" type="password" required value={form.confirm} onChange={(e) => onField('confirm', e.target.value)} />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>
          <div style={{ marginTop: 14, fontSize: 14, textAlign: 'center', color: 'var(--color-text-soft)' }}>
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
}