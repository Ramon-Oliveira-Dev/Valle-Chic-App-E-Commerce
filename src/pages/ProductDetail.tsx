import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getFallbackProductById, getFallbackProducts } from '../data/products';
import BottomNavigation from '../components/BottomNavigation';
import MenuButton from '../components/MenuButton';
import Sidebar from '../components/Sidebar';
import ProductImage from '../components/ProductImage';
import { productToCartItem } from '../lib/productMetadata';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Info, CheckCircle, Package } from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDesktopSidebarCollapsed } = useTheme();
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<string>('');
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  
  const addItem = useCartStore((state) => state.addItem);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
    window.scrollTo(0, 0);
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      let foundProduct: any = null;
      let suggestionsList: any[] = [];

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

          if (!error && data) {
            foundProduct = data;
          }

          const { data: suggestions } = await supabase
            .from('products')
            .select('*')
            .eq('published', true)
            .gt('stock', 0)
            .neq('id', id)
            .limit(6);
          
          if (suggestions && suggestions.length > 0) {
            suggestionsList = suggestions;
          }
        } catch (supabaseErr) {
          console.warn('Supabase product detail query failed, falling back to local dataset:', supabaseErr);
        }
      }

      if (!foundProduct) {
        foundProduct = getFallbackProductById(id || '');
      }

      if (suggestionsList.length === 0) {
        suggestionsList = getFallbackProducts().filter(p => p.id !== id).slice(0, 6);
      }

      setProduct(foundProduct);
      if (foundProduct) {
        setActiveImage(foundProduct.image_url || foundProduct.img || foundProduct.image || 'https://picsum.photos/seed/product/800/600');
      }
      setSuggestedProducts(suggestionsList);
    } catch (error) {
      console.warn('Error fetching product:', error);
      const fallback = getFallbackProductById(id || '');
      setProduct(fallback);
      if (fallback) {
        setActiveImage(fallback.image_url || fallback.img || fallback.image || 'https://picsum.photos/seed/product/800/600');
      }
      setSuggestedProducts(getFallbackProducts().filter(p => p.id !== id).slice(0, 6));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="global-bg min-h-screen flex items-center justify-center text-surface">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin"></div>
          <p className="font-label text-xs uppercase tracking-widest text-secondary">Carregando luxo...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="global-bg min-h-screen flex flex-col items-center justify-center text-surface px-6 text-center">
        <Package className="w-16 h-16 text-secondary/20 mb-4" />
        <h2 className="font-headline text-2xl mb-2">Produto não encontrado</h2>
        <p className="text-surface/60 mb-8 max-w-xs">O item que você procura pode ter sido removido ou não está mais disponível.</p>
        <Link to="/catalog" className="glass-button px-8 py-3 rounded-full text-sm font-bold">Voltar ao Catálogo</Link>
      </div>
    );
  }

  const allImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.image_url || product.img || product.image || 'https://picsum.photos/seed/product/800/600'];

  const hasDiscount = (product.discount || 0) > 0;
  const originalPrice = product.sale_price ?? product.price ?? product.original_price;
  const displayPrice = hasDiscount
    ? (product.discounted_price ?? (originalPrice ? originalPrice * (1 - product.discount / 100) : originalPrice))
    : originalPrice;

  return (
    <div className={`global-bg text-surface font-body selection:bg-secondary/30 min-h-screen ${isDesktopSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px]'} transition-all duration-300`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <header className={`fixed top-0 left-0 right-0 ${isDesktopSidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[240px]'} z-50 flex items-center justify-between px-6 py-4 bg-[#0F1420]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl transition-all duration-300`}>
        <div className="lg:hidden">
          <MenuButton onClick={() => setIsSidebarOpen(true)} />
        </div>
        <div className="flex-1 text-center font-headline italic text-xl">Valle <span className="text-secondary">Chic</span></div>
        <Link to="/checkout" className="text-surface hover:opacity-80 transition-opacity active:scale-95 duration-150 ease-in-out relative">
          <ShoppingCart className="w-6 h-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-secondary text-primary text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full">
              {totalItems}
            </span>
          )}
        </Link>
      </header>

      <main className="max-w-7xl mx-auto pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Coluna da Imagem */}
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-square w-full rounded-[32px] overflow-hidden bg-[#161D2F]/50 border border-white/5 shadow-2xl"
            >
              <ProductImage 
                src={activeImage} 
                alt={product.name}
                className="w-full h-full"
                imageClassName="object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-6 left-6 flex flex-col gap-2">
                {hasDiscount && (
                  <span className="bg-rose-500/90 backdrop-blur-md text-white px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase font-black rounded-full">
                    -{product.discount}%
                  </span>
                )}
                {product.is_new && (
                  <span className="bg-secondary text-primary px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase font-black rounded-full">
                    Novo
                  </span>
                )}
              </div>
            </motion.div>

            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto no-scrollbar">
                {allImages.map((img: string, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`w-24 h-24 rounded-2xl overflow-hidden shrink-0 border-2 transition-all duration-300 ${activeImage === img ? 'border-secondary scale-105' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <ProductImage src={img} alt={`${product.name} ${idx + 1}`} referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coluna da Informação */}
          <div className="flex flex-col justify-center">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-secondary text-[10px] uppercase tracking-[0.3em] font-black mb-3">{product.brand || 'Valle Chic'}</p>
              <h1 className="font-headline text-5xl text-white mb-6 leading-tight">{product.name}</h1>
              
              <div className="flex items-baseline gap-4 mb-8">
                <span className="text-4xl font-headline italic font-black text-white">
                  R$ {displayPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {hasDiscount && originalPrice && (
                  <span className="text-xl text-surface/30 line-through">
                    R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-8 bg-white/5 rounded-full px-4 py-2 w-fit border border-white/5">
                <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-surface/50">
                  {product.stock > 0 ? `${product.stock} disponíveis` : 'Sem estoque'}
                </span>
              </div>

              <div className="bg-[#161D2F]/50 p-8 rounded-[32px] mb-8 border border-white/5">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-secondary mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Descrição
                </h3>
                <p className="text-surface/60 leading-relaxed text-sm">
                  {product.description || 'Nenhuma descrição disponível para este produto de luxo.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => product.stock > 0 && addItem(productToCartItem(product, displayPrice))}
                  disabled={product.stock <= 0}
                  className={`group w-full inline-flex items-center justify-center gap-3 px-8 py-5 rounded-[20px] text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                    product.stock > 0
                      ? 'bg-secondary text-primary hover:bg-white active:scale-95 shadow-lg shadow-secondary/20'
                      : 'bg-white/5 text-surface/30 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Adicionar
                </button>
                
                <Link 
                  to="/catalog"
                  className="w-full inline-flex items-center justify-center gap-3 px-8 py-5 rounded-[20px] border border-white/10 bg-white/5 text-surface/70 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Sugestões */}
        {suggestedProducts.length > 0 && (
          <section className="mt-24">
            <h4 className="font-headline text-3xl text-white mb-10 text-center">Você também pode gostar</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {suggestedProducts.map(p => (
                <Link key={p.id} to={`/product/${p.id}`} className="group block">
                  <div className="aspect-square rounded-[24px] overflow-hidden bg-[#161D2F]/50 border border-white/5 mb-4 relative">
                    <ProductImage src={p.image_url || p.img} alt={p.name} className="group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    {p.discount > 0 && (
                      <div className="absolute top-3 left-3 bg-rose-500/90 backdrop-blur-md text-white px-2 py-1 text-[8px] tracking-[0.1em] uppercase font-black rounded-full">
                        -{p.discount}%
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-surface/60 font-medium mb-1 truncate">{p.name}</p>
                  <p className="text-secondary text-xs font-black font-headline italic">
                    R$ {(p.discount > 0 ? (p.discounted_price ?? (p.sale_price ? p.sale_price * (1 - p.discount / 100) : p.sale_price)) : p.sale_price)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
