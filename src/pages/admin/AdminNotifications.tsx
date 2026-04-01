import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { BellOff, RefreshCw, Trash2, ArrowLeft, Menu } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import NotificationBell from '../../components/NotificationBell';
import MenuButton from '../../components/MenuButton';

interface Notification {
  id: string;
  type: 'stock' | 'debt' | 'vip' | 'info';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  priority: 'high' | 'medium' | 'low';
}

export default function AdminNotifications() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    generateAutomaticAlerts();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback to mock if table doesn't exist yet
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const generateAutomaticAlerts = async (manual = false) => {
    // This logic would normally run on a serverless function, 
    // but we can simulate it here for the demo/initial setup.
    try {
      if (manual) toast.info('Gerando alertas automáticos...');
      
      // 1. Check Low Stock & Out of Stock
      const { data: products } = await supabase
        .from('products')
        .select('name, stock')
        .lte('stock', 2);

      if (products) {
        for (const product of products) {
          if (product.stock === 0) {
            const message = `O produto ${product.name} está ESGOTADO! Reponha o estoque o quanto antes.`;
            await createNotification('stock', 'Produto Esgotado', message, 'high');
          } else {
            const message = `O produto ${product.name} está com apenas ${product.stock} unidade(s) no estoque.`;
            await createNotification('stock', 'Estoque Baixo', message, 'medium');
          }
        }
      }

      // 2. Check Recent Sales (Last 24h)
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      
      const { data: recentSales } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          clients (name)
        `)
        .gte('sale_date', yesterday.toISOString());

      if (recentSales) {
        for (const sale of recentSales) {
          const clientName = Array.isArray(sale.clients) 
            ? sale.clients[0]?.name 
            : (sale.clients as any)?.name;
            
          const message = `Nova venda registrada para ${clientName || 'Cliente'} no valor de R$ ${sale.total_amount.toLocaleString('pt-BR')}.`;
          await createNotification('info', 'Nova Venda', message, 'low');
        }
      }

      // 3. Check Upcoming Debts (Installments)
      const { data: installments } = await supabase
        .from('installments')
        .select(`
          *,
          clients (name, phone)
        `)
        .eq('status', 'pendente');

      if (installments) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (const inst of installments) {
          const clientName = Array.isArray(inst.clients) 
            ? inst.clients[0]?.name 
            : (inst.clients as any)?.name;
            
          const dueDate = new Date(inst.due_date);
          dueDate.setHours(0, 0, 0, 0);
          
          const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            const message = `A cliente ${clientName || 'Cliente'} tem uma parcela de R$ ${inst.amount.toLocaleString('pt-BR')} vencendo amanhã (${new Date(inst.due_date).toLocaleDateString('pt-BR')}).`;
            await createNotification('debt', 'Cobrança Próxima', message, 'high');
          } else if (daysDiff < 0) {
            const message = `A cliente ${clientName || 'Cliente'} está com uma parcela de R$ ${inst.amount.toLocaleString('pt-BR')} ATRASADA (Venceu em ${new Date(inst.due_date).toLocaleDateString('pt-BR')}).`;
            await createNotification('debt', 'Parcela Atrasada', message, 'high');
          }
        }
      }

      // 3. Check Birthdays
      const todayDate = new Date();
      const currentDay = todayDate.getDate();
      const currentMonth = todayDate.getMonth() + 1;

      const { data: birthdayClients } = await supabase
        .from('clients')
        .select('name, phone, birth_day, birth_month')
        .eq('birth_day', currentDay)
        .eq('birth_month', currentMonth);

      if (birthdayClients) {
        for (const client of birthdayClients) {
          const message = `Hoje é aniversário da cliente ${client.name}! Envie o mimo especial via WhatsApp: ${client.phone}.`;
          // Store the phone in the notification metadata if possible, or just parse it from message
          await createNotification('vip', 'Aniversário do Dia', message, 'medium');
        }
      }

      // 4. Check New Clients (Last 48h)
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
      
      const { data: newClients } = await supabase
        .from('clients')
        .select('name')
        .gte('created_at', twoDaysAgo.toISOString());

      if (newClients && newClients.length > 0) {
        for (const client of newClients) {
          const message = `Nova cliente cadastrada: ${client.name}. Que tal enviar uma mensagem de boas-vindas?`;
          await createNotification('info', 'Nova Cliente', message, 'low');
        }
      }

      // 5. General App Messages (System Announcements)
      const welcomeMessage = "Bem-vinda ao painel administrativo Vallechic! Aqui você pode gerenciar suas vendas, estoque e clientes de forma eficiente.";
      await createNotification('info', 'Mensagem do Sistema', welcomeMessage, 'low');

      if (manual) {
        toast.success('Alertas gerados com sucesso!');
        fetchNotifications();
      }
    } catch (error) {
      console.warn('Automatic alerts skipped (tables might not exist):', error);
      if (manual) toast.error('Erro ao gerar alertas.');
    }
  };

  const createNotification = async (type: string, title: string, message: string, priority: string) => {
    try {
      // Check if notification already exists to avoid duplicates (within last 24h)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('message', message)
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .limit(1);

      if (existing && existing.length > 0) return;

      const { error } = await supabase.from('notifications').insert([{
        type, title, message, priority, is_read: false
      }]);
      
      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      toast.success('Notificação lida');
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notificação excluída');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'stock': return 'inventory_2';
      case 'debt': return 'payments';
      case 'vip': return 'star';
      default: return 'info';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-400 bg-rose-400/10';
      case 'medium': return 'text-amber-400 bg-amber-400/10';
      default: return 'text-blue-400 bg-blue-400/10';
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Tem certeza que deseja excluir todas as notificações?')) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      setNotifications([]);
      toast.success('Todas as notificações foram removidas.');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Erro ao limpar notificações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 overflow-y-auto">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-6">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <div className="flex items-center gap-4">
              <Link to="/admin/dashboard" className="text-surface/60 hover:text-secondary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h2 className="font-headline text-xl italic">Notificações <span className="text-secondary">VC</span></h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        <div className="px-5 md:px-10 max-w-5xl mx-auto">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <h2 className="font-headline text-3xl italic mb-1">Alertas & Avisos</h2>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold">Gestão inteligente de mensagens</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => generateAutomaticAlerts(true)}
                className="bg-white/5 text-secondary border border-secondary/20 px-4 py-2.5 rounded-full font-bold uppercase tracking-widest text-[9px] hover:bg-secondary/10 transition-all flex items-center gap-2 active:scale-95"
              >
                <RefreshCw className="w-3 h-3" />
                Atualizar
              </button>
              <button 
                onClick={clearAll}
                className="bg-rose-400/5 text-rose-400 border border-rose-400/20 px-4 py-2.5 rounded-full font-bold uppercase tracking-widest text-[9px] hover:bg-rose-400/10 transition-all flex items-center gap-2 active:scale-95"
              >
                <Trash2 className="w-3 h-3" />
                Limpar
              </button>
            </div>
          </div>

          <div className="mb-6 flex justify-end">
            {notifications.some(n => !n.is_read) && (
              <button 
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('notifications')
                      .update({ is_read: true })
                      .eq('is_read', false);
                    
                    if (error) throw error;
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                    toast.success('Todas as notificações lidas');
                  } catch (error) {
                    toast.error('Erro ao atualizar notificações');
                  }
                }}
                className="text-[10px] uppercase tracking-widest text-secondary font-bold hover:text-secondary/80 transition-colors flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin" />
                <p className="text-[10px] uppercase tracking-widest text-surface/40 font-bold">Carregando alertas...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center glass-card rounded-3xl border border-secondary/10">
                <div className="w-20 h-20 rounded-full bg-secondary/5 flex items-center justify-center mb-6 border border-secondary/10">
                  <BellOff className="w-10 h-10 text-secondary/20" />
                </div>
                <h3 className="text-surface font-headline text-2xl italic mb-2">Tudo em dia!</h3>
                <p className="text-surface/40 text-xs max-w-[240px] leading-relaxed mx-auto">
                  Você não tem notificações pendentes no momento. Relaxe e aproveite!
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`glass-card rounded-2xl p-5 flex gap-4 transition-all border-l-4 ${notification.is_read ? 'opacity-60 border-transparent' : 'border-secondary'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getPriorityColor(notification.priority)}`}>
                    <span className="material-symbols-outlined">{getIcon(notification.type)}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-bold text-lg ${notification.is_read ? 'text-surface/60' : 'text-surface'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-[10px] text-surface/60 uppercase tracking-widest">
                        {format(new Date(notification.created_at), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-surface/60 leading-relaxed mb-4">
                      {notification.message}
                    </p>
                    
                    <div className="flex gap-3">
                      {!notification.is_read && (
                        <button 
                          onClick={() => markAsRead(notification.id)}
                          className="text-[10px] uppercase tracking-widest font-bold text-secondary hover:underline"
                        >
                          Marcar como lida
                        </button>
                      )}
                      {notification.type === 'debt' && (
                        <button 
                          onClick={() => {
                            const message = encodeURIComponent(`Olá! Passando para lembrar da sua parcela na Valle Chic: ${notification.message}`);
                            window.open(`https://wa.me/5532991647440?text=${message}`, '_blank');
                          }}
                          className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 hover:underline"
                        >
                          Enviar WhatsApp
                        </button>
                      )}
                      {notification.type === 'vip' && notification.title === 'Aniversário do Dia' && (
                        <button 
                          onClick={() => {
                            const phone = notification.message.split(': ')[1]?.replace('.', '');
                            const birthdayMsg = `Parabéns e feliz Aniversário! 🎂✨\n\nA equipe Valle Chic passa por aqui para desejar um feliz aniversário! Que seu dia seja tão incrível quanto você.\n\nComo forma de agradecer por sua parceria, hoje você tem um mimo especial te esperando em nossa loja. Fale com a gente para saber mais! 🎁💖`;
                            const message = encodeURIComponent(birthdayMsg);
                            window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                          }}
                          className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 hover:underline"
                        >
                          Enviar Mimo (WA)
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(notification.id)}
                        className="text-[10px] uppercase tracking-widest font-bold text-rose-400 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
