export type UserRole = 'owner' | 'manager' | 'waiter' | 'cozinha' | 'master';

export type RestaurantStatus = 'active' | 'suspended' | 'blocked' | 'trial' | 'expired' | 'unpaid';

export interface MasterFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  category?: 'core' | 'operations' | 'management' | 'advanced';
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterPlanLimits {
  maxTables: number;     // 0 = ilimitado
  maxWaiters: number;    // 0 = ilimitado
  maxAdminUsers: number; // 0 = ilimitado
  trialDays: number;     // ex: 14
}

export interface MasterPlan {
  id: string;            // ex: 'bistro', 'gourmet', 'chef' ou id customizado
  name: string;          // ex: 'Plano Bistrô'
  description: string;   // ex: 'Para estabelecimentos em crescimento'
  price: number;         // Valor mensal em R$
  active: boolean;       // Ativo / Inativo
  order: number;         // Ordem de exibição
  limits: MasterPlanLimits;
  features: string[];    // Array de IDs de recursos (MasterFeature.id)
  createdAt?: string;
  updatedAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  logo: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  instagram?: string;
  whatsapp?: string;
  hours?: string;
  serviceTax: number; // percentage, e.g. 10 for 10%
  theme: {
    primary: string; // Tailwind color class or hex, e.g. '#e11d48'
    secondary: string; // e.g. '#475569'
  };
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  status?: RestaurantStatus;
  plan?: string; // 'bistro' | 'gourmet' | 'chef' | 'trial' or custom plan ID
  planId?: string;
  addOns?: string[]; // Array de IDs de recursos adquiridos como Add-on individual
  nextDueDate?: string;
  createdAt: any;
  serviceTaxEnabled?: boolean;
  serviceTaxType?: 'percentage' | 'fixed';
  serviceTaxValue?: number;
  couvertEnabled?: boolean;
  couvertType?: 'percentage' | 'fixed';
  couvertValue?: number;
  themeColor?: string;
  enableWaiterRating?: boolean;
  // Estrutura Stripe e Ciclo de Vida do SaaS
  subscriptionStatus?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  renewalDate?: string;
  updatedAt?: any;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeAccountStatus?: string;
  stripeLastSync?: string;
}

export * from './financial';

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

export interface TableSessionHistoryEntry {
  timestamp: string;
  action: string;
  userType: 'customer' | 'waiter' | 'owner' | 'manager';
  userName: string;
  details?: string;
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
  paymentMethod?: 'pix' | 'card' | 'cash';
  paymentStatus?: 'pending' | 'paid';
  waiterId?: string;
  waiterName?: string;
  createdBy?: 'customer' | 'waiter';
  history?: TableSessionHistoryEntry[];
  ratingSubmitted?: boolean;
  ratingValue?: number;
  ratedWaiterId?: string;
  ratedWaiterName?: string;
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
  createdBy?: 'customer' | 'waiter';
  waiterId?: string;
  waiterName?: string;
}

export interface Waiter {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  login: string;
  passwordTemp: string;
  status: 'active' | 'inactive';
  isFirstAccess: boolean;
  email?: string;
  userId?: string;
  createdAt: string;
  ratingAverage?: number;
  ratingCount?: number;
  ratingSum?: number;
}

export interface WaiterRating {
  id: string;
  restaurantId: string;
  tableSessionId: string;
  waiterId: string;
  waiterName?: string;
  tableNumber?: number;
  rating: number;
  comment?: string;
  createdAt: string;
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

export interface MasterAuditLog {
  id?: string;
  timestamp: string;
  action: 'plan_created' | 'plan_updated' | 'plan_deleted' | 'feature_saved' | 'feature_deleted' | 'restaurant_plan_changed' | 'restaurant_status_changed';
  description: string;
  performedBy: string;
  targetId: string;
  metadata?: any;
}
