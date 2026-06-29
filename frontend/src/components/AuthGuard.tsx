import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { FullScreenSpinner } from './ui/Spinner';

export function AuthGuard() {
  const status = useAuthStore((s) => s.status);

  if (status === 'idle' || status === 'loading') {
    return <FullScreenSpinner />;
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
