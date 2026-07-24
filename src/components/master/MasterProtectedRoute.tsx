import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MasterProvider } from '../../contexts/MasterContext';
import { Loader2 } from 'lucide-react';

interface MasterProtectedRouteProps {
  children: React.ReactNode;
}

export default function MasterProtectedRoute({ children }: MasterProtectedRouteProps) {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Verificando acesso Master...</p>
        </div>
      </div>
    );
  }

  // Strictly check if user is logged in and has role 'master'
  if (!userProfile || userProfile.role !== 'master') {
    return <Navigate to="/master/login" replace />;
  }

  return (
    <MasterProvider>
      {children}
    </MasterProvider>
  );
}
