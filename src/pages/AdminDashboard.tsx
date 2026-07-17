import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Order, Table, TableSession } from '../types';
import { 
  TrendingUp, 
  Utensils, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Users, 
  CreditCard,
  ShoppingBag
} from 'lucide-react';

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.restaurantId) return;

    // Load tables
    const qTables = query(collection(db, 'tables'), where('restaurantId', '==', userProfile.restaurantId));
    const unsubTables = onSnapshot(qTables, (snap) => {
      const items: Table[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as Table));
      setTables(items);
    });

    // Load orders of today
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const qOrders = query(
      collection(db, 'orders'), 
      where('restaurantId', '==', userProfile.restaurantId),
      where('createdAt', '>=', startOfToday.toISOString())
    );
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const items: Order[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as Order));
      setOrders(items);
      setLoading(false);
    });

    // Load active sessions
    const qSessions = query(
      collection(db, 'tableSessions'),
      where('restaurantId', '==', userProfile.restaurantId),
      where('status', '==', 'active')
    );
    const unsubSessions = onSnapshot(qSessions, (snap) => {
      const items: TableSession[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as TableSession));
      setSessions(items);
    });

    return () => {
      unsubTables();
      unsubOrders();
      unsubSessions();
    };
  }, [userProfile?.restaurantId]);

  // Compute metrics
  const totalFaturamento = orders.reduce((acc, o) => o.status !== 'pending' ? acc + o.total : acc, 0);
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const preparingOrdersCount = orders.filter(o => o.status === 'preparing' || o.status === 'accepted').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'delivered').length;
  
  const activeTablesCount = tables.filter(t => t.status !== 'free').length;
  const freeTablesCount = tables.filter(t => t.status === 'free').length;

  const ticketMedio = totalOrdersCount > 0 ? totalFaturamento / totalOrdersCount : 0;

  // Most sold items algorithm
  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!itemCounts[item.productId]) {
        itemCounts[item.productId] = { name: item.name, count: 0, revenue: 0 };
      }
      itemCounts[item.productId].count += item.quantity;
      itemCounts[item.productId].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome Title */}
      <div>
        <h2 className="font-display font-bold text-3xl text-slate-800 tracking-tight">Painel de Desempenho</h2>
        <p className="text-slate-500 text-sm mt-1">Acompanhe as comandas, faturamentos e andamento dos pedidos de hoje em tempo real.</p>
      </div>

      {/* Grid of KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1 */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Faturamento de Hoje</span>
            <h3 className="text-2xl font-bold text-slate-800">R$ {totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Pedidos aprovados</span>
            </div>
          </div>
          <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Ticket Médio</span>
            <h3 className="text-2xl font-bold text-slate-800">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <span className="text-slate-400 text-xs font-medium">Por pedido finalizado</span>
          </div>
          <div className="bg-amber-50 text-amber-600 p-4 rounded-2xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Mesas Ativas</span>
            <h3 className="text-2xl font-bold text-slate-800">{activeTablesCount} de {tables.length}</h3>
            <div className="flex items-center gap-1.5 text-rose-600 text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              <span>{freeTablesCount} mesas livres</span>
            </div>
          </div>
          <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl">
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total de Pedidos</span>
            <h3 className="text-2xl font-bold text-slate-800">{totalOrdersCount}</h3>
            <span className="text-slate-400 text-xs font-medium">{deliveredOrdersCount} entregues hoje</span>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Real-time Order Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="bg-red-50 text-red-600 p-3 rounded-2xl shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pendente na Fila</p>
            <h4 className="text-xl font-bold text-slate-800">{pendingOrdersCount} pedidos</h4>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl shrink-0">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Em Preparo</p>
            <h4 className="text-xl font-bold text-slate-800">{preparingOrdersCount} pedidos</h4>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Entregue / Concluído</p>
            <h4 className="text-xl font-bold text-slate-800">{deliveredOrdersCount} pedidos</h4>
          </div>
        </div>

      </div>

      {/* Two-column layout: Best Sellers & Active Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Column 1: Top sold items */}
        <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm">
          <h3 className="font-display font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-500" />
            Produtos Mais Vendidos
          </h3>

          {topProducts.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">Nenhum pedido finalizado hoje para gerar estatísticas.</p>
          ) : (
            <div className="space-y-5">
              {topProducts.map((prod, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-50 text-slate-500 text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-sm text-slate-700">{prod.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-medium">{prod.count} un. vendidos</span>
                    <p className="text-sm font-bold text-slate-800">R$ {prod.revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Active sessions */}
        <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm">
          <h3 className="font-display font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" />
            Clientes Ativos nas Mesas
          </h3>

          {sessions.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">Nenhum cliente ativo nas mesas neste momento.</p>
          ) : (
            <div className="space-y-4 max-h-[280px] overflow-y-auto">
              {sessions.map((sess) => (
                <div key={sess.id} className="flex items-center justify-between p-4 bg-[#fafafa] border border-slate-100 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{sess.customerName}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Mesa {sess.tableNumber} • {sess.customerPhone}</p>
                  </div>
                  <span className="text-xs font-bold bg-rose-50 text-rose-600 px-3 py-1 rounded-full">
                    Ativo
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
