import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Table, TableSession, Order, WaiterCall } from '../types';
import { 
  Plus, 
  Trash2, 
  X, 
  CheckCircle, 
  User, 
  Phone, 
  Clock, 
  CreditCard, 
  Coffee, 
  DollarSign, 
  AlertTriangle 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminTables() {
  const { userProfile } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [newTableNum, setNewTableNum] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.restaurantId) return;

    // Load tables
    const qTables = query(collection(db, 'tables'), where('restaurantId', '==', userProfile.restaurantId));
    const unsubTables = onSnapshot(qTables, (snap) => {
      const items: Table[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as Table));
      items.sort((a, b) => a.number - b.number);
      setTables(items);
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

    // Load orders
    const qOrders = query(
      collection(db, 'orders'),
      where('restaurantId', '==', userProfile.restaurantId)
    );
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const items: Order[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as Order));
      setOrders(items);
    });

    // Load waiter calls
    const qCalls = query(
      collection(db, 'waiterCalls'),
      where('restaurantId', '==', userProfile.restaurantId),
      where('status', '==', 'pending')
    );
    const unsubCalls = onSnapshot(qCalls, (snap) => {
      const items: WaiterCall[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as WaiterCall));
      setCalls(items);
    });

    return () => {
      unsubTables();
      unsubSessions();
      unsubOrders();
      unsubCalls();
    };
  }, [userProfile?.restaurantId]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(newTableNum);
    if (!num || isNaN(num)) {
      toast.error('Informe um número válido');
      return;
    }

    // Check if table number already exists
    if (tables.some(t => t.number === num)) {
      toast.error(`A mesa ${num} já existe`);
      return;
    }

    try {
      const tableId = `${userProfile?.restaurantId}_table_${num}`;
      await updateDoc(doc(db, 'tables', tableId), {
        id: tableId,
        number: num,
        status: 'free',
        restaurantId: userProfile?.restaurantId,
        createdAt: new Date().toISOString()
      }).catch(async () => {
        // Doc doesn't exist, set it
        const batch = writeBatch(db);
        batch.set(doc(db, 'tables', tableId), {
          id: tableId,
          number: num,
          status: 'free',
          restaurantId: userProfile?.restaurantId,
          createdAt: new Date().toISOString()
        });
        await batch.commit();
      });

      toast.success(`Mesa ${num} adicionada`);
      setNewTableNum('');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao adicionar mesa');
    }
  };

  const handleDeleteTable = async (table: Table) => {
    if (!window.confirm(`Tem certeza que deseja excluir a Mesa ${table.number}?`)) return;

    try {
      // Set to free first or just write batch delete
      const batch = writeBatch(db);
      batch.delete(doc(db, 'tables', table.id));
      await batch.commit();
      toast.success(`Mesa ${table.number} excluída`);
      if (selectedTable?.id === table.id) {
        setSelectedTable(null);
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao excluir mesa');
    }
  };

  const getTableStatus = (table: Table) => {
    // Priority:
    // 1. Billing requested
    // 2. Waiter calling
    // 3. Occupied (has active session)
    // 4. Free
    const session = sessions.find(s => s.tableId === table.id);
    const hasPendingCall = calls.some(c => c.tableId === table.id);
    
    if (session?.paymentMethod) {
      return 'billing';
    }
    if (hasPendingCall) {
      return 'calling';
    }
    if (session) {
      return 'occupied';
    }
    return 'free';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'billing':
        return 'bg-purple-100 border-purple-300 text-purple-700 ring-2 ring-purple-400 ring-offset-2 animate-pulse';
      case 'calling':
        return 'bg-red-100 border-red-300 text-red-700 ring-2 ring-red-400 ring-offset-2 animate-pulse';
      case 'occupied':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'free':
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'billing': return 'Fechando Conta';
      case 'calling': return 'Chamar Garçom';
      case 'occupied': return 'Mesa Ocupada';
      case 'free': return 'Livre';
      default: return 'Desconhecido';
    }
  };

  // Helper to resolve waiter calls for selected table
  const resolveCalls = async (tableId: string) => {
    const activeTableCalls = calls.filter(c => c.tableId === tableId);
    try {
      for (const call of activeTableCalls) {
        await updateDoc(doc(db, 'waiterCalls', call.id), { status: 'resolved' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Encerra atendimento da mesa (libera)
  const handleCloseSession = async (session: TableSession, tableId: string) => {
    if (!window.confirm('Tem certeza que deseja ENCERRAR a comanda desta mesa? Todos os dados serão consolidados e salvos no histórico.')) return;

    try {
      // 1. Close table session in DB
      await updateDoc(doc(db, 'tableSessions', session.id), {
        status: 'closed',
        closedAt: new Date().toISOString()
      });

      // 2. Resolve any pending waiter calls
      await resolveCalls(tableId);

      // 3. Mark table status as Free
      await updateDoc(doc(db, 'tables', tableId), { status: 'free' });

      toast.success('Atendimento encerrado e mesa liberada!');
      setSelectedTable(null);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao encerrar atendimento');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title & Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl text-slate-800 tracking-tight">Monitor das Mesas</h2>
          <p className="text-slate-500 text-sm mt-1">Acompanhe as comandas, faturamentos e chamados das mesas em tempo real.</p>
        </div>

        {/* Quick Add Table Form */}
        <form onSubmit={handleAddTable} className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={newTableNum}
            onChange={(e) => setNewTableNum(e.target.value)}
            placeholder="Nº da Mesa"
            className="w-28 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </form>
      </div>

      {/* Main Grid: Left is Board of Tables, Right is Table Comanda if selected */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Tables Board Grid */}
        <div className="lg:col-span-2 space-y-6">
          
          {tables.length === 0 ? (
            <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center shadow-sm">
              <Coffee className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-800 mb-1">Nenhuma mesa cadastrada</h3>
              <p className="text-slate-500 text-sm">Adicione sua primeira mesa utilizando o formulário acima para iniciar os atendimentos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {tables.map((table) => {
                const status = getTableStatus(table);
                const colorClass = getStatusColor(status);
                const activeSession = sessions.find(s => s.tableId === table.id);

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`cursor-pointer p-5 rounded-3xl border-2 transition-all flex flex-col justify-between h-40 ${colorClass} ${
                      selectedTable?.id === table.id ? 'ring-4 ring-rose-500/20 border-rose-500 scale-[1.02]' : 'hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-display font-extrabold text-2xl">Mesa {table.number}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table);
                        }}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-all"
                        title="Deletar Mesa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      {activeSession ? (
                        <p className="text-xs font-semibold truncate text-slate-700 mb-1">{activeSession.customerName}</p>
                      ) : (
                        <p className="text-xs font-medium text-slate-400 mb-1">Sem cliente</p>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5">
                        {getStatusLabel(status)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: Comanda da Mesa Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm min-h-[400px]">
          {selectedTable ? (
            (() => {
              const activeSession = sessions.find(s => s.tableId === selectedTable.id);
              const tableOrders = orders.filter(o => o.tableSessionId === activeSession?.id);
              const tableCalls = calls.filter(c => c.tableId === selectedTable.id);

              // Consolidation of products ordered in this session
              const consolidatedItems: Record<string, { name: string; quantity: number; price: number; subtotal: number }> = {};
              let subtotalSum = 0;
              let taxSum = 0;
              let totalSum = 0;

              tableOrders.forEach(o => {
                o.items.forEach(item => {
                  const key = item.productId + '_' + item.price;
                  if (!consolidatedItems[key]) {
                    consolidatedItems[key] = { name: item.name, quantity: 0, price: item.price, subtotal: 0 };
                  }
                  consolidatedItems[key].quantity += item.quantity;
                  consolidatedItems[key].subtotal += item.price * item.quantity;
                });
                subtotalSum += o.subtotal;
                taxSum += o.serviceTax;
                totalSum += o.total;
              });

              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-display font-bold text-xl text-slate-800">Comanda da Mesa {selectedTable.number}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Gestão de consumo em tempo real</p>
                    </div>
                    <button
                      onClick={() => setSelectedTable(null)}
                      className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {activeSession ? (
                    <div className="space-y-6">
                      
                      {/* Customer info */}
                      <div className="bg-[#fafafa] border border-slate-100 p-4 rounded-2xl space-y-2.5">
                        <div className="flex items-center gap-2 text-slate-700 text-sm">
                          <User className="w-4 h-4 text-rose-500" />
                          <span className="font-semibold">{activeSession.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <Phone className="w-4 h-4" />
                          <span>{activeSession.customerPhone}</span>
                        </div>
                        {activeSession.customerCpf && (
                          <div className="text-[10px] text-slate-400 font-semibold uppercase bg-slate-100 px-2 py-0.5 rounded-lg inline-block">
                            CPF: {activeSession.customerCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-400 text-[11px] pt-1 border-t border-slate-100/60">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Início: {new Date(activeSession.createdAt).toLocaleTimeString('pt-BR')}</span>
                        </div>
                      </div>

                      {/* Pending waiter calls */}
                      {tableCalls.length > 0 && (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl space-y-3">
                          <div className="flex items-center gap-2 text-red-800 text-xs font-bold uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4" />
                            Garçom Solicitado!
                          </div>
                          <div className="space-y-1.5">
                            {tableCalls.map(c => (
                              <div key={c.id} className="text-xs text-red-700 flex items-center justify-between">
                                <span>Motivo: <strong className="font-bold uppercase">{c.reason}</strong></span>
                                <button
                                  onClick={async () => {
                                    await updateDoc(doc(db, 'waiterCalls', c.id), { status: 'resolved' });
                                    toast.success('Chamado resolvido');
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-[10px] px-2 py-1 rounded-lg transition-all"
                                >
                                  Resolver
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment requested info */}
                      {activeSession.paymentMethod && (
                        <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-purple-800 text-xs font-bold uppercase tracking-wider">
                            <CreditCard className="w-4 h-4 animate-bounce" />
                            Fechamento Solicitado
                          </div>
                          <p className="text-xs text-purple-700">
                            O cliente solicitou fechar a conta via <strong className="font-extrabold uppercase">{activeSession.paymentMethod}</strong>.
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={async () => {
                                await updateDoc(doc(db, 'tableSessions', activeSession.id), { paymentStatus: 'paid' });
                                toast.success('Pagamento confirmado!');
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg"
                            >
                              Confirmar Pago
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Ordered items listing */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Itens Consumidos</h4>
                        
                        {Object.keys(consolidatedItems).length === 0 ? (
                          <p className="text-slate-400 text-xs py-4 text-center">Nenhum prato pedido nesta sessão ainda.</p>
                        ) : (
                          <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                            {Object.values(consolidatedItems).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-slate-800">{item.name}</p>
                                  <p className="text-[10px] text-slate-400">{item.quantity} un. x R$ {item.price.toFixed(2)}</p>
                                </div>
                                <span className="font-bold text-slate-800">R$ {item.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Summary financials */}
                      <div className="border-t border-slate-100 pt-4 space-y-2">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Subtotal</span>
                          <span>R$ {subtotalSum.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Taxa de Serviço ({userProfile.role !== 'cozinha' ? '10%' : '10%'})</span>
                          <span>R$ {taxSum.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-slate-800 pt-1.5 border-t border-slate-100">
                          <span>TOTAL DA CONTA</span>
                          <span>R$ {totalSum.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Complete checkout button */}
                      <button
                        onClick={() => handleCloseSession(activeSession, selectedTable.id)}
                        className="w-full flex justify-center py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                      >
                        Encerrar Atendimento & Liberar Mesa
                      </button>

                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <p>Esta mesa está livre e sem comandas ativas.</p>
                      <p className="mt-2 text-[10px]">O cliente iniciará a comanda digital ao escanear o QR Code.</p>
                    </div>
                  )}

                </div>
              );
            })()
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400">
              <Coffee className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-xs">Selecione uma mesa ativa no tabuleiro ao lado para gerenciar sua comanda em tempo real.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
