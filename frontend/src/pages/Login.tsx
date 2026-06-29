import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { apiErrorMessage, authApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/ui/Button';

export function Login() {
  const status = useAuthStore((s) => s.status);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { accessToken, user } = await authApi.login(email, password);
      setAuth(accessToken, user);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/admin', { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-5xl">🍪</div>
          <h1 className="mt-3 text-2xl font-bold text-brand-dark">ButterBloomBatter</h1>
          <p className="mt-1 text-brand-muted">Admin sign in</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-brand-lg border border-brand-border-soft bg-white p-6 shadow-brand-lg"
        >
          <label className="mb-1 block text-sm font-semibold text-brand-dark">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-brand border border-brand-border px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            placeholder="admin@butterbloombatter.com"
          />

          <label className="mb-1 block text-sm font-semibold text-brand-dark">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 w-full rounded-brand border border-brand-border px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
            placeholder="••••••••"
          />

          <Button type="submit" loading={submitting} className="w-full">
            Sign in
          </Button>

          <p className="mt-4 rounded-brand bg-brand-soft px-3 py-2 text-center text-xs text-brand-muted">
            Demo: admin@butterbloombatter.com / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
