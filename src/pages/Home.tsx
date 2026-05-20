import { Link, useNavigate } from 'react-router-dom';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import BottomNavigation from '../components/BottomNavigation';
import Sidebar from '../components/Sidebar';
import ProductImage from '../components/ProductImage';
import { productToCartItem } from '../lib/productMetadata';
import { toast } from 'sonner';

const normalizeCategory = (category?: string | null) =>
  category?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() || '';

const normalizeText = (text: string = '') =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function Home() {
  const navigate = useNavigate();
  const autoCarouselRef = useRef<HTMLDivElement>(null);
  const manualCarouselRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<Set<string>>(new Set(['bolsas']));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      
      const { data: catData } = await supabase
        .from('products')
        .select('category')
        .eq('published', true)
        .gt('stock', 0);
      
      if (catData) {
        const cats = new Set(catData.map(p => normalizeCategory(p.category)));
        setAvailableCategories(cats);
      }

      const { data: featured, error: featuredError } = await supabase
        .from('products')
        .select('*')
        .eq('published', true)
        .eq('featured', true)
        .gt('stock', 0)
        .limit(10);

      if (featuredError) throw featuredError;
      setFeaturedProducts(featured || []);

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
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
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
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getProductColor = (product: any) => {
    if (Array.isArray(product.colors)) return product.colors[0];
    if (typeof product.colors === 'string') return product.colors.split(',')[0];
    return '';
  };

  const getFinalPrice = (price: number, discount: number) => {
    const p = Number(price) || 0;
    const d = Number(discount) || 0;
    return d > 0 ? p - (p * (d / 100)) : p;
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const normalizedQuery = normalizeText(query);
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('published', true)
          .gt('stock', 0)
          .limit(10);

        if (error) throw error;

        const filtered = (data || [])
          .filter(product => {
            const productName = normalizeText(product.name);
            const productBrand = normalizeText(product.brand);
            const productCategory = normalizeText(product.category);
            const productDescription = normalizeText(product.description);

            return (
              productName.includes(normalizedQuery) ||
              productBrand.includes(normalizedQuery) ||
              productCategory.includes(normalizedQuery) ||
              productDescription.includes(normalizedQuery)
            );
          })
          .sort((a, b) => {
            const aPriority = normalizeText(a.name).startsWith(normalizedQuery) ? 0 : 1;
            const bPriority = normalizeText(b.name).startsWith(normalizedQuery) ? 0 : 1;
            return aPriority - bPriority;
          })
          .slice(0, 8);

        setSearchResults(filtered);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  const handleSelectProduct = (productId: string) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    navigate(`/product/${productId}`);
  };

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const finalPrice = getFinalPrice(product.sale_price, product.discount);
    addItem(productToCartItem(product, finalPrice));
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  return (
    <div className="global-bg text-surface font-body selection:bg-secondary/30 min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bar-fume">
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
              <span className="absolute -top-1.5 -right-1.5 bg-secondary text-primary text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(255,215,0,0.5)]">
                {totalItems}
              </span>
            )}
          </div>
        </Link>
      </header>

      <main className="pb-24 editorial-gradient min-h-screen max-w-5xl mx-auto pt-24">
        {/* Banner */}
        <section className="px-4 pt-4">
          <div className="relative aspect-3/4.5 sm:aspect-video md:aspect-21/9 w-full rounded-2xl overflow-hidden group shadow-2xl border border-white/5">
            <img 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
              alt="A Nova Coleção 2026" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlDxC3H4NbgCyenQONl6hvhc0_EWPHLUgeiYFbdDGqUHgdQ2e2TtAuTdwdSP_61fLL4HDUmgpljYk16nLuEp6lZIQNuEVxzrwABBNQmDgdNcy7y1bv3q2e6i43l7l82o2zgyESpzM07R4IJ_WK-_csyzhfW-G4J8AA0v3619PIQAi3KFeS2oQFKv0H5L9lVSqRAl9HgzX9MfszU_kywKF3iTE6t8M2puL6BMHxlcy7zqff14cQRsP6wTdSFW7cmUTJQLNEqVYR5yg"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#0b0c10] via-[#0b0c10]/30 to-transparent"></div>
            <div className="absolute bottom-8 left-8 right-8">
              <h2 className="font-headline italic text-4xl text-surface leading-tight drop-shadow-md">A Nova Coleção 2026</h2>
            </div>
          </div>
        </section>

        {/* Busca */}
        <section className="px-6 my-8">
          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary/40 text-xl transition-colors group-focus-within:text-secondary">search</span>
            <input 
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              className="w-full bg-[#1A1C23] border border-white/5 rounded-full py-4 pl-14 pr-6 text-sm text-surface placeholder:text-surface/40 focus:outline-none focus:border-secondary/50 focus:bg-[#1A1C23] transition-all shadow-inner" 
              placeholder="Qual estilo você procura?" 
              type="text"
            />
            
            {/* Dropdown de Resultados */}
            {showSearchResults && (searchResults.length > 0 || isSearching) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1C23] border border-secondary/30 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto custom-scrollbar">
                {isSearching ? (
                  <div className="p-4 flex items-center justify-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-secondary/40 border-t-secondary animate-spin"></div>
                    <span className="text-xs text-surface/60 uppercase tracking-widest">Buscando...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product.id)}
                        className="w-full flex items-center gap-3 p-3 border-b border-white/5 last:border-b-0 hover:bg-secondary/10 transition-colors text-left"
                      >
                        <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/10">
                          <ProductImage
                            src={product.image_url || product.img}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-surface font-medium truncate">{product.name}</p>
                          <p className="text-xs text-surface/60 truncate">{product.brand || 'Valle Chic'}</p>
                          <p className="text-xs text-secondary font-headline mt-1">
                            R$ {getFinalPrice(product.sale_price, product.discount).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        {product.discount > 0 && (
                          <span className="text-[9px] bg-red-800/90 text-white px-2 py-1 rounded font-bold">
                            -{product.discount}%
                          </span>
                        )}
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-xs text-surface/40 uppercase tracking-widest">Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Categorias */}
        <section className="mb-12">
          <div className="flex overflow-x-auto no-scrollbar gap-6 px-6 md:justify-center">
            <Link to="/catalog" className="flex flex-col items-center gap-3 min-w-17.5 group">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20 group-hover:bg-secondary/20 transition-colors shadow-lg">
                <span className="material-symbols-outlined text-secondary text-2xl">shopping_bag</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-surface/80 group-hover:text-secondary transition-colors">Bolsas</span>
            </Link>
            
            {availableCategories.has('maletas') && (
              <Link to="/maletas" className="flex flex-col items-center gap-3 min-w-17.5 group">
                <div className="w-16 h-16 rounded-full bg-[#1A1C23] flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-colors shadow-lg">
                  <span className="material-symbols-outlined text-surface/60 text-2xl group-hover:text-surface transition-colors">business_center</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-surface/50 group-hover:text-surface transition-colors">Maletas</span>
              </Link>
            )}

            {availableCategories.has('carteiras') && (
              <Link to="/carteiras" className="flex flex-col items-center gap-3 min-w-17.5 group">
                <div className="w-16 h-16 rounded-full bg-[#1A1C23] flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-colors shadow-lg">
                  <span className="material-symbols-outlined text-surface/60 text-2xl group-hover:text-surface transition-colors">wallet</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-surface/50 group-hover:text-surface transition-colors">Carteiras</span>
              </Link>
            )}

            {availableCategories.has('acessorios') && (
              <Link to="/acessorios" className="flex flex-col items-center gap-3 min-w-17.5 group">
                <div className="w-16 h-16 rounded-full bg-[#1A1C23] flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-colors shadow-lg">
                  <span className="material-symbols-outlined text-surface/60 text-2xl group-hover:text-surface transition-colors">styler</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-surface/50 group-hover:text-surface transition-colors">Acessórios</span>
              </Link>
            )}
          </div>
        </section>

        {/* 🌟 KITS EXCLUSIVOS 🌟 */}
        <section className="mb-12">
          <div className="px-6 flex justify-between items-baseline mb-6">
            <h4 className="font-headline text-2xl text-surface">Kits Exclusivos</h4>
            <Link to="/catalog" className="text-[10px] uppercase tracking-[0.15em] text-secondary font-bold hover:opacity-80 transition-opacity">Descobrir</Link>
          </div>
          <div ref={autoCarouselRef} className="flex overflow-x-auto no-scrollbar gap-4 px-6 pb-4 snap-x snap-mandatory">
            {loading ? (
              <div className="w-[85vw] aspect-4/3 bg-white/5 rounded-2xl animate-pulse"></div>
            ) : kits.length > 0 ? kits.map((kit) => (
              
              <div key={kit.id} className="relative w-[85vw] sm:w-90 aspect-4/3 rounded-2xl overflow-hidden shrink-0 snap-center shadow-lg group border border-white/5 bg-[#14151A]">
                
                {/* Imagem a preencher o fundo */}
                <Link to={`/product/${kit.id}`} className="block w-full h-full">
                  <ProductImage 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt={kit.name} 
                    src={kit.image_url || kit.img || 'https://picsum.photos/seed/kit/800/500'}
                    referrerPolicy="no-referrer"
                  />
                  {/* Gradiente para a leitura do texto */}
                  <div className="absolute inset-x-0 bottom-0 h-[60%] bg-linear-to-t from-[#0b0c10]/90 to-transparent pointer-events-none" />
                </Link>

                {/* Etiquetas Superiores */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
                  <span className="bg-secondary text-[#0b0c10] text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm w-fit">
                    Conjunto Premium
                  </span>
                </div>

                {/* Textos Inferiores com Desconto Integrado */}
                <div className="absolute bottom-5 left-5 right-20 flex flex-col pointer-events-none z-10">
                  <h5 className="text-lg font-headline text-surface leading-tight drop-shadow-md mb-1">{kit.name}</h5>
                  <div className="flex flex-col gap-1">
                    {kit.discount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-surface/60 line-through drop-shadow-md">
                          R$ {kit.sale_price?.toLocaleString('pt-BR')}
                        </span>
                        <span className="bg-[#b3192b] text-white px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded shadow-sm">
                          -{kit.discount}% OFF
                        </span>
                      </div>
                    )}
                    <span className="text-secondary font-headline text-xl drop-shadow-md">
                      R$ {getFinalPrice(kit.sale_price, kit.discount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Botão de Carrinho */}
                <button 
                  onClick={(e) => handleAddToCart(e, kit)}
                  className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/40 active:scale-95 transition-all shadow-lg z-20"
                >
                  <span className="material-symbols-outlined text-2xl">shopping_cart</span>
                </button>
              </div>

            )) : (
              <div className="px-6 py-10 text-surface/40 text-xs uppercase tracking-widest italic">Nenhum kit disponível no momento</div>
            )}
          </div>
        </section>

        {/* 🌟 SELECIONADOS PARA VOCÊ 🌟 */}
        <section className="mb-12">
          <div className="px-6 flex justify-between items-baseline mb-6">
            <h4 className="font-headline text-2xl text-surface">Selecionados para você</h4>
            <Link to="/catalog" className="text-[10px] uppercase tracking-[0.15em] text-secondary font-bold hover:opacity-80 transition-opacity">Ver Tudo</Link>
          </div>
          <div 
            ref={manualCarouselRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={`flex overflow-x-auto no-scrollbar gap-4 px-6 pb-8 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[45vw] sm:w-40 flex flex-col gap-2 shrink-0 animate-pulse">
                  <div className="w-full aspect-4/5 bg-white/5 rounded-2xl"></div>
                  <div className="w-full h-16 bg-white/5 rounded mt-2"></div>
                </div>
              ))
            ) : featuredProducts.map((product) => (
              
              /* Contentor Pai (Flex Column) para os cards terem sempre a mesma altura e empurrarem o preço para baixo */
              <div key={product.id} className="w-[45vw] sm:w-40 md:w-45 shrink-0 flex flex-col rounded-2xl overflow-hidden bg-[#1A1C23] border border-white/5 shadow-lg group hover:border-white/10 transition-colors">
                
                {/* 1. CAIXA DA IMAGEM: A preencher a caixa (object-cover) com fundo branco */}
                <div className="relative w-full aspect-4/5 bg-white">
                  <Link to={`/product/${product.id}`} className="absolute inset-0">
                    <ProductImage 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      alt={product.name} 
                      src={product.image_url || product.img || 'https://picsum.photos/seed/product/400/500'}
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                </div>
                
                {/* 2. CAIXA DE TEXTO E AÇÕES: Flex-Grow para ocupar todo o espaço restante e empurrar o fundo */}
                <div className="p-3 flex flex-col grow justify-between">
                  
                  {/* Topo do Texto: Marca, Cor e Nome */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                      <span className="text-[8px] text-surface/50 uppercase tracking-widest font-bold truncate">
                        {product.brand} {product.model ? `• ${product.model}` : ''}
                      </span>
                      {getProductColor(product) && (
                        <span className="text-[8px] text-secondary border border-secondary/20 bg-secondary/10 px-1 py-0.5 rounded uppercase font-bold tracking-widest shrink-0">
                          {getProductColor(product)}
                        </span>
                      )}
                    </div>
                    
                    <Link to={`/product/${product.id}`} className="block mb-2">
                      <h5 className="text-sm text-surface/90 font-medium tracking-tight hover:text-secondary transition-colors line-clamp-2 leading-snug">
                        {product.name}
                      </h5>
                    </Link>
                  </div>

                  {/* Fundo do Texto: Preços, Desconto e Carrinho (Sempre alinhados em baixo) */}
                  <div className="mt-auto pt-2 flex items-end justify-between border-t border-white/5">
                    <Link to={`/product/${product.id}`} className="flex flex-col gap-0.5">
                      {product.discount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-surface/40 line-through">
                            R$ {product.sale_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="bg-[#b3192b] text-white px-1.5 py-0.5 text-[8px] font-bold uppercase rounded shadow-sm">
                            -{product.discount}% OFF
                          </span>
                        </div>
                      )}
                      <span className="text-secondary font-headline italic text-[15px] leading-none mt-1">
                        R$ {getFinalPrice(product.sale_price, product.discount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </Link>

                    {/* Botão Carrinho Integrado */}
                    <button 
                      onClick={(e) => handleAddToCart(e, product)}
                      className="w-8 h-8 rounded-full bg-secondary text-[#14151A] flex items-center justify-center shrink-0 hover:scale-110 active:scale-95 transition-all shadow-[0_4px_10px_rgba(255,215,0,0.3)] ml-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}
