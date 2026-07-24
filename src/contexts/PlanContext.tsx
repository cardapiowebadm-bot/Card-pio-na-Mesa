import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MasterFeature, MasterPlan } from '../types';
import { DEFAULT_FEATURES, DEFAULT_PLANS, PlanService } from '../services/PlanService';
import { useAuth } from './AuthContext';

interface PlanContextType {
  plans: MasterPlan[];
  features: MasterFeature[];
  loading: boolean;
  activePlan: MasterPlan | null;
  isTrial: boolean;
  remainingTrialDays: number;
  hasFeature: (featureId: string) => boolean;
  canAddTable: (currentCount: number) => { allowed: boolean; max: number; planName: string };
  canAddWaiter: (currentCount: number) => { allowed: boolean; max: number; planName: string };
  getMinPlanForFeature: (featureId: string) => MasterPlan | null;
  getFeatureLockMessage: (featureId: string) => string;
  upgradeModalData: { open: boolean; title: string; message: string; featureId?: string } | null;
  openUpgradeModal: (title: string, message: string, featureId?: string) => void;
  closeUpgradeModal: () => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { restaurant } = useAuth();
  const [plans, setPlans] = useState<MasterPlan[]>(DEFAULT_PLANS);
  const [features, setFeatures] = useState<MasterFeature[]>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);

  const [upgradeModalData, setUpgradeModalData] = useState<{ open: boolean; title: string; message: string; featureId?: string } | null>(null);

  useEffect(() => {
    // Realtime subscription for master_plans
    const qPlans = query(collection(db, 'master_plans'), orderBy('order', 'asc'));
    const unsubPlans = onSnapshot(qPlans, (snap) => {
      if (!snap.empty) {
        const loadedPlans: MasterPlan[] = [];
        snap.forEach(d => loadedPlans.push({ id: d.id, ...d.data() } as MasterPlan));
        setPlans(loadedPlans);
      } else {
        setPlans(DEFAULT_PLANS);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Could not load master_plans from firestore, using defaults:', err);
      setPlans(DEFAULT_PLANS);
      setLoading(false);
    });

    // Realtime subscription for master_features
    const qFeatures = query(collection(db, 'master_features'));
    const unsubFeatures = onSnapshot(qFeatures, (snap) => {
      if (!snap.empty) {
        const loadedFeatures: MasterFeature[] = [];
        snap.forEach(d => loadedFeatures.push({ id: d.id, ...d.data() } as MasterFeature));
        setFeatures(loadedFeatures);
      } else {
        setFeatures(DEFAULT_FEATURES);
      }
    }, (err) => {
      console.warn('Could not load master_features from firestore, using defaults:', err);
      setFeatures(DEFAULT_FEATURES);
    });

    return () => {
      unsubPlans();
      unsubFeatures();
    };
  }, []);

  const activePlan = PlanService.getRestaurantPlan(restaurant, plans);
  const isTrial = PlanService.isTrialActive(restaurant);
  const remainingTrialDays = PlanService.getRemainingTrialDays(restaurant);

  const hasFeature = (featureId: string): boolean => {
    return PlanService.hasFeature(restaurant, featureId, plans, features);
  };

  const canAddTable = (currentCount: number) => {
    return PlanService.canAddTable(restaurant, currentCount, plans);
  };

  const canAddWaiter = (currentCount: number) => {
    return PlanService.canAddWaiter(restaurant, currentCount, plans);
  };

  const getMinPlanForFeature = (featureId: string) => {
    return PlanService.getMinPlanForFeature(featureId, plans);
  };

  const getFeatureLockMessage = (featureId: string) => {
    return PlanService.getFeatureLockMessage(featureId, plans);
  };

  const openUpgradeModal = (title: string, message: string, featureId?: string) => {
    setUpgradeModalData({ open: true, title, message, featureId });
  };

  const closeUpgradeModal = () => {
    setUpgradeModalData(null);
  };

  return (
    <PlanContext.Provider value={{
      plans,
      features,
      loading,
      activePlan,
      isTrial,
      remainingTrialDays,
      hasFeature,
      canAddTable,
      canAddWaiter,
      getMinPlanForFeature,
      getFeatureLockMessage,
      upgradeModalData,
      openUpgradeModal,
      closeUpgradeModal
    }}>
      {children}
    </PlanContext.Provider>
  );
};
