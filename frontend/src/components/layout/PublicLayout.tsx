import { Link, NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/menu', label: 'Menu', end: false },
  { to: '/contact', label: 'Contact', end: false },
];

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <header className="sticky top-0 z-40 border-b border-brand-border-soft bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🍪</span>
            <span className="font-bold text-brand-dark">ButterBloomBatter</span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-brand px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive ? 'text-brand-primary' : 'text-brand-muted hover:text-brand-dark'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/login"
              className="ml-2 rounded-brand bg-brand-primary px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-brand-border-soft bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-brand-faded">
          🌻 ButterBloomBatter — where slow bakes quietly bloom
        </div>
      </footer>
    </div>
  );
}
