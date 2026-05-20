import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { BellOff, RefreshCw, Trash2, ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import NotificationModal from '../../components/NotificationModal';
import { motion, AnimatePresence } from 'motion/react'; // Pode ser 'framer-motion' dependendo da sua versão

// Interface para o banco de dados
interface DBNotification {
  id: string;
  created_at: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: string;
}

export default function AdminNotifications() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Carregar notificações iniciais
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log("🔍 Buscando notificações no Supabase...");
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro do Supabase ao buscar:', error);
        throw error;
      }
      
      console.log("✅ Dados recebidos do banco:", data);
      setNotifications(data || []);
    } catch (error) {
      console.error('❌ Erro geral ao buscar notificações:', error);
      toast.error('Erro ao carregar notificações.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Configurar Escuta em Tempo Real (Realtime)
  useEffect(() => {
    fetchNotifications();

    console.log("🎧 Iniciando escuta em tempo real (Realtime)...");
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log("🔔 NOVA NOTIFICAÇÃO CHEGOU EM TEMPO REAL!", payload);
          const newNotif = payload.new as DBNotification;
          setNotifications((prev) => [newNotif, ...prev]);
          
          // Feedback visual e sonoro
          toast.success(`Novo Alerta: ${newNotif.title}`, {
            icon: <Bell className="w-4 h-4 text-secondary" />
          });
          new Audio('/notification-sound.mp3').play().catch(() => {
            console.log("Áudio bloqueado pelo navegador até o usuário interagir.");
          });
        }
      )
      .subscribe((status) => {
        console.log("📡 Status da conexão Realtime:", status);
      });

    return () => {
      console.log("🛑 Parando escuta em tempo real...");
      supabase.removeChannel(channel);
    };
  }, []);

  // Mapeamento de Ícones baseado no TYPE do banco
  const getIcon = (type: string) => {
    switch (type?.toLowerCase()) { // Adicionado toLowerCase por segurança
      case 'venda': return <CheckCircle2 className="w-6 h-6" />;
      case 'estoque': return <AlertTriangle className="w-6 h-6" />;
      case 'pagamento': return <AlertTriangle className="w-6 h-6" />;
      case 'erro': return <AlertCircle className="w-6 h-6" />;
      default: return <Info className="w-6 h-6" />;
    }
  };

  // Mapeamento de Cores
  const getCategoryColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'venda': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'erro': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'estoque': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'pagamento': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } else {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Todas as mensagens marcadas como lidas.');
    } else {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const removeNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    } else {
      console.error("Erro ao excluir notificação:", error);
    }
  };

  const confirmClearAll = async () => {
    // Truque válido no Supabase para deletar tudo
    const { error } = await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
    if (!error) {
      setNotifications([]);
      setIsClearModalOpen(false);
      toast.success('Histórico limpo com sucesso.');
    } else {
      console.error("Erro ao limpar tudo:", error);
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-6">
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
            <NotificationSino />
          </div>
        </header>

        <div className="px-5 md:px-10 max-w-5xl mx-auto pt-24">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <h2 className="font-headline text-3xl italic mb-1">Alertas & Avisos</h2>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold">Gestão inteligente de mensagens</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchNotifications}
                disabled={loading}
                className="bg-white/5 text-secondary border border-secondary/20 px-4 py-2.5 rounded-full font-bold uppercase tracking-widest text-[9px] hover:bg-secondary/10 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Atualizando...' : 'Atualizar'}
              </button>
              <button 
                onClick={() => setIsClearModalOpen(true)}
                disabled={notifications.length === 0}
                className="bg-rose-400/5 text-rose-400 border border-rose-400/20 px-4 py-2.5 rounded-full font-bold uppercase tracking-widest text-[9px] hover:bg-rose-400/10 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3 h-3" />
                Limpar
              </button>
            </div>
          </div>

          <div className="mb-6 flex justify-end">
            {notifications.some(n => !n.is_read) && (
              <button 
                onClick={markAllAsRead}
                className="text-[10px] uppercase tracking-widest text-secondary font-bold hover:text-secondary/80 transition-colors flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="space-y-4">
            {notifications.length === 0 && !loading ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center bg-[#0B111D]/90 backdrop-blur-xl rounded-3xl border border-secondary/10 shadow-lg"
              >
                <div className="w-20 h-20 rounded-full bg-secondary/5 flex items-center justify-center mb-6 border border-secondary/10">
                  <BellOff className="w-10 h-10 text-secondary/20" />
                </div>
                <h3 className="text-surface font-headline text-2xl italic mb-2">Tudo em dia!</h3>
                <p className="text-surface/40 text-xs max-w-[240px] leading-relaxed mx-auto">
                  Você não tem notificações pendentes no momento.
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode='popLayout'>
                {notifications.map((notification) => (
                  <motion.div 
                    key={notification.id} 
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-[#0B111D]/90 backdrop-blur-xl rounded-2xl p-5 flex gap-4 transition-all border-l-4 shadow-lg ${
                      notification.is_read 
                        ? 'opacity-60 border-transparent' 
                        : `border-l-secondary shadow-secondary/5`
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${getCategoryColor(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`font-bold text-lg ${notification.is_read ? 'text-surface/60' : 'text-surface'}`}>
                          {notification.title}
                        </h3>
                        <span className="text-[10px] text-surface/60 uppercase tracking-widest whitespace-nowrap ml-4">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-surface/60 leading-relaxed mb-4">
                        {notification.message}
                      </p>
                      
                      <div className="flex gap-4">
                        {!notification.is_read && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="text-[10px] uppercase tracking-widest font-bold text-secondary hover:underline"
                          >
                            Marcar como lida
                          </button>
                        )}
                        <button 
                          onClick={() => removeNotification(notification.id)}
                          className="text-[10px] uppercase tracking-widest font-bold text-rose-400 hover:underline"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      <BottomNavigation />

      <NotificationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Limpar Alertas"
        message="Deseja excluir permanentemente todo o histórico de notificações?"
        type="warning"
        buttonText="Limpar Tudo"
        onConfirm={confirmClearAll}
        showCancel={true}
      />
    </div>
  );
}
