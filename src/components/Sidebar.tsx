import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isNavyTheme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sessão encerrada');
      navigate('/');
    } catch (error) {
      toast.error('Erro ao encerrar sessão');
    }
  };

  const menuItems = isAdmin 
    ? [
        { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
        { name: 'Nova Venda', path: '/admin/sales/new', icon: 'point_of_sale' },
        { name: 'Produtos', path: '/admin/products', icon: 'shopping_bag' },
        { name: 'Clientes', path: '/admin/clients', icon: 'group' },
        { name: 'Estoque', path: '/admin/inventory', icon: 'inventory_2' },
        { name: 'Finanças', path: '/admin/finances', icon: 'payments' },
        { name: 'Notificações', path: '/admin/notifications', icon: 'notifications' },
        { name: 'Logs', path: '/admin/logs', icon: 'terminal' },
      ]
    : [
        { name: 'Início', path: '/home', icon: 'home' },
        { name: 'Catálogo', path: '/catalog', icon: 'grid_view' },
        { name: 'Kits Premium', path: '/menu', icon: 'package_2' },
        { name: 'Contato', path: '/contact', icon: 'chat' },
        { name: 'Sacola', path: '/checkout', icon: 'shopping_cart' },
      ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[280px] bg-[var(--theme-primary)]/70 backdrop-blur-2xl z-[70] border-r border-secondary/10 flex flex-col"
          >
            <div className="p-8 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline text-2xl font-bold text-surface flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  <span className="uppercase italic">VC</span>
                </h2>
                <button onClick={onClose} className="text-surface/60 hover:text-secondary transition-colors active:scale-90">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
                {menuItems.map((item) => (
                  <motion.div
                    key={item.path}
                    whileHover={{ x: 8 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${
                        location.pathname === item.path
                          ? 'bg-secondary text-primary font-bold shadow-lg shadow-secondary/20'
                          : 'text-surface/70 hover:bg-white/5 hover:text-surface'
                      }`}
                    >
                      <span className={`material-symbols-outlined transition-transform duration-300 group-hover:scale-110 ${location.pathname === item.path ? '' : 'text-secondary/60'}`}>
                        {item.icon}
                      </span>
                      <span className="tracking-widest uppercase text-[10px] font-bold">{item.name}</span>
                    </Link>
                  </motion.div>
                ))}

                {!isAdmin && (
                  <motion.div
                    whileHover={{ x: 8 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-2"
                  >
                    <Link
                      to="/admin"
                      onClick={onClose}
                      className="flex items-center gap-4 px-5 py-3 rounded-2xl text-surface/70 hover:bg-white/5 hover:text-surface transition-all duration-300 group"
                    >
                      <span className="material-symbols-outlined text-secondary/60 group-hover:scale-110 transition-transform duration-300">
                        admin_panel_settings
                      </span>
                      <span className="tracking-widest uppercase text-[10px] font-bold">
                        Modo Admin
                      </span>
                    </Link>
                  </motion.div>
                )}
              </nav>

              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-surface/70 hover:bg-white/5 hover:text-surface transition-all duration-300 group border border-white/5"
                  >
                    <span className={`material-symbols-outlined transition-transform duration-300 group-hover:scale-110 ${isNavyTheme ? 'text-blue-400' : 'text-amber-500'}`}>
                      {isNavyTheme ? 'dark_mode' : 'light_mode'}
                    </span>
                    <span className="tracking-widest uppercase text-[10px] font-bold">
                      {isNavyTheme ? 'Tema Navy' : 'Tema Brown'}
                    </span>
                  </button>
                </motion.div>

                {isAdmin && (
                  <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-400/70 hover:bg-rose-400/5 hover:text-rose-400 transition-all duration-300 group border border-rose-400/10"
                    >
                      <span className="material-symbols-outlined text-rose-400/60 group-hover:scale-110 transition-transform duration-300">
                        logout
                      </span>
                      <span className="tracking-widest uppercase text-[10px] font-bold">
                        Sair do Painel
                      </span>
                    </button>
                  </motion.div>
                )}

                <p className="text-[8px] text-surface/20 uppercase tracking-[0.5em] font-medium text-center mt-4">
                  © 2026 VALLECHIC
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
