export type UserRole = 'owner' | 'manager' | 'waiter' | 'cozinha';

export interface Restaurant {
  id: string;
  name: string;
  logo: string;
  phone: string;
  address: string;
  instagram?: string;
  whatsapp?: string;
  hours?: string;
  serviceTax: number; // percentage, e.g. 10 for 10%
  theme: {
    primary: string; // Tailwind color class or hex, e.g. '#e11d48'
    secondary: string; // e.g. '#475569'
  };
  ownerId: string;
  createdAt: any;
  serviceTaxEnabled?: boolean;
  serviceTaxType?: 'percentage' | 'fixed';
  serviceTaxValue?: number;
  couvertEnabled?: boolean;
  couvertType?: 'percentage' | 'fixed';
  couvertValue?: number;
  themeColor?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  restaurantId: string;
  createdAt: any;
}

export interface Category {
  id: string;
  name: string;
  index: number;
  restaurantId: string;
  createdAt: any;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  available: boolean;
  featured: boolean;
  onSale: boolean;
  salePrice?: number;
  prepareTime: number; // in minutes
  restaurantId: string;
  createdAt: any;
}

export interface Table {
  id: string;
  number: number;
  status: 'free' | 'occupied' | 'calling' | 'billing' | 'paid';
  restaurantId: string;
  createdAt: any;
}

export interface TableSession {
  id: string;
  tableId: string;
  tableNumber: number;
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  customerCpf?: string;
  status: 'active' | 'closed';
  createdAt: any;
  closedAt?: any;
  paymentMethod?: 'pix' | 'card';
  paymentStatus?: 'pending' | 'paid';
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  status?: 'preparing' | 'delivered';
}

export interface Order {
  id: string;
  tableSessionId: string;
  tableId: string;
  tableNumber: number;
  restaurantId: string;
  items: OrderItem[];
  subtotal: number;
  serviceTax: number;
  couvert?: number;
  total: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  cancelReason?: string;
  cancelledAt?: string;
  createdAt: any;
  updatedAt: any;
  customerName: string;
  customerPhone: string;
}

export interface WaiterCall {
  id: string;
  tableSessionId: string;
  tableId: string;
  tableNumber: number;
  restaurantId: string;
  reason: 'water' | 'napkin' | 'service' | 'bill' | 'other';
  status: 'pending' | 'resolved';
  createdAt: any;
}

export interface RestaurantNotification {
  id: string;
  restaurantId: string;
  type: 'new_order' | 'waiter_call' | 'payment_request';
  message: string;
  status: 'unread' | 'read';
  referenceId: string; // orderId, waiterCallId, or tableSessionId
  tableNumber: number;
  createdAt: any;
}
