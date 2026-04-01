import { Link } from 'react-router-dom';
import React, { useEffect, useRef, useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import BottomNavigation from '../components/BottomNavigation';
import Sidebar from '../components/Sidebar';

export default function Home() {
  const autoCarouselRef = useRef<HTMLDivElement>(null);
  const manualCarouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<Set<string>>(new Set(['bolsas'])); // Default to bolsas
  const addItem = useCartStore((state) => state.addItem);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      
      // Fetch available categories
      const { data: catData } = await supabase
        .from('products')
        .select('category')
        .eq('published', true)
        .gt('stock', 0);
      
      if (catData) {
        const cats = new Set(catData.map(p => p.category?.toLowerCase()));
        // Always include 'bolsas' if it has products or as a default if we want
        setAvailableCategories(cats);
      }

      // Fetch featured products
      const { data: featured, error: featuredError } = await supabase
        .from('products')
        .select('*')
        .eq('published', true)
        .eq('featured', true)
        .gt('stock', 0)
        .limit(10);

      if (featuredError) throw featuredError;
      setFeaturedProducts(featured || []);

      // Fetch kits
      const { data: kitsData, error: kitsError } = await supabase
        .from('products')
        .select('*')
        .eq('published', true)
        .eq('is_kit', true)
        .eq('featured', true)
        .gt('stock', 0)
        .limit(5);

      if (!kitsError) setKits(kitsData || []);

    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!manualCarouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - manualCarouselRef.current.offsetLeft);
    setScrollLeft(manualCarouselRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !manualCarouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - manualCarouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    manualCarouselRef.current.scrollLeft = scrollLeft - walk;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (autoCarouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = autoCarouselRef.current;
        const firstChild = autoCarouselRef.current.firstElementChild as HTMLElement;
        const scrollAmount = firstChild ? firstChild.offsetWidth + 20 : clientWidth * 0.85 + 20;
        
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          autoCarouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          autoCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="global-bg text-surface font-body selection:bg-secondary/30 min-h-screen">
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

      <main className="pb-24 editorial-gradient min-h-screen max-w-5xl mx-auto">
        {/* Hero Banner */}
        <section className="px-4 pt-4">
          <div className="relative aspect-[3/4.5] sm:aspect-[16/9] md:aspect-[21/9] w-full rounded-xl overflow-hidden group">
            <img 
              className="w-full h-full object-cover" 
              alt="A Nova Coleção 2026" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlDxC3H4NbgCyenQONl6hvhc0_EWPHLUgeiYFbdDGqUHgdQ2e2TtAuTdwdSP_61fLL4HDUmgpljYk16nLuEp6lZIQNuEVxzrwABBNQmDgdNcy7y1bv3q2e6i43l7l82o2zgyESpzM07R4IJ_WK-_csyzhfW-G4J8AA0v3619PIQAi3KFeS2oQFKv0H5L9lVSqRAl9HgzX9MfszU_kywKF3iTE6t8M2puL6BMHxlcy7zqff14cQRsP6wTdSFW7cmUTJQLNEqVYR5yg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent"></div>
            <div className="absolute bottom-8 left-8 right-8">
              <h2 className="font-headline italic text-4xl text-surface leading-tight">A Nova Coleção 2026</h2>
            </div>
          </div>
        </section>

        {/* Search Bar */}
        <section className="px-6 my-8">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary/40 text-xl">search</span>
            <input 
              className="w-full bg-primary/40 backdrop-blur-md border border-secondary/10 rounded-full py-3 pl-12 pr-6 text-sm text-surface placeholder:text-secondary/30 focus:outline-none focus:border-secondary/30 transition-colors" 
              placeholder="Qual estilo você procura?" 
              type="text"
            />
          </div>
        </section>

        {/* Product Categories */}
        <section className="mb-10">
          <div className="flex overflow-x-auto no-scrollbar gap-4 px-6 md:justify-center">
            <Link to="/catalog" className="flex flex-col items-center gap-2 min-w-[60px]">
              <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/5 glass-card">
                <span className="material-symbols-outlined text-secondary text-xl">shopping_bag</span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.15em] text-surface/70">Bolsas</span>
            </Link>
            
            {availableCategories.has('maletas') && (
              <Link to="/maletas" className="flex flex-col items-center gap-2 min-w-[60px]">
                <div className="w-14 h-14 rounded-full bg-secondary/5 flex items-center justify-center border border-secondary/5 glass-card">
                  <span className="material-symbols-outlined text-secondary/60 text-xl">business_center</span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.15em] text-surface/40">Maletas</span>
              </Link>
            )}

            {availableCategories.has('carteiras') && (
              <Link to="/carteiras" className="flex flex-col items-center gap-2 min-w-[60px]">
                <div className="w-14 h-14 rounded-full bg-secondary/5 flex items-center justify-center border border-secondary/5 glass-card">
                  <span className="material-symbols-outlined text-secondary/60 text-xl">wallet</span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.15em] text-surface/40">Carteiras</span>
              </Link>
            )}

            {availableCategories.has('acessorios') && (
              <Link to="/acessorios" className="flex flex-col items-center gap-2 min-w-[60px]">
                <div className="w-14 h-14 rounded-full bg-secondary/5 flex items-center justify-center border border-secondary/5 glass-card">
                  <span className="material-symbols-outlined text-secondary/60 text-xl">diamond</span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.15em] text-surface/40">Acessórios</span>
              </Link>
            )}
          </div>
        </section>

        {/* Kits Exclusivos Carousel */}
        <section className="mb-12">
          <div className="px-6 flex justify-between items-baseline mb-6">
            <h4 className="font-headline text-2xl text-surface">Kits Exclusivos</h4>
            <Link to="/catalog" className="text-[10px] uppercase tracking-widest text-secondary font-semibold">Descobrir</Link>
          </div>
          <div ref={autoCarouselRef} className="flex overflow-x-auto no-scrollbar gap-5 px-6 pb-2 snap-x snap-mandatory">
            {loading ? (
              <div className="w-[85vw] aspect-[16/10] bg-primary/20 rounded-2xl animate-pulse"></div>
            ) : kits.length > 0 ? kits.map((kit) => (
              <div key={kit.id} className="w-[85vw] sm:w-[450px] md:w-[500px] relative rounded-2xl overflow-hidden aspect-[16/10] group shrink-0 snap-center glass-card">
                <Link to={`/product/${kit.id}`}>
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt={kit.name} 
                    src={kit.image_url || kit.img || 'https://picsum.photos/seed/kit/800/500'}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-transparent"></div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-secondary/90 text-primary text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Conjunto Premium</span>
                  </div>
                </Link>
                <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
                  <Link to={`/product/${kit.id}`}>
                    <h5 className="text-lg font-headline text-surface leading-tight hover:text-secondary transition-colors">{kit.name}</h5>
                    <div className="flex items-center gap-2">
                      <p className="text-secondary font-medium">R$ {(kit.discount && kit.discount > 0 ? kit.discounted_price : kit.sale_price)?.toLocaleString('pt-BR')}</p>
                      {kit.discount && kit.discount > 0 && (
                        <p className="text-xs text-surface/40 line-through">R$ {kit.sale_price?.toLocaleString('pt-BR')}</p>
                      )}
                    </div>
                  </Link>
                  <button 
                    onClick={() => addItem({ id: kit.id, name: kit.name, price: kit.discount && kit.discount > 0 ? kit.discounted_price : kit.sale_price, image: kit.image_url || kit.img })}
                    className="bg-surface text-primary w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-lg">shopping_cart</span>
                  </button>
                </div>
              </div>
            )) : (
              <div className="px-6 py-10 text-surface/40 text-xs uppercase tracking-widest italic">Nenhum kit disponível no momento</div>
            )}
          </div>
        </section>

        {/* Selected For You */}
        <section className="mb-12">
          <div className="px-6 flex justify-between items-baseline mb-6">
            <h4 className="font-headline text-2xl text-surface">Selecionados para você</h4>
            <Link to="/catalog" className="text-[10px] uppercase tracking-widest text-secondary font-semibold">Ver Tudo</Link>
          </div>
          <div 
            ref={manualCarouselRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={`flex overflow-x-auto no-scrollbar gap-4 px-6 pb-4 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[40vw] sm:w-[160px] aspect-[3/4] bg-primary/20 rounded-xl animate-pulse"></div>
              ))
            ) : featuredProducts.map((product) => (
              <div key={product.id} className="group w-[40vw] sm:w-[160px] md:w-[200px] shrink-0">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 glass-card">
                  <Link to={`/product/${product.id}`}>
                    <img 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt={product.name} 
                      src={product.image_url || product.img || 'https://picsum.photos/seed/product/400/600'}
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                  {product.discount && product.discount > 0 && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-red-800/90 text-white px-2 py-1 text-[8px] tracking-widest uppercase font-bold rounded-sm">{product.discount}% OFF</span>
                    </div>
                  )}
                  <button 
                    onClick={() => addItem({ id: product.id, name: product.name, price: product.sale_price, image: product.image_url || product.img })}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary/70 backdrop-blur-md flex items-center justify-center text-secondary active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-base">shopping_cart</span>
                  </button>
                </div>
                <Link to={`/product/${product.id}`}>
                  <h5 className="text-xs text-surface/80 font-medium tracking-tight mb-1 hover:text-secondary transition-colors truncate">{product.name}</h5>
                  <div className="flex items-center gap-2">
                    <p className="text-secondary font-headline italic">R$ {(product.discount && product.discount > 0 ? product.discounted_price : product.sale_price)?.toLocaleString('pt-BR')}</p>
                    {product.discount && product.discount > 0 && (
                      <p className="text-[10px] text-surface/40 line-through">R$ {product.sale_price?.toLocaleString('pt-BR')}</p>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* BottomNavBar */}
      <BottomNavigation />
    </div>
  );
}
