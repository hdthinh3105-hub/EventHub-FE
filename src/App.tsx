import { Routes, Route, Outlet } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { HomePage } from '@/pages/HomePage';
import { EventDetailPage } from '@/pages/EventDetailPage';
import { CheckoutSuccessPage } from '@/pages/CheckoutSuccessPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { OrganizerDashboard } from '@/pages/organizer/OrganizerDashboard';
import { EventCreatePage } from '@/pages/organizer/EventCreatePage';
import { EventManagePage } from '@/pages/organizer/EventManagePage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';

function Layout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
}

function NotFound() {
  return (
    <div className="page">
      <div className="container" style={{ textAlign: 'center' }}>
        <h1 className="page-heading">404 — Không tìm thấy trang</h1>
        <a className="btn btn-primary" href="/">
          Về trang chủ
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route
          path="/organizer"
          element={
            <ProtectedPage roles={['ORGANIZER', 'ADMIN']}>
              <OrganizerDashboard />
            </ProtectedPage>
          }
        />
        <Route
          path="/organizer/events/new"
          element={
            <ProtectedPage roles={['ORGANIZER', 'ADMIN']}>
              <EventCreatePage />
            </ProtectedPage>
          }
        />
        <Route
          path="/organizer/events/:id"
          element={
            <ProtectedPage roles={['ORGANIZER', 'ADMIN']}>
              <EventManagePage />
            </ProtectedPage>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedPage roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedPage>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}