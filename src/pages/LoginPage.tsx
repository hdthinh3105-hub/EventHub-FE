import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Alert } from '@/components/Alert';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="card" style={{ padding: 28 }}>
          <h1 style={{ marginTop: 0 }}>Đăng nhập</h1>
          <Alert kind="error">{error}</Alert>
          <form onSubmit={onSubmit}>
            <div className="form-field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="form-field">
              <label>Mật khẩu</label>
              <input
                className="input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>
          <div style={{ marginTop: 14, fontSize: 14, textAlign: 'center' }}>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
            <div style={{ marginTop: 6, color: 'var(--color-text-soft)' }}>
              Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}