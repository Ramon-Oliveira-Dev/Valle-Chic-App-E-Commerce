import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const toLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
        const todayDate = toLocalDate(new Date());
        const { data: overdue } = await supabase
          .from('installments')
          .select('amount, clients(name)')
          .eq('status', 'pendente')
          .lt('due_date', todayDate);

        if (overdue && overdue.length > 0) {
          toast.error(`${overdue.length} Pagamentos Atrasados`, {
            description: "Verifique a seção de finanças.",
            duration: 6000,
          });
        }

        // 4. Check Payments Due Tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = toLocalDate(tomorrow);

        const { data: dueTomorrow, error: dueTomorrowError } = await supabase
          .from('installments')
          .select('id, amount, due_date, clients(name)')
          .eq('status', 'pendente')
          .eq('due_date', tomorrowDate);

        if (dueTomorrowError) throw dueTomorrowError;

        if (dueTomorrow && dueTomorrow.length > 0) {
          const { data: todayPaymentAlerts } = await supabase
            .from('notifications')
            .select('message')
            .eq('type', 'pagamento')
            .gte('created_at', `${todayDate}T00:00:00`);

          const existingMessages = new Set((todayPaymentAlerts || []).map(alert => alert.message || ''));

          for (const installment of dueTomorrow as any[]) {
            const clientName = installment.clients?.name || 'Cliente';
            const amount = Number(installment.amount || 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            });
            const dueDate = new Date(`${installment.due_date}T00:00:00`).toLocaleDateString('pt-BR');
            const reference = `parcela:${installment.id}`;
            const message = `${clientName} tem pagamento de ${amount} vencendo em ${dueDate}. ${reference}`;

            if (existingMessages.has(message)) continue;

            await supabase.from('notifications').insert([{
              type: 'pagamento',
              title: 'Pagamento vence amanhã',
              message,
              priority: 'high',
              is_read: false
            }]);

            existingMessages.add(message);
          }

          toast.warning(`${dueTomorrow.length} pagamento(s) vencem amanhã`, {
            description: 'Confira os alertas no sino de notificações.',
            duration: 7000,
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
