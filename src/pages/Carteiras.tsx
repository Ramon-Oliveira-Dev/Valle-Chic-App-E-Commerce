import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import BottomNavigation from '../components/BottomNavigation';
import Sidebar from '../components/Sidebar';
import ProductImage from '../components/ProductImage';
import { productToCartItem } from '../lib/productMetadata';

export default function Carteiras() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [carteiras, setCarteiras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const totalItems = useCartStore((state) => state.getTotalItems());
  
  useEffect(() => {
    fetchCarteiras();
  }, []);

  const fetchCarteiras = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'carteiras')
        .eq('published', true)
        .gt('stock', 0);

      if (error) throw error;
      setCarteiras(data || []);
    } catch (error) {
      console.error('Error fetching carteiras:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="global-bg text-surface font-body min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bar-fume">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-secondary/20 flex items-center justify-center bg-primary active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-secondary text-xl">arrow_back</span>
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 h-10 rounded-full border border-secondary/20 overflow-hidden flex items-center justify-center bg-primary active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-secondary text-xl">menu</span>
          </button>
        </div>
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

      <main className="pb-32 editorial-gradient min-h-screen max-w-5xl mx-auto px-6 pt-24">
        <div className="mb-10">
          <h2 className="font-headline text-4xl text-surface mb-2">Carteiras</h2>
          <p className="text-surface/60 text-sm">Praticidade e elegância em cada detalhe.</p>
        </div>

        {/* Category Navigation (Same as Home) */}
        <div className="flex overflow-x-auto no-scrollbar gap-4 mb-10 pb-2 md:justify-center">
          <Link to="/catalog" className="flex flex-col items-center gap-2 min-w-15">
            <div className="w-14 h-14 rounded-full bg-secondary/5 flex items-center justify-center border border-secondary/5 glass-card">
              <span className="material-symbols-outlined text-secondary/60 text-xl">shopping_bag</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-surface/40">Bolsas</span>
          </Link>
          <Link to="/maletas" className="flex flex-col items-center gap-2 min-w-15">
            <div className="w-14 h-14 rounded-full bg-secondary/5 flex items-center justify-center border border-secondary/5 glass-card">
              <span className="material-symbols-outlined text-secondary/60 text-xl">business_center</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-surface/40">Maletas</span>
          </Link>
          <Link to="/carteiras" className="flex flex-col items-center gap-2 min-w-15">
            <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/5 glass-card active">
              <span className="material-symbols-outlined text-secondary text-xl">wallet</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-surface font-bold">Carteiras</span>
          </Link>
          <Link to="/acessorios" className="flex flex-col items-center gap-2 min-w-15">
            <div className="w-14 h-14 rounded-full bg-secondary/5 flex items-center justify-center border border-secondary/5 glass-card">
              <span className="material-symbols-outlined text-secondary/60 text-xl">styler</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-surface/40">Acessórios</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : carteiras.length > 0 ? carteiras.map((item) => (
            <div key={item.id} className="glass-card rounded-3xl overflow-hidden group shadow-2xl">
              <Link to={`/product/${item.id}`} className="block relative aspect-16/10">
                <ProductImage 
                  src={item.image_url || item.img || 'https://picsum.photos/seed/wallet/800/500'} 
                  alt={item.name}
                  className="transition-opacity duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-linear-to-t from-primary via-transparent to-transparent"></div>
                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                  <span className="bg-secondary/90 text-primary text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">Premium</span>
                  {item.discount > 0 ? (
                    <span className="bg-red-800/90 text-white px-3 py-1 text-[10px] tracking-widest uppercase font-bold rounded-full shadow-lg">-{item.discount}% OFF</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addItem(productToCartItem(
                      item,
                      item.discount > 0
                        ? (item.discounted_price ?? (item.sale_price ? item.sale_price * (1 - item.discount / 100) : item.sale_price))
                        : item.sale_price
                    ));
                  }}
                  disabled={item.stock <= 0}
                  className={`absolute bottom-4 right-4 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-transform duration-200 ${item.stock > 0 ? 'bg-secondary text-primary hover:scale-105' : 'bg-surface/10 text-surface/40 cursor-not-allowed'} border border-secondary/20`}
                >
                  <span className="material-symbols-outlined text-xl">shopping_cart</span>
                </button>
              </Link>
              <div className="p-6">
                <Link to={`/product/${item.id}`} className="flex justify-between items-start mb-2 group/title">
                  <h3 className="font-headline text-2xl text-surface group-hover/title:text-secondary transition-colors">{item.name}</h3>
                  <div className="text-right">
                    <p className="text-secondary font-bold text-xl">
                      R$ {(item.discount > 0
                        ? (item.discounted_price ?? (item.sale_price ? item.sale_price * (1 - item.discount / 100) : item.sale_price)) 
                        : item.sale_price)?.toLocaleString('pt-BR')}
                    </p>
                    {item.discount > 0 && item.sale_price ? (
                      <p className="text-xs text-surface/40 line-through">R$ {item.sale_price.toLocaleString('pt-BR')}</p>
                    ) : null}
                  </div>
                </Link>
                <p className="text-surface/60 text-sm mb-6 leading-relaxed">{item.description}</p>
                <button 
                  onClick={() => addItem(productToCartItem(
                    item,
                    item.discount > 0
                      ? (item.discounted_price ?? (item.sale_price ? item.sale_price * (1 - item.discount / 100) : item.sale_price))
                      : item.sale_price
                  ))}
                  disabled={item.stock <= 0}
                  className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full text-sm font-bold uppercase tracking-[0.2em] transition-all duration-200 ${
                    item.stock > 0
                      ? 'bg-secondary text-primary hover:bg-secondary/90 active:scale-95 shadow-2xl shadow-secondary/20'
                      : 'bg-surface/10 text-surface/40 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined">shopping_cart</span>
                  {item.stock > 0 ? 'Adicionar à Sacola' : 'Esgotado'}
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 text-surface/40 uppercase tracking-widest italic">Nenhuma carteira disponível no momento</div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
