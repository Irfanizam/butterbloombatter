import { create } from 'zustand';
import type { User } from '../types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  status: AuthStatus;
  setAuth: (accessToken: string, user: User) => void;
  setStatus: (status: AuthStatus) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'idle',
  setAuth: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  setStatus: (status) => set({ status }),
  clearAuth: () => set({ accessToken: null, user: null, status: 'unauthenticated' }),
}));
