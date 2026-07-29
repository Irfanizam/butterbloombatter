import { Link, NavLink, Outlet } from 'react-router-dom';
import { BUSINESS, whatsappLink } from '../../lib/business';
import { TawkChat } from '../public/TawkChat';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/menu', label: 'Menu', end: false },
  { to: '/contact', label: 'Contact', end: false },
];

export function PublicLayout() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-clip bg-brand-bg">
      <header className="sticky top-0 z-40 border-b border-brand-border-soft bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-4 sm:px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xl sm:text-2xl">🍪</span>
            <span className="truncate text-sm font-bold text-brand-dark sm:text-base">ButterBloomBatter</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-brand px-2.5 py-2 text-sm font-semibold transition-colors sm:px-3 ${
                    isActive ? 'text-brand-primary' : 'text-brand-muted hover:text-brand-dark'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Optional live-chat widget (loads only if VITE_TAWK_SRC is set) */}
      <TawkChat />
      {/* Floating WhatsApp chat button */}
      <a
        href={whatsappLink(`Hi ${BUSINESS.name}! I'd like to ask about your cookies.`)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-2xl shadow-brand-lg transition-transform hover:scale-110"
      >
        💬
      </a>

      <footer className="border-t border-brand-border-soft bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-brand-faded">
          🍪 ButterBloomBatter • where slow bakes quietly bloom
          <Link to="/login" className="ml-2 text-brand-faded/70 hover:text-brand-muted">
            · Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
