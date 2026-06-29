import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';
import type {
  Category,
  Customer,
  DashboardData,
  Finance,
  MonthlyTotal,
  Order,
  OrderStatus,
  Paginated,
  Product,
  User,
} from '../types';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

/** Hits /auth/refresh directly (bypassing interceptors) and updates the store. */
async function doRefresh(): Promise<string | null> {
  try {
    const res = await axios.post(`${baseURL}/api/auth/refresh`, {}, { withCredentials: true });
    const { accessToken, user } = res.data as { accessToken: string; user: User };
    useAuthStore.getState().setAuth(accessToken, user);
    return accessToken;
  } catch {
    useAuthStore.getState().clearAuth();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    if (status === 401 && original && !original._retry && !original.url?.includes('/api/auth/')) {
      original._retry = true;
      refreshPromise = refreshPromise ?? doRefresh();
      const token = await refreshPromise;
      refreshPromise = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

/** Restores the session from the httpOnly refresh cookie on app load. */
export async function bootstrapAuth(): Promise<void> {
  useAuthStore.getState().setStatus('loading');
  const token = await doRefresh();
  if (!token) useAuthStore.getState().clearAuth();
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }).then((r) => r.data as { accessToken: string; user: User }),
  logout: () => api.post('/api/auth/logout').then((r) => r.data),
  me: () => api.get('/api/auth/me').then((r) => r.data as { user: User }),
};

export const dashboardApi = {
  get: () => api.get('/api/dashboard').then((r) => r.data as DashboardData),
};

export const categoriesApi = {
  list: () => api.get('/api/categories').then((r) => r.data as Category[]),
  create: (data: { name: string; emoji?: string }) =>
    api.post('/api/categories', data).then((r) => r.data as Category),
  update: (id: number, data: { name?: string; emoji?: string }) =>
    api.put(`/api/categories/${id}`, data).then((r) => r.data as Category),
  remove: (id: number) => api.delete(`/api/categories/${id}`),
};

export const productsApi = {
  listPublic: () => api.get('/api/products').then((r) => r.data as Product[]),
  listAdmin: () => api.get('/api/products/admin').then((r) => r.data as Product[]),
  get: (id: number) => api.get(`/api/products/${id}`).then((r) => r.data as Product),
  create: (data: FormData) => api.post('/api/products', data).then((r) => r.data as Product),
  update: (id: number, data: FormData) => api.put(`/api/products/${id}`, data).then((r) => r.data as Product),
  remove: (id: number) => api.delete(`/api/products/${id}`),
  setStock: (id: number, stock: number) =>
    api.patch(`/api/products/${id}/stock`, { stock }).then((r) => r.data as Product),
  toggleFeatured: (id: number) => api.patch(`/api/products/${id}/featured`).then((r) => r.data as Product),
};

export const customersApi = {
  list: (q?: string) =>
    api.get('/api/customers', { params: q ? { q } : {} }).then((r) => r.data as Customer[]),
  get: (id: number) => api.get(`/api/customers/${id}`).then((r) => r.data as Customer),
  create: (data: Partial<Customer>) => api.post('/api/customers', data).then((r) => r.data as Customer),
  update: (id: number, data: Partial<Customer>) =>
    api.put(`/api/customers/${id}`, data).then((r) => r.data as Customer),
  remove: (id: number) => api.delete(`/api/customers/${id}`),
};

export interface OrderListParams {
  status?: OrderStatus;
  customerId?: number;
  page?: number;
  limit?: number;
}

export interface CreateOrderPayload {
  customerId: number;
  items: { productId: number; quantity: number }[];
  notes?: string;
  deliveryDate?: string;
}

export const ordersApi = {
  list: (params: OrderListParams = {}) =>
    api.get('/api/orders', { params }).then((r) => r.data as Paginated<Order>),
  get: (id: number) => api.get(`/api/orders/${id}`).then((r) => r.data as Order),
  create: (data: CreateOrderPayload) => api.post('/api/orders', data).then((r) => r.data as Order),
  setStatus: (id: number, status: OrderStatus) =>
    api.patch(`/api/orders/${id}/status`, { status }).then((r) => r.data as Order),
  remove: (id: number) => api.delete(`/api/orders/${id}`),
};

export interface FinanceListParams {
  month?: string;
  type?: FinanceTypeParam;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
}
type FinanceTypeParam = 'IN' | 'OUT';

export const financeApi = {
  list: (params: FinanceListParams = {}) =>
    api.get('/api/finance', { params }).then((r) => r.data as Finance[]),
  summary: () => api.get('/api/finance/summary').then((r) => r.data as MonthlyTotal[]),
  create: (data: Partial<Finance>) => api.post('/api/finance', data).then((r) => r.data as Finance),
  update: (id: number, data: Partial<Finance>) =>
    api.put(`/api/finance/${id}`, data).then((r) => r.data as Finance),
  remove: (id: number) => api.delete(`/api/finance/${id}`),
};

/** Extracts a human-readable message from an Axios error. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? fallback;
  }
  return fallback;
}
