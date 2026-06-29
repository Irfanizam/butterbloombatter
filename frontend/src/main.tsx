import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Routing, layouts, and pages are wired up in Phase 3.
function App() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl">🍪</div>
        <h1 className="mt-4 text-2xl font-bold text-brand-dark">ButterBloomBatter</h1>
        <p className="mt-1 text-brand-muted">Baked with love, delivered with care 🧁</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
