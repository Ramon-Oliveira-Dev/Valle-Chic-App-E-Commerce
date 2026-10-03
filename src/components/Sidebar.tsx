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
  const { isNavyTheme, toggleTheme, isDesktopSidebarCollapsed, toggleDesktopSidebar } = useTheme();
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

  const adminMenuItems = [
    { name: 'DASHBOARD', path: '/admin/dashboard', icon: 'grid_view' },
    { name: 'VENDAS', path: '/admin/sales', icon: 'point_of_sale' },
    { name: 'ESTOQUE & PROD', path: '/admin/inventory', icon: 'inventory_2' },
    { name: 'CLIENTES', path: '/admin/clients', icon: 'group' },
    { name: 'FINANÇAS', path: '/admin/finances', icon: 'payments' },
    { name: 'NOTIFICAÇÕES', path: '/admin/notifications', icon: 'notifications' },
    { name: 'LOGS', path: '/admin/logs', icon: 'terminal' },
  ];

  const clientMenuItems = [
    { name: 'Início', path: '/home', icon: 'home' },
    { name: 'Catálogo', path: '/catalog', icon: 'grid_view' },
    { name: 'Kits Premium', path: '/menu', icon: 'package_2' },
    { name: 'Contato', path: '/contact', icon: 'chat' },
    { name: 'Sacola', path: '/checkout', icon: 'shopping_cart' },
  ];

  const menuItems = isAdmin ? adminMenuItems : clientMenuItems;

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP NAVBAR (Permanent left sidebar for Admin & Client on large screens) */}
      {/* ========================================================================= */}
      <aside 
        className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-[#060D1A] border-r border-white/5 transition-all duration-300 ease-in-out ${
          isDesktopSidebarCollapsed ? 'w-[76px]' : 'w-[240px]'
        }`}
      >
        <div className="flex flex-col h-full py-6 px-3">
          {/* Brand / Logo Header - Toggles the desktop sidebar expansion */}
          <div className={`flex items-center mb-6 min-h-[44px] ${isDesktopSidebarCollapsed ? 'justify-center' : 'px-2'}`}>
            <button 
              type="button"
              onClick={toggleDesktopSidebar}
              className={`flex items-center gap-2 select-none active:scale-95 transition-transform cursor-pointer focus:outline-none ${
                isDesktopSidebarCollapsed ? 'justify-center' : ''
              }`}
              title={isDesktopSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
            >
              <span 
                className="material-symbols-outlined text-[#F4C025] text-2xl shrink-0" 
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
              {!isDesktopSidebarCollapsed ? (
                <span className="font-serif italic font-black text-xl text-surface tracking-tight whitespace-nowrap">
                  Valle <span className="text-[#F4C025]">Chic</span>
                </span>
              ) : (
                <span className="font-serif italic font-black text-base text-[#F4C025] tracking-tight">
                  VC
                </span>
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar py-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && item.path !== '/home' && item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path)) ||
                (item.path === '/home' && (location.pathname === '/' || location.pathname === '/home'));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.name}
                  className={`group relative flex items-center transition-all duration-200 ${
                    isDesktopSidebarCollapsed 
                      ? 'justify-center w-12 h-12 mx-auto rounded-[16px]' 
                      : 'px-4 py-3 rounded-[16px] gap-3.5 w-full'
                  } ${
                    isActive
                      ? 'bg-[#F4C025] text-white shadow-[0_8px_22px_rgba(244,192,37,0.35)]'
                      : 'text-surface/90 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span 
                    className={`material-symbols-outlined text-[22px] transition-transform group-hover:scale-105 shrink-0 ${
                      isActive ? 'text-white' : 'text-[#F4C025]'
                    }`}
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>

                  {!isDesktopSidebarCollapsed && (
                    <span className={`text-[11px] font-black uppercase tracking-wider truncate ${
                      isActive ? 'text-white' : 'text-white/95'
                    }`}>
                      {item.name}
                    </span>
                  )}

                  {/* Tooltip on Collapsed Mode */}
                  {isDesktopSidebarCollapsed && (
                    <div className="absolute left-full ml-3.5 px-3 py-1.5 bg-[#0B111D] border border-white/10 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="pt-3 mt-2 border-t border-[#182338] space-y-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isNavyTheme ? 'Tema Navy' : 'Tema Brown'}
              className={`group flex items-center transition-all duration-200 bg-[#0B111D] border border-white/5 hover:bg-[#111A2C] ${
                isDesktopSidebarCollapsed
                  ? 'justify-center w-12 h-12 mx-auto rounded-[16px]'
                  : 'px-4 py-3 rounded-[16px] gap-3.5 w-full'
              }`}
            >
              <span className="material-symbols-outlined text-[#38BDF8] text-[20px] shrink-0 transition-transform group-hover:scale-110">
                {isNavyTheme ? 'dark_mode' : 'light_mode'}
              </span>
              {!isDesktopSidebarCollapsed && (
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white truncate">
                  {isNavyTheme ? 'TEMA NAVY' : 'TEMA BROWN'}
                </span>
              )}
            </button>

            {/* Admin / Sign Out Actions */}
            {isAdmin ? (
              <button
                onClick={handleSignOut}
                title="Sair do Painel"
                className={`group flex items-center transition-all duration-200 bg-[#0B111D] border border-rose-500/15 hover:bg-rose-500/10 ${
                  isDesktopSidebarCollapsed
                    ? 'justify-center w-12 h-12 mx-auto rounded-[16px]'
                    : 'px-4 py-3 rounded-[16px] gap-3.5 w-full'
                }`}
              >
                <span className="material-symbols-outlined text-[#FB7185] text-[20px] shrink-0 transition-transform group-hover:scale-110">
                  logout
                </span>
                {!isDesktopSidebarCollapsed && (
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FB7185] truncate">
                    SAIR DO PAINEL
                  </span>
                )}
              </button>
            ) : (
              <Link
                to="/admin"
                title="Modo Admin"
                className={`group flex items-center transition-all duration-200 bg-[#0B111D] border border-[#F4C025]/20 hover:bg-white/5 ${
                  isDesktopSidebarCollapsed
                    ? 'justify-center w-12 h-12 mx-auto rounded-[16px]'
                    : 'px-4 py-3 rounded-[16px] gap-3.5 w-full'
                }`}
              >
                <span className="material-symbols-outlined text-[#F4C025] text-[20px] shrink-0 transition-transform group-hover:scale-110">
                  admin_panel_settings
                </span>
                {!isDesktopSidebarCollapsed && (
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-white truncate">
                    MODO ADMIN
                  </span>
                )}
              </Link>
            )}

            {/* Footer text */}
            {!isDesktopSidebarCollapsed && (
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/30 text-center pt-2">
                © 2026 VALLE CHIC
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER (For mobile / tablet screens or when opened via MenuButton) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] lg:hidden"
            />

            {/* Mobile Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[270px] bg-[#060D1A] z-[70] border-r border-white/5 flex flex-col lg:hidden"
            >
              <div className="p-6 flex flex-col h-full">
                {/* Brand & Close Button */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span 
                      className="material-symbols-outlined text-[#F4C025] text-2xl" 
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      favorite
                    </span>
                    <span className="font-serif italic font-black text-2xl text-[#F4C025] tracking-tight">
                      VC
                    </span>
                  </div>
                  <button 
                    onClick={onClose} 
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-surface/60 hover:text-white transition-colors active:scale-90"
                    aria-label="Fechar menu"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 no-scrollbar">
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.path || (isAdmin && item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={`flex items-center gap-3.5 px-4 py-3 rounded-[16px] transition-all duration-200 ${
                          isActive
                            ? 'bg-[#F4C025] text-white shadow-[0_8px_22px_rgba(244,192,37,0.35)]'
                            : 'text-surface/90 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span 
                          className={`material-symbols-outlined text-[22px] ${isActive ? 'text-white' : 'text-[#F4C025]'}`}
                          style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                        >
                          {item.icon}
                        </span>
                        <span className={`text-[11px] font-black uppercase tracking-wider ${isActive ? 'text-white' : 'text-white/95'}`}>
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}

                  {!isAdmin && (
                    <Link
                      to="/admin"
                      onClick={onClose}
                      className="flex items-center gap-3.5 px-4 py-3 rounded-[16px] text-surface/70 hover:bg-white/5 hover:text-white transition-all duration-200 mt-2"
                    >
                      <span className="material-symbols-outlined text-[#F4C025] text-[22px]">
                        admin_panel_settings
                      </span>
                      <span className="tracking-wider uppercase text-[11px] font-black text-white/90">
                        Modo Admin
                      </span>
                    </Link>
                  )}
                </nav>

                {/* Bottom Actions */}
                <div className="mt-4 pt-4 border-t border-[#182338] space-y-2.5">
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3.5 px-4 py-3 rounded-[16px] bg-[#0B111D] border border-white/5 hover:bg-[#111A2C] transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-[#38BDF8] text-[20px]">
                      {isNavyTheme ? 'dark_mode' : 'light_mode'}
                    </span>
                    <span className="tracking-wider uppercase text-[11px] font-extrabold text-white">
                      {isNavyTheme ? 'TEMA NAVY' : 'TEMA BROWN'}
                    </span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3.5 px-4 py-3 rounded-[16px] bg-[#0B111D] border border-rose-500/15 hover:bg-rose-500/10 transition-all duration-200"
                    >
                      <span className="material-symbols-outlined text-[#FB7185] text-[20px]">
                        logout
                      </span>
                      <span className="tracking-wider uppercase text-[11px] font-extrabold text-[#FB7185]">
                        SAIR DO PAINEL
                      </span>
                    </button>
                  )}

                  <p className="text-[9px] text-white/30 uppercase tracking-[0.25em] font-bold text-center pt-2">
                    © 2026 VALLE CHIC
                  </p>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
