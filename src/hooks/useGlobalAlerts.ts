import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { api, NotificationItem } from '../services/api';

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
        const existingNotifications: NotificationItem[] = await api.notifications.getAll();
        const unreadList = existingNotifications.filter(n => !n.is_read);

        // 1. Check Low Stock via safe api silently
        const lowProducts = await api.products.getLowStock(2, 5);
        if (lowProducts && lowProducts.length > 0) {
          for (const p of lowProducts) {
            const alreadyNotified = unreadList.some(
              n => n.type === 'estoque' && n.message.includes(p.name)
            );
            if (!alreadyNotified) {
              await api.notifications.insert({
                type: 'estoque',
                title: `Estoque Baixo: ${p.name}`,
                message: `O produto "${p.name}" possui apenas ${p.stock || 0} unidade(s) restante(s).`,
                priority: 'high'
              });
            }
          }
        }

        // 2. Check Birthdays silently
        const birthdays = await api.clients.getTodayBirthdays();
        if (birthdays && birthdays.length > 0) {
          for (const c of birthdays) {
            const alreadyNotified = unreadList.some(
              n => n.type === 'aniversario' && n.message.includes(c.name)
            );
            if (!alreadyNotified) {
              await api.notifications.insert({
                type: 'aniversario',
                title: 'Aniversariante do Dia',
                message: `${c.name} está completando mais um ano de vida hoje! Aproveite para enviar um mimo ou felicitações.`,
                priority: 'medium'
              });
            }
          }
        }

        // 3. Check Overdue Payments if Supabase is configured
        if (isSupabaseConfigured) {
          const todayDate = toLocalDate(new Date());
          const { data: overdue, error: overdueErr } = await supabase
            .from('installments')
            .select('amount')
            .eq('status', 'pendente')
            .lt('due_date', todayDate);

          if (!overdueErr && overdue && overdue.length > 0) {
            const alreadyNotified = unreadList.some(
              n => n.type === 'pagamento' && n.title.includes('Atraso')
            );
            if (!alreadyNotified) {
              await api.notifications.insert({
                type: 'pagamento',
                title: 'Parcelas em Atraso',
                message: `Existem ${overdue.length} parcela(s) com vencimento expirado no financeiro.`,
                priority: 'high'
              });
            }
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notifications-updated'));
        }
      } catch (error) {
        // Graceful silent recovery to avoid console noise
        console.warn('Silent alerts check error:', error);
      }
    };

    // Check on mount (login)
    checkAlerts();

    // Check periodically (every 15 mins)
    const interval = setInterval(checkAlerts, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);
}

