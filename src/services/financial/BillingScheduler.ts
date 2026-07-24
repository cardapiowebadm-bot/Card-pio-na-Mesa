import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Restaurant } from '../../types';
import { PaymentService } from './PaymentService';
import { FinancialNotificationService } from './FinancialNotificationService';

export interface SchedulerRunResult {
  timestamp: string;
  processedCount: number;
  expiredTrialsCount: number;
  blockedUnpaidCount: number;
  notificationsCount: number;
  errors: string[];
}

export class BillingScheduler {
  private static lastRunTimestamp = 0;
  private static MIN_RUN_INTERVAL_MS = 10 * 1000; // 10 segundos para evitar chamadas redundantes em rajada

  /**
   * Executa todas as tarefas automáticas de ciclo de vida das assinaturas:
   * 1. Verificação e encerramento de Trials
   * 2. Tolerância e bloqueio por Inadimplência (past_due -> unpaid)
   * 3. Emissão de alertas de renovação próxima
   */
  static async runAllAutomations(force = false): Promise<SchedulerRunResult> {
    const nowMs = Date.now();
    if (!force && nowMs - this.lastRunTimestamp < this.MIN_RUN_INTERVAL_MS) {
      return {
        timestamp: new Date().toISOString(),
        processedCount: 0,
        expiredTrialsCount: 0,
        blockedUnpaidCount: 0,
        notificationsCount: 0,
        errors: ['Execução ignorada: intervalo mínimo entre rodadas não atingido (rate-limited)']
      };
    }

    this.lastRunTimestamp = nowMs;
    const nowIso = new Date().toISOString();
    const result: SchedulerRunResult = {
      timestamp: nowIso,
      processedCount: 0,
      expiredTrialsCount: 0,
      blockedUnpaidCount: 0,
      notificationsCount: 0,
      errors: []
    };

    try {
      // 1. Processa Trials
      const trialsRes = await this.checkAndProcessExpiredTrials();
      result.expiredTrialsCount += trialsRes.expiredCount;
      result.notificationsCount += trialsRes.notificationsCount;
      result.processedCount += trialsRes.totalChecked;

      // 2. Processa Inadimplência
      const overdueRes = await this.checkAndProcessOverdueSubscriptions();
      result.blockedUnpaidCount += overdueRes.blockedCount;
      result.notificationsCount += overdueRes.notificationsCount;
      result.processedCount += overdueRes.totalChecked;

      // 3. Processa Alertas de Renovação Próxima
      const renewalsRes = await this.checkAndProcessUpcomingRenewals();
      result.notificationsCount += renewalsRes.notificationsCount;
      result.processedCount += renewalsRes.totalChecked;

    } catch (err: any) {
      console.error('[BillingScheduler] Erro durante execução do Scheduler:', err);
      result.errors.push(err?.message || String(err));
    }

    return result;
  }

  /**
   * Controla e encerra Trials automaticamente quando expiram
   */
  static async checkAndProcessExpiredTrials(): Promise<{ totalChecked: number; expiredCount: number; notificationsCount: number }> {
    let totalChecked = 0;
    let expiredCount = 0;
    let notificationsCount = 0;

    try {
      const snap = await getDocs(collection(db, 'restaurants'));
      const now = new Date();

      for (const d of snap.docs) {
        const rest = { id: d.id, ...d.data() } as Restaurant;
        const isTrial = rest.status === 'trial' || rest.subscriptionStatus === 'trialing' || rest.plan === 'trial';

        if (isTrial) {
          totalChecked++;
          const defaultTrialDays = 14;
          const createdDate = rest.createdAt ? new Date(rest.createdAt).getTime() : now.getTime();
          const trialDurationMs = defaultTrialDays * 24 * 60 * 60 * 1000;
          const trialEndDate = createdDate + trialDurationMs;
          const remainingMs = trialEndDate - now.getTime();
          const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

          if (remainingDays <= 0) {
            // Trial encerrado -> altera status para expired e bloqueia modulos administrativos
            await updateDoc(doc(db, 'restaurants', rest.id), {
              status: 'expired',
              subscriptionStatus: 'expired',
              updatedAt: now.toISOString()
            });

            await PaymentService.logPaymentEvent({
              restaurantId: rest.id,
              restaurantName: rest.name,
              action: 'trial_expired',
              description: 'Período de avaliação gratuita de 14 dias encerrado. Módulos administrativos bloqueados. Dados 100% preservados.',
              performedBy: 'system_scheduler'
            });

            await FinancialNotificationService.createNotification({
              restaurantId: rest.id,
              restaurantName: rest.name,
              type: 'trial_ended',
              title: 'Período de Testes Encerrado',
              message: 'Seu período de testes de 14 dias terminou. Seus dados, produtos e configurações estão 100% preservados. Assine um plano para reativar o acesso ao painel.'
            });

            expiredCount++;
            notificationsCount++;
          } else if (remainingDays <= 3) {
            // Emite alerta preventivo de fim de trial
            await FinancialNotificationService.createNotification({
              restaurantId: rest.id,
              restaurantName: rest.name,
              type: 'trial_ending_soon',
              title: 'Período de Testes Encerrando',
              message: `Seu período de testes de 14 dias se encerra em ${remainingDays} dia(s). Contrate um plano para continuar sem interrupções.`
            });
            notificationsCount++;
          }
        }
      }
    } catch (err) {
      console.error('[BillingScheduler] Erro ao checar trials:', err);
    }

    return { totalChecked, expiredCount, notificationsCount };
  }

  /**
   * Bloqueia restaurantes com assinaturas past_due que ultrapassam o período de tolerância
   */
  static async checkAndProcessOverdueSubscriptions(): Promise<{ totalChecked: number; blockedCount: number; notificationsCount: number }> {
    let totalChecked = 0;
    let blockedCount = 0;
    let notificationsCount = 0;

    try {
      const q = query(collection(db, 'restaurants'), where('subscriptionStatus', '==', 'past_due'));
      const snap = await getDocs(q);
      const now = new Date();

      for (const d of snap.docs) {
        totalChecked++;
        const rest = { id: d.id, ...d.data() } as Restaurant;
        
        // Verifica tolerância (padrão 5 dias)
        const settings = await PaymentService.getPaymentSettings();
        const toleranceDays = settings.defaultDueDays || 5;

        let updatedAtMs = rest.updatedAt ? new Date(rest.updatedAt).getTime() : now.getTime();
        const pastDueDurationMs = now.getTime() - updatedAtMs;
        const pastDueDays = Math.floor(pastDueDurationMs / (24 * 60 * 60 * 1000));

        if (pastDueDays >= toleranceDays) {
          // Ultrapassou a tolerância -> Bloqueia por inadimplência (status = unpaid)
          await updateDoc(doc(db, 'restaurants', rest.id), {
            status: 'unpaid',
            subscriptionStatus: 'unpaid',
            updatedAt: now.toISOString()
          });

          await PaymentService.logPaymentEvent({
            restaurantId: rest.id,
            restaurantName: rest.name,
            action: 'block_unpaid',
            description: `Assinatura bloqueada por inadimplência após ${pastDueDays} dias em atraso (tolerância: ${toleranceDays} dias). Dados preservados.`,
            performedBy: 'system_scheduler'
          });

          await FinancialNotificationService.createNotification({
            restaurantId: rest.id,
            restaurantName: rest.name,
            type: 'subscription_blocked',
            title: 'Acesso Administrativo Bloqueado',
            message: 'Sua assinatura foi bloqueada devido a pagamento pendente exceder o prazo de tolerância. Regularize a fatura para reativar todos os recursos.'
          });

          blockedCount++;
          notificationsCount++;
        } else {
          // Ainda na tolerância -> Alerta de pagamento pendente
          await FinancialNotificationService.createNotification({
            restaurantId: rest.id,
            restaurantName: rest.name,
            type: 'payment_pending',
            title: 'Pagamento Pendente em Tolerância',
            message: `Sua assinatura possui uma cobrança pendente. Você tem ${toleranceDays - pastDueDays} dia(s) de tolerância antes do bloqueio do painel.`
          });
          notificationsCount++;
        }
      }
    } catch (err) {
      console.error('[BillingScheduler] Erro ao checar inadimplência:', err);
    }

    return { totalChecked, blockedCount, notificationsCount };
  }

  /**
   * Notifica sobre renovações próximas
   */
  static async checkAndProcessUpcomingRenewals(): Promise<{ totalChecked: number; notificationsCount: number }> {
    let totalChecked = 0;
    let notificationsCount = 0;

    try {
      const q = query(collection(db, 'restaurants'), where('subscriptionStatus', '==', 'active'));
      const snap = await getDocs(q);
      const now = new Date();

      for (const d of snap.docs) {
        totalChecked++;
        const rest = { id: d.id, ...d.data() } as Restaurant;
        if (rest.nextDueDate) {
          const dueMs = new Date(rest.nextDueDate).getTime();
          const diffMs = dueMs - now.getTime();
          const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

          if (daysLeft >= 0 && daysLeft <= 5) {
            await FinancialNotificationService.createNotification({
              restaurantId: rest.id,
              restaurantName: rest.name,
              type: 'subscription_expiring_soon',
              title: 'Próxima Renovação em Breve',
              message: `Sua assinatura será renovada automaticamente em ${daysLeft} dia(s) (vencimento: ${rest.nextDueDate}).`
            });
            notificationsCount++;
          }
        }
      }
    } catch (err) {
      console.error('[BillingScheduler] Erro ao checar renovações próximas:', err);
    }

    return { totalChecked, notificationsCount };
  }

  /**
   * Reativa o restaurante automaticamente quando o pagamento é confirmado
   */
  static async reactivateRestaurant(restaurantId: string, restaurantName?: string, source = 'stripe_webhook'): Promise<void> {
    try {
      const now = new Date().toISOString();
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 30);

      await updateDoc(doc(db, 'restaurants', restaurantId), {
        status: 'active',
        subscriptionStatus: 'active',
        nextDueDate: nextDue.toISOString().split('T')[0],
        renewalDate: nextDue.toISOString(),
        updatedAt: now
      });

      await PaymentService.logPaymentEvent({
        restaurantId,
        restaurantName: restaurantName || 'Restaurante',
        action: 'unblock_reactivated',
        description: 'Assinatura e acesso ao painel reativados automaticamente após confirmação de pagamento.',
        performedBy: source
      });

      await FinancialNotificationService.createNotification({
        restaurantId,
        restaurantName,
        type: 'subscription_reactivated',
        title: 'Assinatura Reativada!',
        message: 'Seu pagamento foi confirmado com sucesso. Todos os recursos do seu plano foram totalmente liberados.'
      });

      console.log(`[BillingScheduler] Restaurante ${restaurantId} reativado com sucesso.`);
    } catch (err) {
      console.error(`[BillingScheduler] Erro ao reativar restaurante ${restaurantId}:`, err);
    }
  }
}
