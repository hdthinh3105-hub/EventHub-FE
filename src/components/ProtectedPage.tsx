import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/Feedback';

export function ProtectedPage({
  roles,
  children,
}: {
  roles?: string[];
  children: ReactNode;
}) {
  const { user, isBooting } = useAuth();
  const location = useLocation();

  if (isBooting) {
    return (
      <div className="page">
        <div className="container">
          <Spinner text="Đang tải..." />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}