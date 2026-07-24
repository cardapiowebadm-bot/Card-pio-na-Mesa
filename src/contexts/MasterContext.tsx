import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Restaurant, UserProfile, RestaurantStatus, MasterPlan, MasterFeature, MasterAuditLog } from '../types';
import { DEFAULT_FEATURES, DEFAULT_PLANS } from '../services/PlanService';
import toast from 'react-hot-toast';

interface MasterStats {
  total: number;
  active: number;
  suspended: number;
  blocked: number;
  trial: number;
  expired: number;
}

interface MasterContextType {
  restaurants: Restaurant[];
  users: UserProfile[];
  plans: MasterPlan[];
  features: MasterFeature[];
  loading: boolean;
  stats: MasterStats;
  fetchMasterData: () => Promise<void>;
  updateRestaurantStatus: (restaurantId: string, status: RestaurantStatus) => Promise<void>;
  updateRestaurantDetails: (restaurantId: string, data: Partial<Restaurant>) => Promise<void>;
  savePlan: (plan: Partial<MasterPlan> & { id: string }) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  saveFeature: (feature: Partial<MasterFeature> & { id: string }) => Promise<void>;
  deleteFeature: (featureId: string) => Promise<void>;
}

const MasterContext = createContext<MasterContextType | undefined>(undefined);

export function useMaster() {
  const context = useContext(MasterContext);
  if (!context) {
    throw new Error('useMaster must be used within a MasterProvider');
  }
  return context;
}

export const MasterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<MasterPlan[]>(DEFAULT_PLANS);
  const [features, setFeatures] = useState<MasterFeature[]>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);

  // Seed default plans and features to Firestore if collections are empty
  const seedDefaultsIfEmpty = async () => {
    try {
      const featSnap = await getDocs(collection(db, 'master_features'));
      if (featSnap.empty) {
        for (const feat of DEFAULT_FEATURES) {
          await setDoc(doc(db, 'master_features', feat.id), {
            ...feat,
            createdAt: new Date().toISOString()
          });
        }
      }

      const planSnap = await getDocs(collection(db, 'master_plans'));
      if (planSnap.empty) {
        for (const plan of DEFAULT_PLANS) {
          await setDoc(doc(db, 'master_plans', plan.id), {
            ...plan,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.warn('Auto-seed default plans/features error or already initialized:', err);
    }
  };

  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    try {
      await seedDefaultsIfEmpty();

      // Fetch restaurants
      const restSnap = await getDocs(collection(db, 'restaurants'));
      const restList: Restaurant[] = restSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Restaurant));

      // Fetch users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList: UserProfile[] = usersSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as UserProfile));

      // Fetch master plans
      const plansSnap = await getDocs(query(collection(db, 'master_plans'), orderBy('order', 'asc')));
      const plansList: MasterPlan[] = plansSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as MasterPlan));

      // Fetch master features
      const featuresSnap = await getDocs(collection(db, 'master_features'));
      const featuresList: MasterFeature[] = featuresSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as MasterFeature));

      // Enrich restaurants
      const enriched = restList.map(r => {
        const owner = usersList.find(u => u.id === r.ownerId || (u.restaurantId === r.id && u.role === 'owner'));
        return {
          ...r,
          ownerName: r.ownerName || owner?.name || 'Não informado',
          ownerEmail: r.ownerEmail || owner?.email || 'Não informado',
          status: r.status || 'active',
          plan: r.plan || 'gourmet'
        };
      });

      setRestaurants(enriched);
      setUsers(usersList);
      if (plansList.length > 0) setPlans(plansList);
      if (featuresList.length > 0) setFeatures(featuresList);
    } catch (err) {
      console.error('Error fetching master data:', err);
      toast.error('Erro ao carregar dados do Painel Master');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Realtime listener for master plans & features
  useEffect(() => {
    const unsubPlans = onSnapshot(collection(db, 'master_plans'), (snap) => {
      if (!snap.empty) {
        const list: MasterPlan[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterPlan));
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setPlans(list);
      }
    });

    const unsubFeatures = onSnapshot(collection(db, 'master_features'), (snap) => {
      if (!snap.empty) {
        const list: MasterFeature[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterFeature));
        setFeatures(list);
      }
    });

    return () => {
      unsubPlans();
      unsubFeatures();
    };
  }, []);

  // Helper for registering audit logs for master actions
  const logMasterAudit = async (
    action: MasterAuditLog['action'],
    description: string,
    targetId: string,
    metadata?: any
  ) => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        timestamp: new Date().toISOString(),
        performedBy: 'master_admin',
        action,
        description,
        targetId,
        metadata: metadata || {}
      });
    } catch (err) {
      console.warn('Erro ao registrar auditoria master:', err);
    }
  };

  const updateRestaurantStatus = async (restaurantId: string, status: RestaurantStatus) => {
    try {
      const restRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(restRef, { status });
      setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, status } : r));
      const statusLabels: Record<RestaurantStatus, string> = {
        active: 'Ativado',
        suspended: 'Suspenso',
        blocked: 'Bloqueado',
        trial: 'Em Teste',
        expired: 'Expirado',
        unpaid: 'Inadimplente'
      };
      await logMasterAudit('restaurant_status_changed', `Status do restaurante ${restaurantId} alterado para ${status}`, restaurantId, { status });
      toast.success(`Restaurante ${statusLabels[status] || status} com sucesso!`);
    } catch (err) {
      console.error('Erro ao atualizar status do restaurante:', err);
      toast.error('Falha ao atualizar status do restaurante.');
      throw err;
    }
  };

  const updateRestaurantDetails = async (restaurantId: string, data: Partial<Restaurant>) => {
    try {
      const restRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(restRef, data);
      setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, ...data } : r));
      await logMasterAudit('restaurant_plan_changed', `Dados/Plano do restaurante ${restaurantId} atualizados`, restaurantId, data);
      toast.success('Dados do restaurante atualizados com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar dados do restaurante:', err);
      toast.error('Falha ao atualizar dados do restaurante.');
      throw err;
    }
  };

  const savePlan = async (planData: Partial<MasterPlan> & { id: string }) => {
    try {
      const planRef = doc(db, 'master_plans', planData.id);
      const payload = {
        ...planData,
        updatedAt: new Date().toISOString()
      };
      await setDoc(planRef, payload, { merge: true });
      await logMasterAudit('plan_updated', `Plano "${planData.name || planData.id}" salvo com limites e recursos`, planData.id, payload);
      toast.success(`Plano "${planData.name || planData.id}" salvo com sucesso!`);
    } catch (err) {
      console.error('Erro ao salvar plano:', err);
      toast.error('Falha ao salvar plano.');
      throw err;
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      await deleteDoc(doc(db, 'master_plans', planId));
      await logMasterAudit('plan_deleted', `Plano ID ${planId} removido`, planId);
      toast.success('Plano removido com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir plano:', err);
      toast.error('Falha ao excluir plano.');
      throw err;
    }
  };

  const saveFeature = async (featureData: Partial<MasterFeature> & { id: string }) => {
    try {
      const featureRef = doc(db, 'master_features', featureData.id);
      const payload = {
        ...featureData,
        updatedAt: new Date().toISOString()
      };
      await setDoc(featureRef, payload, { merge: true });
      await logMasterAudit('feature_saved', `Recurso "${featureData.name || featureData.id}" salvo/alterado`, featureData.id, payload);
      toast.success(`Recurso "${featureData.name || featureData.id}" salvo com sucesso!`);
    } catch (err) {
      console.error('Erro ao salvar recurso:', err);
      toast.error('Falha ao salvar recurso.');
      throw err;
    }
  };

  const deleteFeature = async (featureId: string) => {
    try {
      await deleteDoc(doc(db, 'master_features', featureId));
      await logMasterAudit('feature_deleted', `Recurso ID ${featureId} removido`, featureId);
      toast.success('Recurso removido com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir recurso:', err);
      toast.error('Falha ao excluir recurso.');
      throw err;
    }
  };

  // Calculate platform metrics
  const now = new Date();
  const stats: MasterStats = {
    total: restaurants.length,
    active: restaurants.filter(r => (r.status || 'active') === 'active').length,
    suspended: restaurants.filter(r => r.status === 'suspended').length,
    blocked: restaurants.filter(r => r.status === 'blocked').length,
    trial: restaurants.filter(r => r.status === 'trial' || r.plan === 'trial').length,
    expired: restaurants.filter(r => {
      if (!r.nextDueDate) return false;
      const dueDate = new Date(r.nextDueDate);
      return dueDate < now;
    }).length
  };

  return (
    <MasterContext.Provider value={{
      restaurants,
      users,
      plans,
      features,
      loading,
      stats,
      fetchMasterData,
      updateRestaurantStatus,
      updateRestaurantDetails,
      savePlan,
      deletePlan,
      saveFeature,
      deleteFeature
    }}>
      {children}
    </MasterContext.Provider>
  );
};

