import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { Alert } from '@/components/Alert';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setMessage(res.message ?? 'Kiểm tra email của bạn để đặt lại mật khẩu');
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
          <h1 style={{ marginTop: 0 }}>Quên mật khẩu</h1>
          <Alert kind="success">{message}</Alert>
          <Alert kind="error">{error}</Alert>
          {!message && (
            <form onSubmit={onSubmit}>
              <p style={{ color: 'var(--color-text-soft)' }}>
                Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu (hiệu lực 15 phút).
              </p>
              <div className="form-field">
                <label>Email</label>
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </form>
          )}
          <div style={{ marginTop: 14, fontSize: 14, textAlign: 'center' }}>
            <Link to="/login">← Quay lại đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
}