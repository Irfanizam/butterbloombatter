import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { bootstrapAuth } from './services/api';
import { AuthGuard } from './components/AuthGuard';
import { AdminLayout } from './components/layout/AdminLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { Login } from './pages/Login';
import { Placeholder } from './pages/Placeholder';
import { Dashboard } from './pages/admin/Dashboard';

export default function App() {
  useEffect(() => {
    void bootstrapAuth();
  }, []);

  return (
    <Routes>
      {/* Public storefront (pages built in Phase 5) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Placeholder title="Home" note="Storefront lands in Phase 5." />} />
        <Route path="/menu" element={<Placeholder title="Menu" note="Storefront lands in Phase 5." />} />
        <Route path="/contact" element={<Placeholder title="Contact" note="Storefront lands in Phase 5." />} />
      </Route>

      <Route path="/login" element={<Login />} />

      {/* Admin (auth-guarded; pages built in Phase 4) */}
      <Route element={<AuthGuard />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/products" element={<Placeholder title="Products" note="Built in Phase 4." />} />
          <Route path="/admin/categories" element={<Placeholder title="Categories" note="Built in Phase 4." />} />
          <Route path="/admin/orders" element={<Placeholder title="Orders" note="Built in Phase 4." />} />
          <Route path="/admin/customers" element={<Placeholder title="Customers" note="Built in Phase 4." />} />
          <Route path="/admin/finance" element={<Placeholder title="Finance" note="Built in Phase 4." />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
