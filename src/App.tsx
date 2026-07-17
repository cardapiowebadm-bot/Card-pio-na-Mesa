import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CardapioProvider } from './contexts/CardapioContext';
import { Toaster } from 'react-hot-toast';

// Admin / Auth Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AdminLayout from './pages/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminTables from './pages/AdminTables';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminCategories from './pages/AdminCategories';
import AdminCustomers from './pages/AdminCustomers';
import AdminSettings from './pages/AdminSettings';

// Client / Menu Pages
import CardapioLayout from './pages/CardapioLayout';
import CardapioWelcome from './pages/CardapioWelcome';
import CardapioHome from './pages/CardapioHome';
import CardapioCart from './pages/CardapioCart';
import CardapioOrders from './pages/CardapioOrders';

// Protected Route Wrapper for Admin Panel
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-2">
          <span className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Nested Client Menu Routes wrapper to inject CardapioProvider
function ClientMenuWrapper() {
  return (
    <CardapioProvider>
      <Routes>
        {/* Step 1: Welcome page (Form to inform name, table, etc.) */}
        <Route index element={<CardapioWelcome />} />
        
        {/* Step 2: Inner menu pages inside layout */}
        <Route 
          path="home" 
          element={
            <CardapioLayout>
              <CardapioHome />
            </CardapioLayout>
          } 
        />
        <Route 
          path="cart" 
          element={
            <CardapioLayout>
              <CardapioCart />
            </CardapioLayout>
          } 
        />
        <Route 
          path="orders" 
          element={
            <CardapioLayout>
              <CardapioOrders />
            </CardapioLayout>
          } 
        />
      </Routes>
    </CardapioProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" reverseOrder={false} />
        
        <Routes>
          {/* Public / Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Admin Routes with Protections & RBAC */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/tables" 
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminTables />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/orders" 
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminOrders />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/products" 
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminProducts />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/categories" 
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminCategories />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/customers" 
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminCustomers />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminSettings />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />

          {/* Dynamic Customer Menu Routes */}
          <Route path="/menu/:restaurantId/*" element={<ClientMenuWrapper />} />

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
