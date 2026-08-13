import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { Alert } from '@/components/Alert';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!token) {
      setError('Thiếu mã đặt lại mật khẩu trong URL');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setMessage('Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="card" style={{ padding: 28 }}>
          <h1 style={{ marginTop: 0 }}>Đặt lại mật khẩu</h1>
          <Alert kind="success">{message}</Alert>
          <Alert kind="error">{error}</Alert>
          {!message && (
            <form onSubmit={onSubmit}>
              <div className="form-field">
                <label>Mật khẩu mới</label>
                <input
                  className="input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="hint">Tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa và 1 chữ số</div>
              </div>
              <div className="form-field">
                <label>Xác nhận mật khẩu mới</label>
                <input className="input" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </form>
          )}
          <div style={{ marginTop: 14, fontSize: 14, textAlign: 'center' }}>
            {message ? <Link to="/login">Đăng nhập ngay</Link> : null}
          </div>
        </div>
      </div>
    </div>
  );
}