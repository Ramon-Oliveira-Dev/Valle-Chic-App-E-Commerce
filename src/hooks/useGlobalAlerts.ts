import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export function useGlobalAlerts() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkAlerts = async () => {
      try {
        // 1. Check Low Stock
        const { data: products } = await supabase
          .from('products')
          .select('name, stock')
          .lt('stock', 5);

        if (products && products.length > 0) {
          products.forEach(p => {
            toast.warning(`Estoque Baixo: ${p.name}`, {
              description: `Apenas ${p.stock} unidades restantes.`,
              duration: 5000,
            });
          });
        }

        // 2. Check Birthdays
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth() + 1;

        const { data: birthdays } = await supabase
          .from('clients')
          .select('name')
          .eq('birth_day', day)
          .eq('birth_month', month);

        if (birthdays && birthdays.length > 0) {
          birthdays.forEach(c => {
            toast.success(`Aniversariante do Dia: ${c.name}`, {
              description: "Não esqueça de enviar os parabéns!",
              duration: 8000,
            });
          });
        }

        // 3. Check Overdue Payments
        const { data: overdue } = await supabase
          .from('installments')
          .select('amount, clients(name)')
          .eq('status', 'Pendente')
          .lt('due_date', new Date().toISOString().split('T')[0]);

        if (overdue && overdue.length > 0) {
          toast.error(`${overdue.length} Pagamentos Atrasados`, {
            description: "Verifique a seção de finanças.",
            duration: 6000,
          });
        }

      } catch (error) {
        console.error('Error checking global alerts:', error);
      }
    };

    // Check on mount (login)
    checkAlerts();

    // Optionally check periodically (e.g., every hour)
    const interval = setInterval(checkAlerts, 3600000);
    return () => clearInterval(interval);
  }, [user]);
}
