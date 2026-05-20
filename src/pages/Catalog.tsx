import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import BottomNavigation from '../components/BottomNavigation';
import Sidebar from '../components/Sidebar';
import ProductImage from '../components/ProductImage';
import { productToCartItem } from '../lib/productMetadata';

const normalizeCategory = (category?: string | null) =>
  category?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() || '';

export default function Catalog() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<Set<string>>(new Set(['bolsas']));
  const addItem = useCartStore((state) => state.addItem);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('published', true)
        .gt('stock', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      
      if (data) {
        const cats = new Set(data.map(p => normalizeCategory(p.category)));
        setAvailableCategories(cats);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="global-bg text-surface font-body selection:bg-secondary/30 min-h-screen flex flex-col">
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
        <Link to="/home" className="font-headline text-2xl font-bold tracking-tighter text-surface flex items-center gap-0.5">
          <span className="material-symbols-outlined text-xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          <span className="uppercase">vc</span>
        </Link>
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

      <main className="grow pt-24 pb-32 px-4 md:px-6 w-full min-w-0">
        <div className="max-w-7xl mx-auto w-full min-w-0">
          <header className="mb-8 text-center space-y-3">
            <h1 className="font-headline text-4xl md:text-5xl text-surface italic">Catálogo</h1>
            <p className="font-label text-[10px] md:text-xs uppercase tracking-[0.2em] text-secondary/80">A coleção completa Valle Chic</p>
          </header>

          {/* Category Navigation (Same as Home) */}
          <div className="flex overflow-x-auto no-scrollbar gap-4 mb-10 pb-2 md:justify-center px-2">
            <Link to="/catalog" className="flex flex-col items-center gap-2 min-w-15">
              <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/5 glass-card active">
                <span className="material-symbols-outlined text-secondary text-xl">shopping_bag</span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.15em] text-surface font-bold">Bolsas</span>
            </Link>
            
            {availableCategories.has('maletas') && (
              <Link to="/maletas" className="flex flex-col items-center gap-2 min-w-15">
                <div className="w-14 h-14 rounded-full bg-secondary/5 flex items-center justify-center border border-secondary/5 glass-card">
                  <span className="material-symbols-outlined text-secondary/60 text-xl">business_center</span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.15em] text-surface/40">Maletas</span>
              </Link>
            )}

            {availableCategories.has('carteiras') && (
              <Link to="/carteiras" className="flex flex-col items-center gap-2 min-w-15">
                <div className="w-14 h-14 rounded-full bg-secondary/5 flex items-center justify-center border border-secondary/5 glass-card">
                  <span className="material-symbols-outlined text-secondary/60 text-xl">wallet</span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.15em] text-surface/40">Carteiras</span>
              </Link>
            )}

            {availableCategories.has('acessorios') && (
              <Link to="/acessorios" className="flex flex-col items-center gap-2 min-w-15">
                <div className="w-14 h-14 rounded-full bg-secondary/5 flex items-center justify-center border border-secondary/5 glass-card">
                  <span className="material-symbols-outlined text-secondary/60 text-xl">styler</span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.15em] text-surface/40">Acessórios</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col">
                  <div className="aspect-3/4 bg-primary/20 rounded-xl mb-4"></div>
                  <div className="h-4 bg-primary/20 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-primary/20 rounded w-3/4"></div>
                </div>
              ))
            ) : products.map((product) => (
              <div key={product.id} className="group flex flex-col">
                <div className="aspect-3/4 bg-primary/40 overflow-hidden luxury-border relative rounded-xl mb-4 glass-card">
                  <Link to={`/product/${product.id}`}>
                    <ProductImage alt={product.name} className="transition-opacity duration-700" src={product.image_url || product.img || 'https://picsum.photos/seed/product/400/600'} referrerPolicy="no-referrer" />
                  </Link>
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    {product.is_new ? (
                      <span className="bg-secondary text-primary px-2 py-1 text-[8px] tracking-widest uppercase font-bold rounded-sm w-fit">Novidade</span>
                    ) : null}
                    {product.discount > 0 ? (
                      <span className="bg-red-800/90 text-white px-2 py-1 text-[8px] tracking-widest uppercase font-bold rounded-sm w-fit">-{product.discount}% OFF</span>
                    ) : null}
                  </div>
                  <button 
                    onClick={() => addItem(productToCartItem(
                      product,
                      product.discount > 0
                        ? (product.discounted_price ?? (product.sale_price ? product.sale_price * (1 - product.discount / 100) : product.sale_price))
                        : product.sale_price
                    ))}
                    className="absolute bottom-3 right-3 w-10 h-10 bg-primary/80 backdrop-blur-md rounded-full flex items-center justify-center text-surface opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-secondary hover:text-primary active:scale-90"
                  >
                    <span className="material-symbols-outlined text-xl">shopping_cart</span>
                  </button>
                </div>
                <div className="flex flex-col grow">
                  <p className="text-[10px] tracking-[0.2em] text-surface/40 uppercase mb-1">{product.brand || 'Valle Chic'}</p>
                  <Link to={`/product/${product.id}`}>
                    <h3 className="font-headline text-lg text-surface leading-tight mb-2 grow hover:text-secondary transition-colors">{product.name}</h3>
                  </Link>
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-sm font-medium text-secondary">R$ {(product.discount > 0 ? product.discounted_price : product.sale_price)?.toLocaleString('pt-BR')}</p>
                    {product.discount > 0 ? (
                      <p className="text-xs text-surface/40 line-through">R$ {product.sale_price?.toLocaleString('pt-BR')}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => addItem(productToCartItem(
                      product,
                      product.discount > 0
                        ? (product.discounted_price ?? (product.sale_price ? product.sale_price * (1 - product.discount / 100) : product.sale_price))
                        : product.sale_price
                    ))}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-[0.15em] transition-all duration-200 ${
                      product.stock > 0
                        ? 'bg-secondary text-primary hover:bg-secondary/90 active:scale-95 shadow-lg shadow-secondary/20'
                        : 'bg-surface/10 text-surface/40 cursor-not-allowed'
                    }`}
                    disabled={product.stock <= 0}
                  >
                    <span className="material-symbols-outlined text-sm">shopping_cart</span>
                    {product.stock > 0 ? 'Adicionar' : 'Esgotado'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {!loading && products.length === 0 && (
            <div className="text-center py-12 text-surface/60">
              <p>Nenhum produto encontrado.</p>
            </div>
          )}

          <div className="mt-16 flex justify-center">
            <button className="border border-secondary/30 text-secondary px-8 py-3 rounded-full font-label text-[10px] uppercase tracking-[0.2em] hover:bg-secondary hover:text-primary transition-colors duration-300">Carregar Mais</button>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
