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
    },
    getTodayBirthdays: async () => {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('birth_month', month)
        .eq('birth_day', day);
      if (error) throw error;
      return data;
    },
    getUpcomingBirthdays: async (days = 7) => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .not('birth_month', 'is', null)
        .not('birth_day', 'is', null);
      if (error) throw error;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcoming = data.filter(client => {
        if (!client.birth_month || !client.birth_day) return false;
        
        let bdayThisYear = new Date(today.getFullYear(), client.birth_month - 1, client.birth_day);
        
        if (bdayThisYear < today) {
           bdayThisYear = new Date(today.getFullYear() + 1, client.birth_month - 1, client.birth_day);
        }
        
        const diffTime = bdayThisYear.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays > 0 && diffDays <= days;
      });
      
      // Sort by upcoming date
      return upcoming.sort((a, b) => {
        let bdayA = new Date(today.getFullYear(), a.birth_month! - 1, a.birth_day!);
        if (bdayA < today) bdayA = new Date(today.getFullYear() + 1, a.birth_month! - 1, a.birth_day!);
        
        let bdayB = new Date(today.getFullYear(), b.birth_month! - 1, b.birth_day!);
        if (bdayB < today) bdayB = new Date(today.getFullYear() + 1, b.birth_month! - 1, b.birth_day!);
        
        return bdayA.getTime() - bdayB.getTime();
      });
    }
  },
  sales: {
    getRecent: async (limit = 5) => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients (name, status),
          sale_items (
            quantity,
            unit_price,
            products (
              name,
              image_url
            )
          )
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
