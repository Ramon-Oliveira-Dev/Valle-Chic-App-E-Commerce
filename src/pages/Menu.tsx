import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import BottomNavigation from '../components/BottomNavigation';
import Sidebar from '../components/Sidebar';

export default function Menu() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    fetchKits();
  }, []);

  const fetchKits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('published', true)
        .eq('is_kit', true)
        .gt('stock', 0);

      if (error) throw error;
      setKits(data || []);
    } catch (error) {
      console.error('Error fetching kits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="global-bg text-surface font-body min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 flex items-center justify-between px-6 py-4 bar-fume">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="w-10 h-10 rounded-full border border-secondary/20 overflow-hidden flex items-center justify-center bg-primary active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-secondary text-xl">menu</span>
        </button>
        <h1 className="font-headline text-2xl font-bold tracking-tighter text-stone-100 flex items-center gap-0.5">
          <span className="material-symbols-outlined text-xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          <span className="uppercase">vc</span>
        </h1>
        <Link to="/checkout" className="text-surface hover:opacity-80 transition-opacity active:scale-95 duration-150 ease-in-out relative">
          <div className="relative">
            <span className="material-symbols-outlined">shopping_cart</span>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-secondary text-primary text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {totalItems}
              </span>
            )}
          </div>
        </Link>
      </header>

      <main className="pb-32 editorial-gradient min-h-screen max-w-5xl mx-auto px-6 pt-8">
        <div className="mb-10">
          <h2 className="font-headline text-4xl text-surface mb-2">Kits Disponíveis</h2>
          <p className="text-surface/60 text-sm">Explore nossas combinações exclusivas preparadas para você.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
          </div>
        ) : kits.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-3xl">
            <span className="material-symbols-outlined text-6xl text-surface/20 mb-4">inventory_2</span>
            <p className="text-surface/60">Nenhum kit disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {kits.map((kit) => (
              <div key={kit.id} className="glass-card rounded-3xl overflow-hidden group shadow-2xl">
                <Link to={`/product/${kit.id}`} className="block relative aspect-[16/10]">
                  <img 
                    src={kit.image_url || kit.img || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1000&auto=format&fit=crop'} 
                    alt={kit.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent"></div>
                  <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    <span className="bg-secondary/90 text-primary text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">Premium</span>
                    {kit.discount > 0 && (
                      <span className="bg-red-800/90 text-white px-3 py-1 text-[10px] tracking-widest uppercase font-bold rounded-full shadow-lg">-{kit.discount}% OFF</span>
                    )}
                  </div>
                </Link>
                <div className="p-6">
                  <Link to={`/product/${kit.id}`} className="flex justify-between items-start mb-2 group/title">
                    <h3 className="font-headline text-2xl text-surface group-hover/title:text-secondary transition-colors">{kit.name}</h3>
                    <div className="text-right">
                      <p className="text-secondary font-bold text-xl">R$ {kit.sale_price.toLocaleString('pt-BR')}</p>
                      {kit.discount > 0 && (
                        <p className="text-xs text-surface/40 line-through">R$ {((kit.sale_price * 100) / (100 - kit.discount)).toLocaleString('pt-BR')}</p>
                      )}
                    </div>
                  </Link>
                  <p className="text-surface/60 text-sm mb-6 line-clamp-2">{kit.description}</p>
                  <button 
                    onClick={() => addItem({
                      id: kit.id,
                      name: kit.name,
                      price: kit.sale_price,
                      image: kit.image_url || kit.img || ''
                    })}
                    className="w-full py-4 bg-secondary text-primary font-bold uppercase tracking-[0.2em] text-xs rounded-xl hover:bg-secondary/90 transition-all active:scale-[0.98] shadow-lg shadow-secondary/20"
                  >
                    Adicionar à Sacola
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
