import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to changes in the notifications table
    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <Link to="/admin/notifications" className="relative group">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 10, 0] } : false}
        animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 10, 0] } : false}
        transition={{ 
          duration: 0.5, 
          repeat: unreadCount > 0 ? Infinity : 0, 
          repeatDelay: 3 
        }}
        className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20"
      >
        <Bell 
          size={20} 
          className={`transition-colors duration-300 ${unreadCount > 0 ? 'text-white' : 'text-[#C5A059] group-hover:text-white'}`}
          strokeWidth={2}
        />
        
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-primary shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
        )}
      </motion.div>
    </Link>
  );
}
