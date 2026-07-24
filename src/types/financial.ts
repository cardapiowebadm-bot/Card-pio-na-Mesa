export type InvoiceStatus = 'em_aberto' | 'pago' | 'vencido' | 'cancelado';

export type InvoicePaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'stripe';

export type SubscriptionStatus = 'active' | 'trial' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'paused' | 'expired';

export interface InvoiceHistoryEntry {
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
}

export interface Invoice {
  id: string;
  number: string; // ex: INV-2026-001
  restaurantId: string;
  restaurantName: string;
  planId: string;
  planName: string;
  amount: number;
  discounts: number;
  additions: number;
  finalAmount: number;
  competence: string; // ex: '07/2026'
  issueDate: string; // ISO date
  dueDate: string; // ISO date
  status: InvoiceStatus;
  paidAt?: string;
  paymentMethod?: InvoicePaymentMethod;
  internalNotes?: string;
  history?: InvoiceHistoryEntry[];
  
  // Estrutura PIX
  pixQrCode?: string;
  pixPayload?: string;
  pixKey?: string;
  txid?: string;
  pixCreatedAt?: string;
  pixPaidAt?: string;
  pixStatus?: 'pending' | 'paid' | 'expired';
  
  // Estrutura Stripe
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  stripeStatus?: string;
  
  createdAt: any;
  updatedAt: any;
}

export interface Receipt {
  id: string;
  number: string; // ex: REC-2026-001
  invoiceId: string;
  restaurantId: string;
  restaurantName: string;
  planName: string;
  amount: number;
  paymentMethod: InvoicePaymentMethod;
  paidAt: string;
  notes?: string;
  createdAt: any;
}

export interface Subscription {
  id: string;
  restaurantId: string;
  restaurantName: string;
  planId: string;
  planName: string;
  price: number;
  status: SubscriptionStatus;
  startDate: string;
  renewalDate: string;
  autoRenew: boolean;
  isTrial: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  canceledAt?: string;
  cancelReason?: string;
  
  // Estrutura Stripe
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  stripeCheckoutSessionId?: string;
  stripeStatus?: string;
  
  createdAt: any;
  updatedAt: any;
}

export type StripeAuditEventType = 
  | 'stripe_customer_created'
  | 'stripe_checkout_started'
  | 'stripe_checkout_completed'
  | 'stripe_subscription_created'
  | 'stripe_upgrade'
  | 'stripe_downgrade'
  | 'stripe_canceled'
  | 'stripe_renewal'
  | 'stripe_payment_failed';

export interface PaymentHistoryLog {
  id: string;
  timestamp: string;
  restaurantId: string;
  restaurantName: string;
  invoiceId?: string;
  action: 'invoice_created' | 'invoice_updated' | 'invoice_paid' | 'invoice_canceled' | 'plan_changed' | 'due_date_changed' | 'receipt_issued' | 'upgrade_requested' | 'billing_info_updated' | 'trial_expired' | 'block_unpaid' | 'unblock_reactivated' | StripeAuditEventType;
  description: string;
  performedBy: string;
  amount?: number;
  metadata?: any;
}

export interface RestaurantBillingInfo {
  companyName?: string; // Razão Social
  tradeName?: string; // Nome Fantasia
  documentNumber?: string; // CNPJ / CPF
  stateRegistration?: string; // Inscrição Estadual
  contactName?: string; // Responsável Financeiro
  contactEmail?: string; // E-mail Financeiro
  contactPhone?: string; // Telefone Financeiro
  zipCode?: string; // CEP
  street?: string; // Logradouro
  number?: string; // Número
  complement?: string; // Complemento
  neighborhood?: string; // Bairro
  city?: string; // Cidade
  state?: string; // UF
}

export interface PaymentMethodConfig {
  id: string;
  type: 'pix' | 'credit_card' | 'debit_card' | 'stripe';
  enabled: boolean;
  label: string;
  details?: any;
}

export interface PaymentSettings {
  id?: string;
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  pixBeneficiary: string;
  pixCity: string;
  autoGenerateInvoices: boolean;
  defaultDueDays: number;
  stripePublicKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  updatedAt?: string;
}
