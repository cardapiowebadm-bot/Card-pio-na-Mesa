import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { Restaurant, Product, Category, TableSession, Order, OrderItem, WaiterCall } from '../types';

interface CartItem extends OrderItem {
  imageUrl?: string;
}

interface CardapioContextType {
  restaurant: Restaurant | null;
  products: Product[];
  categories: Category[];
  activeTableSession: TableSession | null;
  activeSession: TableSession | null;
  cart: CartItem[];
  sessionOrders: Order[];
  activeCalls: WaiterCall[];
  loading: boolean;
  error: string | null;
  loadRestaurantData: (restaurantId: string) => Promise<void>;
  startSession: (tableNumber: number, customerOrName: { name: string; phone: string; cpf?: string } | string, phone?: string, cpf?: string) => Promise<void>;
  checkoutCart: (itemsWithNotes?: CartItem[]) => Promise<void>;
  checkCustomerByCpf: (cpf: string) => Promise<{ name: string; phone: string } | null>;
  addToCart: (product: Product, quantity?: number, notes?: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  sendOrder: () => Promise<void>;
  callWaiter: (reason: 'water' | 'napkin' | 'service' | 'bill' | 'other') => Promise<void>;
  requestPayment: (method: 'pix' | 'card') => Promise<void>;
  closeSessionLocal: () => void;
}

const CardapioContext = createContext<CardapioContextType | undefined>(undefined);

export function useCardapio() {
  const context = useContext(CardapioContext);
  if (!context) {
    throw new Error('useCardapio must be used within a CardapioProvider');
  }
  return context;
}

export const CardapioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTableSession, setActiveTableSession] = useState<TableSession | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);
  const [activeCalls, setActiveCalls] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read cart and active session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('cardapio_table_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setActiveTableSession(parsed);
      } catch (e) {
        console.error("Error parsing saved session", e);
      }
    }

    const savedCart = localStorage.getItem('cardapio_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error parsing saved cart", e);
      }
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('cardapio_cart', JSON.stringify(cart));
  }, [cart]);

  // Save active session to localStorage when it changes
  useEffect(() => {
    if (activeTableSession) {
      localStorage.setItem('cardapio_table_session', JSON.stringify(activeTableSession));
    } else {
      localStorage.removeItem('cardapio_table_session');
    }
  }, [activeTableSession]);

  // Listen to orders for the active table session
  useEffect(() => {
    if (!activeTableSession) {
      setSessionOrders([]);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('tableSessionId', '==', activeTableSession.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ ...doc.data(), id: doc.id } as Order);
      });
      setSessionOrders(ordersData);
    }, (err) => {
      console.error("Error listening to orders:", err);
    });

    return unsubscribe;
  }, [activeTableSession]);

  // Listen to waiter calls for the active table session
  useEffect(() => {
    if (!activeTableSession) {
      setActiveCalls([]);
      return;
    }

    const q = query(
      collection(db, 'waiterCalls'),
      where('tableSessionId', '==', activeTableSession.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const calls: WaiterCall[] = [];
      snapshot.forEach((doc) => {
        calls.push({ ...doc.data(), id: doc.id } as WaiterCall);
      });
      setActiveCalls(calls);
    });

    return unsubscribe;
  }, [activeTableSession]);

  // Load active table session status from db to keep local status updated
  useEffect(() => {
    if (!activeTableSession) return;

    const docRef = doc(db, 'tableSessions', activeTableSession.id);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as TableSession;
        if (data.status === 'closed') {
          // Admin closed the session, clear local session
          setActiveTableSession(null);
          setCart([]);
          localStorage.removeItem('cardapio_table_session');
          localStorage.removeItem('cardapio_cart');
        } else {
          setActiveTableSession({ ...data, id: snapshot.id });
        }
      }
    });

    return unsubscribe;
  }, [activeTableSession?.id]);

  const loadRestaurantData = async (restaurantId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Load Restaurant
      const restRef = doc(db, 'restaurants', restaurantId);
      const restSnap = await getDoc(restRef);
      if (!restSnap.exists()) {
        throw new Error('Estabelecimento não encontrado');
      }
      const restData = { ...restSnap.data(), id: restaurantId } as Restaurant;
      setRestaurant(restData);

      // Load Categories (ordered by index)
      const catQuery = query(
        collection(db, 'categories'),
        where('restaurantId', '==', restaurantId)
      );
      const catSnap = await getDocs(catQuery);
      const cats: Category[] = [];
      catSnap.forEach((d) => {
        cats.push({ ...d.data(), id: d.id } as Category);
      });
      cats.sort((a, b) => a.index - b.index);
      setCategories(cats);

      // Load Products
      const prodQuery = query(
        collection(db, 'products'),
        where('restaurantId', '==', restaurantId)
      );
      const prodSnap = await getDocs(prodQuery);
      const prods: Product[] = [];
      prodSnap.forEach((d) => {
        prods.push({ ...d.data(), id: d.id } as Product);
      });
      setProducts(prods);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do restaurante');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Automatically load restaurant data when restaurantId changes
  useEffect(() => {
    if (restaurantId && (!restaurant || restaurant.id !== restaurantId)) {
      loadRestaurantData(restaurantId);
    }
  }, [restaurantId, restaurant]);

  const checkCustomerByCpf = async (cpf: string) => {
    if (!restaurant) return null;
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!cleanCpf) return null;

    const q = query(
      collection(db, 'tableSessions'),
      where('restaurantId', '==', restaurant.id),
      where('customerCpf', '==', cleanCpf)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
      // Get the latest one
      const docData = snap.docs[0].data();
      return {
        name: docData.customerName,
        phone: docData.customerPhone
      };
    }
    return null;
  };

  const startSession = async (
    tableNumber: number, 
    customerOrName: { name: string; phone: string; cpf?: string } | string,
    phone?: string,
    cpf?: string
  ) => {
    if (!restaurant) throw new Error('Restaurante não carregado');

    const customer = typeof customerOrName === 'string'
      ? { name: customerOrName, phone: phone || '', cpf }
      : customerOrName;

    setLoading(true);
    try {
      // 1. Create or reference the Table document/status
      const tableId = `${restaurant.id}_table_${tableNumber}`;
      const tableRef = doc(db, 'tables', tableId);
      const tableSnap = await getDoc(tableRef);

      if (!tableSnap.exists()) {
        // Table doesn't exist, create it
        await setDoc(tableRef, {
          id: tableId,
          number: tableNumber,
          status: 'occupied',
          restaurantId: restaurant.id,
          createdAt: new Date().toISOString()
        });
      } else {
        // Update table status to occupied
        await updateDoc(tableRef, { status: 'occupied' });
      }

      // 2. Create a new Table Session
      const sessionRef = doc(collection(db, 'tableSessions'));
      const newSession: TableSession = {
        id: sessionRef.id,
        tableId,
        tableNumber,
        restaurantId: restaurant.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      if (customer.cpf && customer.cpf.trim() !== '') {
        newSession.customerCpf = customer.cpf.replace(/\D/g, '');
      }

      await setDoc(sessionRef, newSession);

      // Create internal notification
      await addDoc(collection(db, 'notifications'), {
        restaurantId: restaurant.id,
        type: 'waiter_call',
        message: `Cliente ${customer.name} abriu atendimento na Mesa ${tableNumber}`,
        status: 'unread',
        referenceId: sessionRef.id,
        tableNumber,
        createdAt: new Date().toISOString()
      });

      setActiveTableSession(newSession);
    } catch (err: any) {
      console.error(err);
      throw new Error('Falha ao iniciar sessão da mesa');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, quantity?: number, notes?: string) => {
    if (product.available === false) return;
    const qty = Math.max(1, typeof quantity === 'number' && !isNaN(quantity) ? quantity : 1);
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id && (item.notes || '') === (notes || ''));
      if (existingIndex > -1) {
        const updated = [...prev];
        const currentQty = Number(updated[existingIndex].quantity) || 0;
        updated[existingIndex].quantity = currentQty + qty;
        return updated;
      } else {
        const itemPrice = product.onSale && product.salePrice ? Number(product.salePrice) : Number(product.price);
        return [...prev, {
          productId: product.id,
          name: product.name,
          price: isNaN(itemPrice) ? 0 : itemPrice,
          quantity: qty,
          notes: notes || '',
          imageUrl: product.imageUrl
        }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    const qty = typeof quantity === 'number' && !isNaN(quantity) ? quantity : 1;
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => prev.map((item) => item.productId === productId ? { ...item, quantity: qty } : item));
  };

  const clearCart = () => {
    setCart([]);
  };

  const sendOrder = async () => {
    if (!restaurant || !activeTableSession || cart.length === 0) return;

    setLoading(true);
    try {
      const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
      const serviceTaxValue = ((restaurant.serviceTax || 10) / 100) * subtotal;
      const total = subtotal + serviceTaxValue;

      const orderRef = doc(collection(db, 'orders'));
      const newOrder: Order = {
        id: orderRef.id,
        tableSessionId: activeTableSession.id,
        tableId: activeTableSession.tableId,
        tableNumber: activeTableSession.tableNumber,
        restaurantId: restaurant.id,
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity),
          notes: item.notes || ''
        })),
        subtotal,
        serviceTax: serviceTaxValue,
        total,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customerName: activeTableSession.customerName,
        customerPhone: activeTableSession.customerPhone
      };

      await setDoc(orderRef, newOrder);

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        restaurantId: restaurant.id,
        type: 'new_order',
        message: `Novo pedido de R$ ${total.toFixed(2)} para a Mesa ${activeTableSession.tableNumber}`,
        status: 'unread',
        referenceId: orderRef.id,
        tableNumber: activeTableSession.tableNumber,
        createdAt: new Date().toISOString()
      });

      // Update table status to pending order
      const tableRef = doc(db, 'tables', activeTableSession.tableId);
      await updateDoc(tableRef, { status: 'occupied' });

      setCart([]);
    } catch (err) {
      console.error(err);
      throw new Error('Falha ao enviar pedido');
    } finally {
      setLoading(false);
    }
  };

  const checkoutCart = async (itemsWithNotes?: CartItem[]) => {
    const activeItems = itemsWithNotes || cart;
    if (!restaurant || !activeTableSession || activeItems.length === 0) return;

    setLoading(true);
    try {
      const subtotal = activeItems.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
      const serviceTaxValue = ((restaurant.serviceTax || 10) / 100) * subtotal;
      const total = subtotal + serviceTaxValue;

      const orderRef = doc(collection(db, 'orders'));
      const newOrder: Order = {
        id: orderRef.id,
        tableSessionId: activeTableSession.id,
        tableId: activeTableSession.tableId,
        tableNumber: activeTableSession.tableNumber,
        restaurantId: restaurant.id,
        items: activeItems.map(item => ({
          productId: item.productId,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity),
          notes: item.notes || ''
        })),
        subtotal,
        serviceTax: serviceTaxValue,
        total,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customerName: activeTableSession.customerName,
        customerPhone: activeTableSession.customerPhone
      };

      await setDoc(orderRef, newOrder);

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        restaurantId: restaurant.id,
        type: 'new_order',
        message: `Novo pedido de R$ ${total.toFixed(2)} para a Mesa ${activeTableSession.tableNumber}`,
        status: 'unread',
        referenceId: orderRef.id,
        tableNumber: activeTableSession.tableNumber,
        createdAt: new Date().toISOString()
      });

      // Update table status to occupied
      const tableRef = doc(db, 'tables', activeTableSession.tableId);
      await updateDoc(tableRef, { status: 'occupied' });

      setCart([]);
    } catch (err) {
      console.error(err);
      throw new Error('Falha ao enviar pedido');
    } finally {
      setLoading(false);
    }
  };

  const callWaiter = async (reason: 'water' | 'napkin' | 'service' | 'bill' | 'other') => {
    if (!restaurant || !activeTableSession) return;

    try {
      const callRef = doc(collection(db, 'waiterCalls'));
      await setDoc(callRef, {
        id: callRef.id,
        tableSessionId: activeTableSession.id,
        tableId: activeTableSession.tableId,
        tableNumber: activeTableSession.tableNumber,
        restaurantId: restaurant.id,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Create notification for admin
      const reasonLabel = {
        water: 'Água',
        napkin: 'Guardanapo',
        service: 'Atendimento',
        bill: 'Conta',
        other: 'Outro'
      }[reason];

      await addDoc(collection(db, 'notifications'), {
        restaurantId: restaurant.id,
        type: 'waiter_call',
        message: `Mesa ${activeTableSession.tableNumber} solicitou ${reasonLabel}`,
        status: 'unread',
        referenceId: callRef.id,
        tableNumber: activeTableSession.tableNumber,
        createdAt: new Date().toISOString()
      });

      // Update table status
      const tableRef = doc(db, 'tables', activeTableSession.tableId);
      await updateDoc(tableRef, { status: 'calling' });

    } catch (err) {
      console.error("Error calling waiter", err);
    }
  };

  const requestPayment = async (method: 'pix' | 'card') => {
    if (!restaurant || !activeTableSession) return;

    try {
      // Update session status to billing
      const sessionRef = doc(db, 'tableSessions', activeTableSession.id);
      await updateDoc(sessionRef, {
        paymentMethod: method,
        paymentStatus: 'pending'
      });

      // Create billing call
      const callRef = doc(collection(db, 'waiterCalls'));
      await setDoc(callRef, {
        id: callRef.id,
        tableSessionId: activeTableSession.id,
        tableId: activeTableSession.tableId,
        tableNumber: activeTableSession.tableNumber,
        restaurantId: restaurant.id,
        reason: 'bill',
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Create notification
      const payLabel = method === 'pix' ? 'PIX' : 'Cartão (Maquininha)';
      await addDoc(collection(db, 'notifications'), {
        restaurantId: restaurant.id,
        type: 'payment_request',
        message: `Mesa ${activeTableSession.tableNumber} solicitou fechamento da conta via ${payLabel}`,
        status: 'unread',
        referenceId: activeTableSession.id,
        tableNumber: activeTableSession.tableNumber,
        createdAt: new Date().toISOString()
      });

      // Update table status
      const tableRef = doc(db, 'tables', activeTableSession.tableId);
      await updateDoc(tableRef, { status: 'billing' });

      // Locally update state
      setActiveTableSession(prev => prev ? { ...prev, paymentMethod: method, paymentStatus: 'pending' } : null);

    } catch (err) {
      console.error("Error requesting payment", err);
    }
  };

  const closeSessionLocal = () => {
    setActiveTableSession(null);
    setCart([]);
    localStorage.removeItem('cardapio_table_session');
    localStorage.removeItem('cardapio_cart');
  };

  return (
    <CardapioContext.Provider value={{
      restaurant,
      products,
      categories,
      activeTableSession,
      activeSession: activeTableSession,
      cart,
      sessionOrders,
      activeCalls,
      loading,
      error,
      loadRestaurantData,
      startSession,
      checkoutCart,
      checkCustomerByCpf,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      sendOrder,
      callWaiter,
      requestPayment,
      closeSessionLocal
    }}>
      {children}
    </CardapioContext.Provider>
  );
};
