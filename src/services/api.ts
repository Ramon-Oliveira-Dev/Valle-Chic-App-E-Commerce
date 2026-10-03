import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getFallbackProducts, Product } from '../data/products';

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthday?: string;
  birth_day?: number | null;
  birth_month?: number | null;
  status?: string;
  payment_status?: string;
  purchases?: number;
  total_spent?: number;
  address?: string;
  created_at?: string;
  avatar_url?: string;
  image_url?: string;
  photo_url?: string;
  is_vip?: boolean;
}

export interface NotificationItem {
  id: string;
  created_at: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: string;
}

export interface SystemLog {
  id: string;
  created_at: string;
  action: string;
  details?: string;
  user_email?: string;
  type?: string;
}

export interface FinancialGoals {
  id?: string;
  user_id?: string;
  mes_ano?: string;
  revenueGoal?: number;
  profitGoal?: number;
  workingCapitalPercentage: number;
  profitPercentage: number;
}

const FALLBACK_CLIENTS: Client[] = [
  {
    id: 'cli-1',
    name: 'Ana Carolina Silva',
    phone: '(11) 98765-4321',
    email: 'ana.silva@email.com',
    birthday: '1992-05-14',
    birth_day: new Date().getDate(),
    birth_month: new Date().getMonth() + 1,
    status: 'VIP',
    payment_status: 'Em Dia',
    purchases: 8,
    total_spent: 42500,
    address: 'Av. Paulista, 1000, Apto 42 - São Paulo/SP',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString()
  },
  {
    id: 'cli-2',
    name: 'Mariana Mendonça',
    phone: '(21) 99887-1122',
    email: 'mariana.mendonca@email.com',
    birthday: '1988-11-20',
    birth_day: 20,
    birth_month: 11,
    status: 'Ativo',
    payment_status: 'Em Dia',
    purchases: 4,
    total_spent: 18900,
    address: 'Rua Visconde de Pirajá, 300 - Ipanema, Rio de Janeiro/RJ',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'cli-3',
    name: 'Beatriz Vasconcelos',
    phone: '(31) 97766-5544',
    email: 'beatriz.v@email.com',
    birthday: '1995-03-08',
    birth_day: 8,
    birth_month: 3,
    status: 'Novo',
    payment_status: 'Em Dia',
    purchases: 1,
    total_spent: 4800,
    address: 'Rua Sergipe, 450 - Savassi, Belo Horizonte/MG',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    type: 'estoque',
    title: 'Estoque Baixo',
    message: 'O produto "Bolsa Tote Leather" atingiu o nível crítico (apenas 2 unidades).',
    is_read: false,
    priority: 'high'
  },
  {
    id: 'notif-2',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    type: 'aniversario',
    title: 'Aniversariante do Dia',
    message: 'Ana Carolina Silva está de aniversário hoje! Envie uma mensagem especial.',
    is_read: false,
    priority: 'medium'
  },
  {
    id: 'notif-3',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    type: 'sistema',
    title: 'Sistema Pronto',
    message: 'O catálogo e painel administrativo estão operando perfeitamente.',
    is_read: true,
    priority: 'low'
  }
];

const FALLBACK_LOGS: SystemLog[] = [
  {
    id: 'log-1',
    created_at: new Date().toISOString(),
    action: 'LOGIN_ADMIN',
    details: 'Acesso realizado ao Painel Administrativo.',
    user_email: 'ramon.oliveira.developer@gmail.com',
    type: 'auth'
  },
  {
    id: 'log-2',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    action: 'INVENTORY_CHECK',
    details: 'Verificação periódica de níveis de estoque concluída.',
    user_email: 'sistema',
    type: 'inventory'
  }
];

function getStored<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore localStorage errors
  }
}

export const api = {
  products: {
    getAll: async (): Promise<Product[]> => {
      if (!isSupabaseConfigured) {
        return getStored('vc_products', getFallbackProducts());
      }
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*');
        if (error) {
          return getStored('vc_products', getFallbackProducts());
        }
        return data && data.length > 0 ? data : getStored('vc_products', getFallbackProducts());
      } catch {
        return getStored('vc_products', getFallbackProducts());
      }
    },
    update: async (id: string, updates: Partial<Product>): Promise<Product | null> => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
          if (!error && data) return data;
        } catch {
          // Fallback to local storage update
        }
      }
      const products = getStored<Product[]>('vc_products', getFallbackProducts());
      const updated = products.map(p => p.id === id ? { ...p, ...updates } : p);
      setStored('vc_products', updated);
      return updated.find(p => p.id === id) || null;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
          if (!error) return true;
        } catch {
          // Fallback to local storage
        }
      }
      const products = getStored<Product[]>('vc_products', getFallbackProducts());
      const filtered = products.filter(p => p.id !== id);
      setStored('vc_products', filtered);
      return true;
    },
    create: async (productData: Partial<Product>): Promise<Product> => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('products')
            .insert([productData])
            .select()
            .single();
          if (!error && data) return data;
        } catch {
          // Fallback
        }
      }
      const newProduct: Product = {
        id: `prod_${Date.now()}`,
        name: productData.name || 'Novo Produto',
        price: productData.sale_price || productData.price || 0,
        sale_price: productData.sale_price || productData.price || 0,
        stock: productData.stock || 0,
        brand: productData.brand || 'Valle Chic',
        category: productData.category || 'Geral',
        ...productData
      } as Product;
      const products = getStored<Product[]>('vc_products', getFallbackProducts());
      setStored('vc_products', [newProduct, ...products]);
      return newProduct;
    },
    getStats: async () => {
      if (!isSupabaseConfigured) {
        const fallback = getFallbackProducts();
        const totalStock = fallback.reduce((acc, curr) => acc + (curr.stock || 0), 0);
        const stockValue = fallback.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.cost_price || (curr.price ? curr.price * 0.6 : 0))), 0);
        return { totalStock, stockValue };
      }
      try {
        const { data, error } = await supabase
          .from('products')
          .select('stock, cost_price, price');
        if (error) throw error;
        
        const totalStock = data?.reduce((acc, curr) => acc + (curr.stock || 0), 0) || 0;
        const stockValue = data?.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.cost_price || (curr.price ? curr.price * 0.6 : 0))), 0) || 0;
        
        return { totalStock, stockValue };
      } catch {
        const fallback = getFallbackProducts();
        const totalStock = fallback.reduce((acc, curr) => acc + (curr.stock || 0), 0);
        const stockValue = fallback.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.cost_price || (curr.price ? curr.price * 0.6 : 0))), 0);
        return { totalStock, stockValue };
      }
    },
    getLowStock: async (threshold = 2, limit = 3) => {
      if (!isSupabaseConfigured) {
        return getFallbackProducts().filter(p => (p.stock || 0) <= threshold).slice(0, limit);
      }
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .lte('stock', threshold)
          .limit(limit);
        if (error) throw error;
        return data || [];
      } catch {
        return getFallbackProducts().filter(p => (p.stock || 0) <= threshold).slice(0, limit);
      }
    }
  },
  clients: {
    getAll: async (): Promise<Client[]> => {
      if (!isSupabaseConfigured) {
        return getStored('vc_clients', FALLBACK_CLIENTS);
      }
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*');
        if (error || !data || data.length === 0) {
          return getStored('vc_clients', FALLBACK_CLIENTS);
        }
        return data;
      } catch {
        return getStored('vc_clients', FALLBACK_CLIENTS);
      }
    },
    getBirthdays: async (month: number, limit = 3) => {
      const all = await api.clients.getAll();
      return all.filter(c => c.birth_month === month).slice(0, limit);
    },
    getTodayBirthdays: async () => {
      const all = await api.clients.getAll();
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      return all.filter(c => c.birth_month === month && c.birth_day === day);
    },
    getUpcomingBirthdays: async (days = 7) => {
      const all = await api.clients.getAll();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcoming = all.filter(client => {
        if (!client.birth_month || !client.birth_day) return false;
        let bdayThisYear = new Date(today.getFullYear(), client.birth_month - 1, client.birth_day);
        if (bdayThisYear < today) {
          bdayThisYear = new Date(today.getFullYear() + 1, client.birth_month - 1, client.birth_day);
        }
        const diffTime = bdayThisYear.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= days;
      });
      
      return upcoming.sort((a, b) => {
        let bdayA = new Date(today.getFullYear(), a.birth_month! - 1, a.birth_day!);
        if (bdayA < today) bdayA = new Date(today.getFullYear() + 1, a.birth_month! - 1, a.birth_day!);
        let bdayB = new Date(today.getFullYear(), b.birth_month! - 1, b.birth_day!);
        if (bdayB < today) bdayB = new Date(today.getFullYear() + 1, b.birth_month! - 1, b.birth_day!);
        return bdayA.getTime() - bdayB.getTime();
      });
    },
    update: async (id: string, updates: Partial<Client>): Promise<Client | null> => {
      if (isSupabaseConfigured) {
        try {
          // Clean payload for Supabase
          const cleanUpdates: Record<string, any> = {};
          if (updates.name !== undefined) cleanUpdates.name = updates.name;
          if (updates.phone !== undefined) cleanUpdates.phone = updates.phone;
          if (updates.address !== undefined) cleanUpdates.address = updates.address;
          if (updates.birthday !== undefined) cleanUpdates.birthday = updates.birthday;
          if (updates.birth_day !== undefined) cleanUpdates.birth_day = updates.birth_day;
          if (updates.birth_month !== undefined) cleanUpdates.birth_month = updates.birth_month;
          if (updates.is_vip !== undefined) cleanUpdates.is_vip = updates.is_vip;
          if (updates.payment_status !== undefined) cleanUpdates.payment_status = updates.payment_status;
          if (updates.image_url !== undefined) cleanUpdates.image_url = updates.image_url;
          if (updates.status !== undefined) cleanUpdates.status = updates.status;

          const { data, error } = await supabase
            .from('clients')
            .update(cleanUpdates)
            .eq('id', id)
            .select()
            .maybeSingle();

          if (!error && data) return data;
        } catch {
          // Silently handle fallback
        }
      }
      const clients = getStored<Client[]>('vc_clients', FALLBACK_CLIENTS);
      const updated = clients.map(c => c.id === id ? { ...c, ...updates } : c);
      setStored('vc_clients', updated);
      return updated.find(c => c.id === id) || null;
    },
    delete: async (id: string): Promise<boolean> => {
      if (isSupabaseConfigured) {
        try {
          // Disassociate or clean dependent records to avoid Foreign Key violations (23503)
          try {
            await supabase.from('installments').delete().eq('client_id', id);
          } catch {
            // Ignore if table or column doesn't exist
          }
          try {
            await supabase.from('sales').update({ client_id: null }).eq('client_id', id);
          } catch {
            // Ignore if column doesn't exist
          }

          const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

          if (!error) {
            const clients = getStored<Client[]>('vc_clients', FALLBACK_CLIENTS);
            setStored('vc_clients', clients.filter(c => c.id !== id));
            return true;
          }
        } catch {
          // Fallback to local storage removal below
        }
      }
      const clients = getStored<Client[]>('vc_clients', FALLBACK_CLIENTS);
      const filtered = clients.filter(c => c.id !== id);
      setStored('vc_clients', filtered);
      return true;
    },
    create: async (clientData: Partial<Client>): Promise<Client> => {
      const fallbackId = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const fullClient: Client = {
        id: clientData.id || fallbackId,
        name: clientData.name || 'Novo Cliente',
        phone: clientData.phone || '',
        address: clientData.address || '',
        birthday: clientData.birthday || null as any,
        birth_day: clientData.birth_day !== undefined ? clientData.birth_day : null,
        birth_month: clientData.birth_month !== undefined ? clientData.birth_month : null,
        is_vip: clientData.is_vip || false,
        payment_status: clientData.payment_status || 'Adimplente',
        image_url: clientData.image_url || '',
        status: clientData.status || 'Ativo',
        purchases: clientData.purchases || 0,
        total_spent: clientData.total_spent || 0,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured) {
        try {
          // Try inserting full payload into Supabase
          const { data, error } = await supabase
            .from('clients')
            .insert([{
              name: fullClient.name,
              phone: fullClient.phone,
              address: fullClient.address,
              birthday: fullClient.birthday,
              birth_day: fullClient.birth_day,
              birth_month: fullClient.birth_month,
              is_vip: fullClient.is_vip,
              payment_status: fullClient.payment_status,
              image_url: fullClient.image_url,
              status: fullClient.status,
              purchases: fullClient.purchases
            }])
            .select()
            .maybeSingle();

          if (!error && data) {
            return { ...fullClient, ...data };
          }

          // Fallback minimal insert if extended columns fail
          const { data: minData, error: minError } = await supabase
            .from('clients')
            .insert([{
              name: fullClient.name,
              phone: fullClient.phone,
              birthday: fullClient.birthday,
              status: fullClient.status
            }])
            .select()
            .maybeSingle();

          if (!minError && minData) {
            return { ...fullClient, ...minData };
          }
        } catch {
          // Fallback to local storage below
        }
      }

      // Local storage fallback
      const clients = getStored<Client[]>('vc_clients', FALLBACK_CLIENTS);
      setStored('vc_clients', [fullClient, ...clients]);
      return fullClient;
    }
  },
  notifications: {
    getAll: async (): Promise<NotificationItem[]> => {
      if (!isSupabaseConfigured) {
        return getStored('vc_notifications', FALLBACK_NOTIFICATIONS);
      }
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });
        if (error || !data) {
          return getStored('vc_notifications', FALLBACK_NOTIFICATIONS);
        }
        return data;
      } catch {
        return getStored('vc_notifications', FALLBACK_NOTIFICATIONS);
      }
    },
    getUnreadCount: async (): Promise<number> => {
      const list = await api.notifications.getAll();
      return list.filter(n => !n.is_read).length;
    },
    markAllAsRead: async () => {
      if (isSupabaseConfigured) {
        try {
          await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
        } catch {
          // ignore
        }
      }
      const list = getStored('vc_notifications', FALLBACK_NOTIFICATIONS).map(n => ({ ...n, is_read: true }));
      setStored('vc_notifications', list);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      }
    },
    delete: async (id: string) => {
      if (isSupabaseConfigured) {
        try {
          await supabase.from('notifications').delete().eq('id', id);
        } catch {
          // ignore
        }
      }
      const list = getStored('vc_notifications', FALLBACK_NOTIFICATIONS).filter(n => n.id !== id);
      setStored('vc_notifications', list);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      }
    },
    clearAll: async () => {
      if (isSupabaseConfigured) {
        try {
          await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch {
          // ignore
        }
      }
      setStored('vc_notifications', []);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      }
    },
    insert: async (notif: Partial<NotificationItem>) => {
      const newItem: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        created_at: new Date().toISOString(),
        type: notif.type || 'sistema',
        title: notif.title || 'Notificação',
        message: notif.message || '',
        is_read: false,
        priority: notif.priority || 'medium',
        ...notif
      };
      if (isSupabaseConfigured) {
        try {
          await supabase.from('notifications').insert([newItem]);
        } catch {
          // ignore
        }
      }
      const list = [newItem, ...getStored('vc_notifications', FALLBACK_NOTIFICATIONS)];
      setStored('vc_notifications', list);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      }
      return newItem;
    }
  },
  logs: {
    getAll: async (): Promise<SystemLog[]> => {
      if (!isSupabaseConfigured) {
        return getStored('vc_system_logs', FALLBACK_LOGS);
      }
      try {
        const { data, error } = await supabase
          .from('system_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error || !data || data.length === 0) {
          return getStored('vc_system_logs', FALLBACK_LOGS);
        }
        return data;
      } catch {
        return getStored('vc_system_logs', FALLBACK_LOGS);
      }
    },
    insert: async (action: string, details?: string, type?: string) => {
      const newLog: SystemLog = {
        id: `log-${Date.now()}`,
        created_at: new Date().toISOString(),
        action,
        details,
        user_email: 'ramon.oliveira.developer@gmail.com',
        type: type || 'info'
      };
      if (isSupabaseConfigured) {
        try {
          await supabase.from('system_logs').insert([newLog]);
        } catch {
          // ignore
        }
      }
      const list = [newLog, ...getStored('vc_system_logs', FALLBACK_LOGS)].slice(0, 100);
      setStored('vc_system_logs', list);
    }
  },
  sales: {
    getRecent: async (limit = 5) => {
      let salesList: any[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data: sales, error } = await supabase
            .from('sales')
            .select('*')
            .order('sale_date', { ascending: false })
            .limit(limit);

          if (!error && sales && sales.length > 0) {
            const clientIds = [...new Set(sales.map(s => s.client_id).filter(Boolean))];
            const { data: clients } = clientIds.length > 0
              ? await supabase.from('clients').select('id, name, status').in('id', clientIds)
              : { data: [] };

            const clientsMap = new Map((clients || []).map(c => [c.id, c]));
            salesList = sales.map(s => ({
              ...s,
              clients: clientsMap.get(s.client_id) || null
            }));
          }
        } catch {
          // ignore
        }
      }

      if (salesList.length === 0) {
        const storedSales = getStored<any[]>('vc_sales', []);
        const storedClients = getStored<any[]>('vc_clients', FALLBACK_CLIENTS);
        const clientsMap = new Map(storedClients.map(c => [c.id, c]));
        salesList = storedSales.slice(0, limit).map(s => ({
          ...s,
          clients: clientsMap.get(s.client_id) || s.clients || null
        }));
      }

      return salesList;
    },
    getAccountsReceivable: async () => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('installments')
            .select('amount')
            .eq('status', 'pendente');
          if (!error && data && data.length > 0) {
            return data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
          }
        } catch {
          // Fallback below
        }
      }
      const stored = getStored<any[]>('vc_installments', []);
      return stored.filter(i => i.status === 'pendente').reduce((acc, curr) => acc + (curr.amount || 0), 0);
    },
    getTotalReceived: async () => {
      let total = 0;
      if (isSupabaseConfigured) {
        try {
          const [salesRes, installmentsRes] = await Promise.all([
            supabase.from('sales').select('amount_paid'),
            supabase.from('installments').select('amount').eq('status', 'pago')
          ]);
          const salesPaid = salesRes.data?.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0) || 0;
          const installmentsPaid = installmentsRes.data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
          total = salesPaid + installmentsPaid;
          if (total > 0) return total;
        } catch {
          // ignore
        }
      }
      const storedSales = getStored<any[]>('vc_sales', []);
      const storedInst = getStored<any[]>('vc_installments', []);
      const salesPaid = storedSales.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
      const instPaid = storedInst.filter(i => i.status === 'pago').reduce((acc, curr) => acc + (curr.amount || 0), 0);
      return salesPaid + instPaid;
    }
  },
  debts: {
    getAll: async () => {
      let rawInstallments: any[] = [];
      let isFromSupabase = false;

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('installments')
            .select('*')
            .order('due_date', { ascending: true });

          if (!error && data) {
            rawInstallments = data;
            isFromSupabase = true;
          }
        } catch {
          // Fallback below
        }
      }

      if (!isFromSupabase) {
        rawInstallments = getStored<any[]>('vc_installments', []);
      }

      let installmentsList = rawInstallments || [];
      if (installmentsList.length > 0) {
        const clientIds = [...new Set(installmentsList.map(i => i.client_id).filter(id => Boolean(id) && typeof id === 'string'))];
        const saleIds = [...new Set(installmentsList.map(i => i.sale_id).filter(id => Boolean(id) && typeof id === 'string'))];

        let clientsData: any[] = [];
        let salesData: any[] = [];

        if (clientIds.length > 0 && isSupabaseConfigured) {
          try {
            const { data } = await supabase.from('clients').select('id, name, phone').in('id', clientIds);
            if (data) clientsData = data;
          } catch {}
        }

        if (saleIds.length > 0 && isSupabaseConfigured) {
          try {
            const { data } = await supabase.from('sales').select('id, total_amount, sale_date').in('id', saleIds);
            if (data) salesData = data;
          } catch {}
        }

        const localClients = getStored<any[]>('vc_clients', FALLBACK_CLIENTS);
        const localSales = getStored<any[]>('vc_sales', []);

        const clientsMap = new Map<string, any>([
          ...localClients.map(c => [c.id, c] as [string, any]),
          ...clientsData.map(c => [c.id, c] as [string, any])
        ]);
        const salesMap = new Map<string, any>([
          ...localSales.map(s => [s.id, s] as [string, any]),
          ...salesData.map(s => [s.id, s] as [string, any])
        ]);

        installmentsList = installmentsList.map(item => ({
          ...item,
          clients: clientsMap.get(item.client_id) || null,
          sales: salesMap.get(item.sale_id) || null
        }));
      }

      return installmentsList;
    },
    markAsPaid: async (id: string, clientId?: string) => {
      const now = new Date().toISOString();
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('installments')
            .update({ status: 'pago', paid_at: now })
            .eq('id', id);

          if (clientId) {
            const { data: pending } = await supabase
              .from('installments')
              .select('id')
              .eq('client_id', clientId)
              .eq('status', 'pendente');

            if (!pending || pending.length === 0) {
              await supabase
                .from('clients')
                .update({ payment_status: 'Adimplente' })
                .eq('id', clientId);
            }
          }
        } catch {
          // Fallback below
        }
      }

      const stored = getStored<any[]>('vc_installments', []);
      const updated = stored.map(item =>
        item.id === id ? { ...item, status: 'pago', paid_at: now } : item
      );
      setStored('vc_installments', updated);
      return true;
    }
  },
  goals: {
    get: async (): Promise<FinancialGoals> => {
      const defaultGoals: FinancialGoals = {
        workingCapitalPercentage: 30,
        profitPercentage: 70,
        revenueGoal: 10000,
        profitGoal: 5000
      };

      if (isSupabaseConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const now = new Date();
          const mesAno = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

          if (user) {
            const { data, error } = await supabase
              .from('configuracoes_metas')
              .select('*')
              .eq('user_id', user.id)
              .eq('mes_ano', mesAno)
              .maybeSingle();

            if (!error && data) {
              return {
                workingCapitalPercentage: Number(data.percentual_capital_giro ?? 30),
                profitPercentage: Number(data.percentual_lucro ?? 70),
                revenueGoal: Number(data.faturamento_estimado ?? data.meta_faturamento ?? 10000),
                profitGoal: Number(data.meta_lucro ?? 5000)
              };
            }
          }
        } catch {
          // Fallback to local storage below
        }
      }

      const stored = getStored<FinancialGoals>('vc_goals', defaultGoals);
      return {
        workingCapitalPercentage: Number(stored.workingCapitalPercentage ?? 30),
        profitPercentage: Number(stored.profitPercentage ?? 70),
        revenueGoal: Number(stored.revenueGoal ?? 10000),
        profitGoal: Number(stored.profitGoal ?? 5000)
      };
    },
    save: async (goals: FinancialGoals): Promise<FinancialGoals> => {
      if (isSupabaseConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const now = new Date();
          const mesAno = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

          if (user) {
            const payload = {
              user_id: user.id,
              mes_ano: mesAno,
              faturamento_estimado: goals.revenueGoal ?? 10000,
              meta_faturamento: goals.revenueGoal ?? 10000,
              meta_lucro: goals.profitGoal ?? 5000,
              capital_giro_desejado: (goals.profitGoal || 5000) * (goals.workingCapitalPercentage / 100),
              percentual_capital_giro: goals.workingCapitalPercentage,
              percentual_lucro: goals.profitPercentage,
              updated_at: new Date().toISOString()
            };

            await supabase
              .from('configuracoes_metas')
              .upsert(payload, { onConflict: 'user_id,mes_ano' });
          }
        } catch {
          // Silent fallback
        }
      }

      setStored('vc_goals', goals);
      return goals;
    }
  }
};
