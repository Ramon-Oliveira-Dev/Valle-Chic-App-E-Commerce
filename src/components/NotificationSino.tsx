import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../services/api';

export default function NotificationSino() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotificationsFromDB = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('notifications')
          .select('id')
          .eq('is_read', false);

        if (!error && data) {
          setUnreadCount(data.length);
          return;
        }
      }
      
      const count = await api.notifications.getUnreadCount();
      setUnreadCount(count);
    } catch {
      const count = await api.notifications.getUnreadCount();
      setUnreadCount(count);
    }
  }, []);

  useEffect(() => {
    fetchNotificationsFromDB();

    // Listen to local notifications-updated events
    const handleUpdate = () => {
      fetchNotificationsFromDB();
    };

    window.addEventListener('notifications-updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    // Periodic polling as a reliable backup
    const interval = setInterval(fetchNotificationsFromDB, 5000);

    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('sino-inteligente')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications' },
            () => fetchNotificationsFromDB()
          )
          .subscribe();
      } catch {
        // ignore realtime errors in preview/offline mode
      }
    }

    return () => {
      window.removeEventListener('notifications-updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      clearInterval(interval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchNotificationsFromDB]);

  return (
    <Link 
      to="/admin/notifications" 
      aria-label={`Notificações: ${unreadCount} não lidas`}
      className="relative group block"
    >
      {/* Contêiner Principal: Efeito Glass com Hover */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md border ${
          unreadCount > 0 
            ? 'bg-secondary/15 border-secondary/40 shadow-[0_0_15px_rgba(244,192,37,0.2)]' 
            : 'bg-white/5 border-white/10 group-hover:bg-white/10 group-hover:border-white/20'
        }`}
      >
        {/* Ícone do Sino com animação de balanço contínuo quando há mensagens */}
        <motion.div
          animate={
            unreadCount > 0
              ? {
                  rotate: [0, -20, 18, -16, 14, -8, 4, 0],
                }
              : { rotate: 0 }
          }
          transition={{
            duration: 1.5,
            repeat: unreadCount > 0 ? Infinity : 0,
            repeatDelay: 0.6,
            ease: "easeInOut"
          }}
          style={{ transformOrigin: 'top center' }} 
          className="flex items-center justify-center"
        >
          <Bell 
            size={20} 
            className={`transition-colors duration-300 ${
              unreadCount > 0 ? 'text-secondary drop-shadow-[0_0_8px_rgba(244,192,37,0.6)]' : 'text-surface/60 group-hover:text-surface'
            }`}
            strokeWidth={2}
          />
        </motion.div>
        
        {/* Contador no Sininho com pulso suave */}
        {unreadCount > 0 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-rose-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.8)] border-2 border-[#0B111D]"
          >
            <span className="text-white text-[9px] font-black leading-none tracking-tight">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </motion.div>
        )}
      </motion.div>
    </Link>
  );
}

