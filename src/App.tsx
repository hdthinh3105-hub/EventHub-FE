import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Spinner } from '@/components/Feedback';

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const EventDetailPage = lazy(() => import('@/pages/EventDetailPage').then((m) => ({ default: m.EventDetailPage })));
const CheckoutSuccessPage = lazy(() => import('@/pages/CheckoutSuccessPage').then((m) => ({ default: m.CheckoutSuccessPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const OrganizerDashboard = lazy(() => import('@/pages/organizer/OrganizerDashboard').then((m) => ({ default: m.OrganizerDashboard })));
const EventCreatePage = lazy(() => import('@/pages/organizer/EventCreatePage').then((m) => ({ default: m.EventCreatePage })));
const EventManagePage = lazy(() => import('@/pages/organizer/EventManagePage').then((m) => ({ default: m.EventManagePage })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));

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

function PageSpinner() {
  return (
    <div className="page">
      <div className="container">
        <Spinner text="Đang tải..." />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Suspense fallback={<PageSpinner />}><HomePage /></Suspense>} />
          <Route path="/events/:id" element={<Suspense fallback={<PageSpinner />}><EventDetailPage /></Suspense>} />
          <Route path="/checkout/success" element={<Suspense fallback={<PageSpinner />}><CheckoutSuccessPage /></Suspense>} />

          <Route path="/login" element={<Suspense fallback={<PageSpinner />}><LoginPage /></Suspense>} />
          <Route path="/register" element={<Suspense fallback={<PageSpinner />}><RegisterPage /></Suspense>} />
          <Route path="/forgot-password" element={<Suspense fallback={<PageSpinner />}><ForgotPasswordPage /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<PageSpinner />}><ResetPasswordPage /></Suspense>} />
          <Route path="/verify-email" element={<Suspense fallback={<PageSpinner />}><VerifyEmailPage /></Suspense>} />

          <Route
            path="/organizer"
            element={
              <ProtectedPage roles={['ORGANIZER', 'ADMIN']}>
                <Suspense fallback={<PageSpinner />}><OrganizerDashboard /></Suspense>
              </ProtectedPage>
            }
          />
          <Route
            path="/organizer/events/new"
            element={
              <ProtectedPage roles={['ORGANIZER', 'ADMIN']}>
                <Suspense fallback={<PageSpinner />}><EventCreatePage /></Suspense>
              </ProtectedPage>
            }
          />
          <Route
            path="/organizer/events/:id"
            element={
              <ProtectedPage roles={['ORGANIZER', 'ADMIN']}>
                <Suspense fallback={<PageSpinner />}><EventManagePage /></Suspense>
              </ProtectedPage>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedPage roles={['ADMIN']}>
                <Suspense fallback={<PageSpinner />}><AdminDashboard /></Suspense>
              </ProtectedPage>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}