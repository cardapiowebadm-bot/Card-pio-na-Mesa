import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { TableSession, Order } from '../types';
import { Search, UserCheck, Calendar, DollarSign, Phone, FileText } from 'lucide-react';

export default function AdminCustomers() {
  const { userProfile } = useAuth();
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.restaurantId) return;

    // Load all table sessions
    const qSessions = query(
      collection(db, 'tableSessions'),
      where('restaurantId', '==', userProfile.restaurantId)
    );

    const unsubscribe = onSnapshot(qSessions, (snap) => {
      const items: TableSession[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as TableSession));
      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSessions(items);
      setLoading(false);
    });

    // Load all orders to calculate total spendings
    const qOrders = query(
      collection(db, 'orders'),
      where('restaurantId', '==', userProfile.restaurantId)
    );
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const items: Order[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as Order));
      setOrders(items);
    });

    return () => {
      unsubscribe();
      unsubOrders();
    };
  }, [userProfile?.restaurantId]);

  // Search filter
  const filteredSessions = sessions.filter(sess => {
    const term = searchTerm.toLowerCase();
    const nameMatch = sess.customerName.toLowerCase().includes(term);
    const phoneMatch = sess.customerPhone.includes(term);
    const cpfMatch = sess.customerCpf?.includes(term) || false;
    return nameMatch || phoneMatch || cpfMatch;
  });

  // Calculate session consumption total
  const getSessionTotal = (sessionId: string) => {
    const sessOrders = orders.filter(o => o.tableSessionId === sessionId);
    return sessOrders.reduce((acc, o) => acc + o.total, 0);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-3xl text-slate-800 tracking-tight">Histórico de Clientes</h2>
        <p className="text-slate-500 text-sm mt-1">Busque clientes por CPF, nome ou telefone e veja o histórico de visitas e consumo acumulado.</p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, telefone ou CPF..."
          className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* History table */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center shadow-sm">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-800 mb-1">Nenhum cliente encontrado</h3>
          <p className="text-slate-500 text-sm">Experimente mudar o termo de busca ou aguarde novas visitas de clientes.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-[#fafafa]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Mesa</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Data / Horário</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Consumido</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-sm text-slate-700">
                {filteredSessions.map((sess) => {
                  const dateObj = new Date(sess.createdAt);
                  const formattedDate = dateObj.toLocaleDateString('pt-BR');
                  const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const totalSpend = getSessionTotal(sess.id);

                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/40 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center font-bold">
                            {sess.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{sess.customerName}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-slate-400 text-xs mt-0.5">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {sess.customerPhone}
                              </span>
                              {sess.customerCpf && (
                                <span className="flex items-center gap-1 font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md text-[10px]">
                                  CPF: {sess.customerCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        Mesa {sess.tableNumber}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formattedDate} • {formattedTime}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                          sess.status === 'active' 
                            ? 'bg-rose-50 text-rose-600 animate-pulse' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {sess.status === 'active' ? 'Ativo na Mesa' : 'Atendimento Fechado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-800">
                        R$ {totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
