export type Role = 'ADMIN' | 'STAFF';
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'BAKING'
  | 'PACKED'
  | 'DELIVERED'
  | 'CANCELLED';
export type FinanceType = 'IN' | 'OUT';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  emoji: string;
  sortOrder: number;
  _count?: { products: number };
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  publicId: string;
  sortOrder: number;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  imagePublicId: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  categoryId: number;
  category?: Category;
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  joinedDate: string | null;
  createdAt: string;
  _count?: { orders: number };
  orders?: Order[];
  totalSpent?: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product?: Product;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customer?: Pick<Customer, 'id' | 'name'> & Partial<Customer>;
  staffId: number;
  staff?: Pick<User, 'id' | 'name' | 'email'>;
  status: OrderStatus;
  totalAmount: number;
  notes: string | null;
  tag: string | null;
  deliveryDate: string | null;
  completedAt: string | null;
  orderItems?: OrderItem[];
  _count?: { orderItems: number };
  createdAt: string;
  updatedAt: string;
}

export interface LedgerRow {
  key: string;
  source: 'finance' | 'order';
  financeId?: number;
  orderId?: number;
  type: FinanceType;
  date: string;
  category: string;
  desc: string;
  note: string | null;
  amount: number;
  customerId?: number | null;
  customerName: string | null;
}

export interface Finance {
  id: number;
  type: FinanceType;
  amount: number;
  desc: string;
  category: string;
  note: string | null;
  date: string;
  staffId: number;
  customerId: number | null;
  customer?: { id: number; name: string } | null;
  createdAt: string;
}

export interface MonthlyTotal {
  month: string; // YYYY-MM
  in: number;
  out: number;
  net: number;
}

export interface DashboardData {
  todayOrders: number;
  todayRevenue: number;
  monthRevenue: number;
  monthExpenses: number;
  monthNet: number;
  lowStockProducts: Product[];
  recentOrders: Order[];
  ordersByStatus: Record<string, number>;
  monthlyChart: MonthlyTotal[];
}

export interface Review {
  id: number;
  author: string;
  rating: number;
  message: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Paginated<T> {
  orders: T[];
  total: number;
  page: number;
  limit: number;
}
