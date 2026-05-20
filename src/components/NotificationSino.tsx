import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function NotificationSino() {
  // Variável que guarda a quantidade de notificações não lidas
  const [unreadCount, setUnreadCount] = useState(0);

  // 1. Lógica de Busca de Dados (Mantida, pois já provou estar a funcionar perfeitamente)
  const fetchNotificationsFromDB = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('is_read', false);

      if (error) throw error;

      const totalNaoLidas = data ? data.length : 0;
      setUnreadCount(totalNaoLidas);
    } catch (error) {
      console.error('Erro ao buscar notificações no Sino:', error);
    }
  }, []);

  // 2. Lógica de Tempo Real (Mantida)
  useEffect(() => {
    fetchNotificationsFromDB();

    const channel = supabase
      .channel('sino-inteligente')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotificationsFromDB()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotificationsFromDB]);

  return (
    <Link to="/admin/notifications" className="relative group">
      {/* 3. Contêiner Principal: Cuida apenas do Hover (Aumento ao passar o rato) */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20"
      >
        
        {/* 4. O Ícone do Sino: Isolado em um 'motion.div' apenas para cuidar do balanço */}
        <motion.div
          animate={unreadCount > 0 ? { rotate: [0, -15, 15, -15, 15, 0] } : { rotate: 0 }}
          transition={{
            // Se houver mensagens, repete para sempre com intervalo de 2 segundos.
            // Se não houver, a duração é 0 (fica parado).
            duration: unreadCount > 0 ? 0.6 : 0,
            repeat: unreadCount > 0 ? Infinity : 0,
            repeatDelay: 2,
            ease: "easeInOut"
          }}
          // O segredo do sino real: Eixo de rotação centralizado (originX) e no topo (originY)
          style={{ originX: 0.5, originY: 0 }} 
        >
          <Bell 
            size={20} 
            className={`transition-colors duration-300 ${unreadCount > 0 ? 'text-white' : 'text-[#C5A059] group-hover:text-white'}`}
            strokeWidth={2}
          />
        </motion.div>
        
        {/* 5. A Bolinha Vermelha: Agora ela fica estática enquanto o sino bate dentro do contêiner */}
        {unreadCount > 0 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF4D4D] rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(255,77,77,0.6)] border-2 border-[#0B111D]"
          >
            <span className="text-white text-[9px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </motion.div>
        )}
      </motion.div>
    </Link>
  );
}