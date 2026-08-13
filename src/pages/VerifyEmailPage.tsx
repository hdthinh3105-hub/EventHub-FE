import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { Alert } from '@/components/Alert';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Thiếu mã xác thực trong URL');
      return;
    }
    authApi
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message ?? 'Xác thực email thành công!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Xác thực thất bại');
      });
  }, [token]);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="card" style={{ padding: 28 }}>
          <h1 style={{ marginTop: 0 }}>Xác thực email</h1>
          {status === 'loading' ? (
            <p style={{ color: 'var(--color-text-soft)' }}>Đang xác thực...</p>
          ) : (
            <Alert kind={status === 'success' ? 'success' : 'error'}>{message}</Alert>
          )}
          <div style={{ marginTop: 14, fontSize: 14, textAlign: 'center' }}>
            <Link to="/">Về trang chủ</Link>
          </div>
        </div>
      </div>
    </div>
  );
}