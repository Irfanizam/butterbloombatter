import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { bootstrapAuth } from './services/api';
import { AuthGuard } from './components/AuthGuard';
import { AdminLayout } from './components/layout/AdminLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { Login } from './pages/Login';
import { Products } from './pages/admin/Products';
import { Categories } from './pages/admin/Categories';
import { Orders } from './pages/admin/Orders';
import { Customers } from './pages/admin/Customers';
import { Finance } from './pages/admin/Finance';
import { Reviews } from './pages/admin/Reviews';
import { Home } from './pages/public/Home';
import { Menu } from './pages/public/Menu';
import { Contact } from './pages/public/Contact';

export default function App() {
  useEffect(() => {
    void bootstrapAuth();
  }, []);

  return (
    <Routes>
      {/* Public storefront */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      <Route path="/login" element={<Login />} />

      {/* Admin (auth-guarded) */}
      <Route element={<AuthGuard />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Finance />} />
          <Route path="/admin/finance" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/orders" element={<Orders />} />
          <Route path="/admin/customers" element={<Customers />} />
          <Route path="/admin/reviews" element={<Reviews />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
