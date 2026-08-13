import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { roleLabel } from '@/lib/format';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const allowed = user ? user.role : 'GUEST';
  const showOrganizer = allowed === 'ORGANIZER' || allowed === 'ADMIN';
  const showAdmin = allowed === 'ADMIN';

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link className="navbar-logo" to="/">
          <span style={{ fontSize: 24 }}>🎟️</span> EventHub
        </Link>
        <nav className="navbar-links">
          <NavLink className="nav-link" to="/" end>
            Sự kiện
          </NavLink>
          {showOrganizer && (
            <NavLink className="nav-link" to="/organizer">
              Quản lý sự kiện
            </NavLink>
          )}
          {showAdmin && (
            <NavLink className="nav-link" to="/admin">
              Quản trị hệ thống
            </NavLink>
          )}
        </nav>
        <div className="navbar-user">
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar">{user.fullName.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{user.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-soft)' }}>
                    {roleLabel(user.role)}
                  </div>
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-outline btn-sm" to="/login">
                Đăng nhập
              </Link>
              <Link className="btn btn-primary btn-sm" to="/register">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}