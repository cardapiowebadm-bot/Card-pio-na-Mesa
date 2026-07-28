import Stripe from 'stripe';
import { StripeService } from './StripeService';

export interface CreateCustomerParams {
  restaurantId: string;
  name: string;
  email: string;
  phone?: string;
  documentNumber?: string; // CPF / CNPJ
  metadata?: Record<string, string>;
}

export interface StripeCustomerResponse {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  metadata: Record<string, string>;
}

export class StripeCustomerService {
  /**
   * Cria um novo cliente no Stripe associado ao restaurante.
   */
  public static async createCustomer(params: CreateCustomerParams): Promise<StripeCustomerResponse> {
    const stripe = StripeService.getStripeClient();

    if (!stripe) {
      console.log('[StripeCustomerService] [MOCK] Criando cliente simulated para restaurante:', params.restaurantId);
      return {
        id: `cus_mock_${params.restaurantId}_${Date.now()}`,
        name: params.name,
        email: params.email,
        phone: params.phone || null,
        metadata: {
          restaurantId: params.restaurantId,
          documentNumber: params.documentNumber || '',
          isMock: 'true',
          ...params.metadata
        }
      };
    }

    const cleanRestaurantId = String(params.restaurantId || '').trim();

    const customer = await stripe.customers.create({
      name: params.name,
      email: params.email,
      phone: params.phone,
      metadata: {
        ...(params.metadata || {}),
        restaurantId: cleanRestaurantId,
        documentNumber: params.documentNumber || ''
      }
    });

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      metadata: customer.metadata || {}
    };
  }

  /**
   * Consulta os dados de um cliente existente no Stripe pelo ID.
   */
  public static async getCustomer(customerId: string): Promise<StripeCustomerResponse | null> {
    const stripe = StripeService.getStripeClient();

    if (!stripe || customerId.startsWith('cus_mock_')) {
      console.log('[StripeCustomerService] [MOCK] Consultado cliente simulated:', customerId);
      return {
        id: customerId,
        name: 'Restaurante Simulado',
        email: 'contato@restaurante.com',
        phone: '(11) 99999-9999',
        metadata: { isMock: 'true' }
      };
    }

    try {
      const res = await stripe.customers.retrieve(customerId);
      if ('deleted' in res && res.deleted) {
        return null;
      }
      const customer = res as Stripe.Customer;
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        metadata: customer.metadata || {}
      };
    } catch (error) {
      console.error('[StripeCustomerService] Erro ao buscar cliente:', error);
      throw error;
    }
  }

  /**
   * Atualiza as informações do cliente no Stripe.
   */
  public static async updateCustomer(
    customerId: string, 
    data: Partial<CreateCustomerParams>
  ): Promise<StripeCustomerResponse> {
    const stripe = StripeService.getStripeClient();

    if (!stripe || customerId.startsWith('cus_mock_')) {
      console.log('[StripeCustomerService] [MOCK] Atualizado cliente simulated:', customerId);
      return {
        id: customerId,
        name: data.name || 'Restaurante Simulado',
        email: data.email || 'contato@restaurante.com',
        phone: data.phone || null,
        metadata: { isMock: 'true', ...data.metadata }
      };
    }

    const updated = await stripe.customers.update(customerId, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      metadata: data.metadata
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      metadata: updated.metadata || {}
    };
  }

  /**
   * Remove/desativa o cliente no Stripe.
   */
  public static async deleteCustomer(customerId: string): Promise<{ id: string; deleted: boolean }> {
    const stripe = StripeService.getStripeClient();

    if (!stripe || customerId.startsWith('cus_mock_')) {
      console.log('[StripeCustomerService] [MOCK] Removendo cliente simulated:', customerId);
      return { id: customerId, deleted: true };
    }

    const res = await stripe.customers.del(customerId);
    return { id: res.id, deleted: Boolean(res.deleted) };
  }
}
