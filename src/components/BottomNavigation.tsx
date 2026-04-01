import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { motion } from 'motion/react';
import { useMemo } from 'react';

export default function BottomNavigation() {
  const location = useLocation();
  const totalItems = useCartStore((state) => state.getTotalItems());

  const isAdmin = location.pathname.startsWith('/admin');

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { path: '/admin/clients', icon: 'group', label: 'Cliente' },
        { path: '/admin/sales/new', icon: 'shopping_cart', label: 'Venda' },
        { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { path: '/admin/inventory', icon: 'inventory_2', label: 'Estoque' },
        { path: '/admin/finances', icon: 'payments', label: 'Finanças' },
      ];
    }
    return [
      { path: '/catalog', icon: 'inventory_2', label: 'Produtos' },
      { path: '/menu', icon: 'grid_view', label: 'Kits' },
      { path: '/home', icon: 'home', label: 'Home' },
      { path: '/contact', icon: 'wifi_tethering', label: 'Social' },
      { path: '/checkout', icon: 'shopping_cart', label: 'Sacola', badge: totalItems },
    ];
  }, [totalItems, isAdmin]);

  const activeIndex = navItems.findIndex(item => item.path === location.pathname);
  const safeActiveIndex = activeIndex === -1 ? 2 : activeIndex;

  // SVG Path for the top bar notch
  const notchPath = useMemo(() => {
    const w = 1000;
    const step = w / 5;
    const center = (safeActiveIndex * step) + (step / 2);
    const notchWidth = 80; 
    
    return `
      M 0 0 
      L ${center - notchWidth - 20} 0 
      C ${center - notchWidth + 10} 0, ${center - 45} 45, ${center} 45
      C ${center + 45} 45, ${center + notchWidth - 10} 0, ${center + notchWidth + 20} 0
      L ${w} 0
      L ${w} 15
      L 0 15
      Z
    `;
  }, [safeActiveIndex]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe h-20 bar-fume shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
      {/* Navigation Items */}
      <div className="relative h-full flex items-center justify-around px-2">
        {/* Sliding Active Background Circle */}
        <div className="absolute inset-0 pointer-events-none px-2 flex items-center">
          <motion.div
            initial={false}
            animate={{ x: `${safeActiveIndex * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-[20%] flex justify-center"
          >
            <div className="w-12 h-12 bg-secondary rounded-full shadow-[0_0_20px_rgba(244,192,37,0.3)]" />
          </motion.div>
        </div>

        {navItems.map((item, index) => {
          const isActive = index === safeActiveIndex;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex-1 flex flex-col items-center justify-center h-full tap-highlight-transparent z-10"
              aria-label={item.label}
            >
              <div className="flex flex-col items-center justify-center">
                <motion.span 
                  animate={{ 
                    color: isActive ? 'var(--theme-primary)' : '#94A3B8',
                    scale: isActive ? 1.2 : 1,
                    y: 0 // Centered naturally by flexbox when label is hidden
                  }}
                  className="material-symbols-outlined text-2xl"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </motion.span>
                
                <motion.span 
                  animate={{ 
                    opacity: isActive ? 0 : 1,
                    y: isActive ? 10 : 0,
                    height: isActive ? 0 : 'auto'
                  }}
                  className="text-[10px] uppercase tracking-wider mt-1"
                >
                  {item.label}
                </motion.span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
