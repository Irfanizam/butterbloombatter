import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/admin/products', label: 'Products', icon: '🍪', end: false },
  { to: '/admin/categories', label: 'Categories', icon: '🏷️', end: false },
  { to: '/admin/orders', label: 'Orders', icon: '📦', end: false },
  { to: '/admin/customers', label: 'Customers', icon: '👥', end: false },
  { to: '/admin/finance', label: 'Finance', icon: '💰', end: false },
  { to: '/admin/reviews', label: 'Reviews', icon: '⭐', end: false },
];

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* clear locally regardless */
    }
    clearAuth();
    toast.info('Logged out');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-brand-bg">
      <aside className="flex w-16 flex-col bg-white shadow-brand md:w-64">
        <div className="flex items-center gap-2 border-b border-brand-border-soft px-4 py-5">
          <span className="text-2xl">🍪</span>
          <span className="hidden font-bold text-brand-dark md:inline">ButterBloomBatter</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-brand px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-hero text-white shadow-brand-sm'
                    : 'text-brand-muted hover:bg-brand-soft'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span className="hidden md:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-brand-border-soft p-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-brand px-3 py-2.5 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-red-light hover:text-brand-red"
          >
            <span className="text-lg">🚪</span>
            <span className="hidden md:inline">Logout</span>
          </button>
          {user && (
            <p className="hidden truncate px-3 pt-2 text-xs text-brand-faded md:block">
              {user.name} · {user.role}
            </p>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
