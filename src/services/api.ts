import { supabase } from '../lib/supabase';

export const api = {
  products: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      if (error) throw error;
      return data;
    },
    getStats: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('stock, cost_price');
      if (error) throw error;
      
      const totalStock = data?.reduce((acc, curr) => acc + (curr.stock || 0), 0) || 0;
      const stockValue = data?.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.cost_price || 0)), 0) || 0;
      
      return { totalStock, stockValue };
    },
    getLowStock: async (threshold = 2, limit = 3) => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .lte('stock', threshold)
        .limit(limit);
      if (error) throw error;
      return data;
    }
  },
  clients: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*');
      if (error) throw error;
      return data;
    },
    getBirthdays: async (month: number, limit = 3) => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('birth_month', month)
        .limit(limit);
      if (error) throw error;
      return data;
    }
  },
  sales: {
    getRecent: async (limit = 5) => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients (name)
        `)
        .order('sale_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    getAccountsReceivable: async () => {
      const { data, error } = await supabase
        .from('installments')
        .select('amount')
        .eq('status', 'pendente');
      if (error) throw error;
      
      return data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
    },
    getTotalReceived: async () => {
      const [salesRes, installmentsRes] = await Promise.all([
        supabase.from('sales').select('amount_paid'),
        supabase.from('installments').select('amount').eq('status', 'pago')
      ]);

      if (salesRes.error) throw salesRes.error;
      if (installmentsRes.error) throw installmentsRes.error;

      const salesPaid = salesRes.data?.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0) || 0;
      const installmentsPaid = installmentsRes.data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

      return salesPaid + installmentsPaid;
    }
  }
};
