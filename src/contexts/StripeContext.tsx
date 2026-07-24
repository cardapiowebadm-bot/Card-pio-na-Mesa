import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface StripeContextConfig {
  configured: boolean;
  publishableKey: string;
  prices: {
    bistro: string;
    gourmet: string;
    chef: string;
  };
}

export interface CreateCustomerDTO {
  restaurantId: string;
  name: string;
  email: string;
  phone?: string;
  documentNumber?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutDTO {
  restaurantId: string;
  planId: string;
  priceId?: string;
  customerId?: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export interface StripeContextType {
  config: StripeContextConfig | null;
  loading: boolean;
  createCustomer: (data: CreateCustomerDTO) => Promise<any>;
  createCheckoutSession: (data: CreateCheckoutDTO) => Promise<{ sessionId: string; url: string | null }>;
  createCustomerPortalSession: (customerId: string, returnUrl?: string) => Promise<string>;
  refreshConfig: () => Promise<void>;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

export const StripeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<StripeContextConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/stripe/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.warn('[StripeProvider] Não foi possível carregar configurações do Stripe:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const createCustomer = async (data: CreateCustomerDTO) => {
    const res = await fetch(`${apiBase}/api/stripe/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar cliente Stripe');
    }
    const result = await res.json();
    return result.customer;
  };

  const createCheckoutSession = async (data: CreateCheckoutDTO) => {
    const res = await fetch(`${apiBase}/api/stripe/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar sessão de checkout Stripe');
    }
    const result = await res.json();
    return result.session;
  };

  const createCustomerPortalSession = async (customerId: string, returnUrl?: string) => {
    const res = await fetch(`${apiBase}/api/stripe/customer-portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, returnUrl })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao criar portal do cliente Stripe');
    }
    const result = await res.json();
    return result.url;
  };

  return (
    <StripeContext.Provider
      value={{
        config,
        loading,
        createCustomer,
        createCheckoutSession,
        createCustomerPortalSession,
        refreshConfig: fetchConfig
      }}
    >
      {children}
    </StripeContext.Provider>
  );
};

export const useStripe = (): StripeContextType => {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe deve ser utilizado dentro de um StripeProvider');
  }
  return context;
};
