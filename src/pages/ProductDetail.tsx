import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import BottomNavigation from '../components/BottomNavigation';
import MenuButton from '../components/MenuButton';
import Sidebar from '../components/Sidebar';
import ProductImage from '../components/ProductImage';
import { productToCartItem } from '../lib/productMetadata';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Check if product is published and has stock
      if (!data.published || data.stock <= 0) {
        // Optionally redirect or show "Not Available"
        // For now, let's just show it but maybe disable the "Add to Cart" button
      }

      setProduct(data);
      setActiveImage(data.image_url || data.img || 'https://picsum.photos/seed/product/800/600');
      
      // Fetch suggestions
      const { data: suggestions } = await supabase
        .from('products')
        .select('*')
        .eq('published', true)
        .gt('stock', 0)
        .neq('id', id)
        .limit(6);
      
      setSuggestedProducts(suggestions || []);
    } catch (error) {
      console.error('Error fetching product:', error);
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
        <span className="material-symbols-outlined text-6xl text-secondary/20 mb-4">inventory_2</span>
        <h2 className="font-headline text-2xl mb-2">Produto não encontrado</h2>
        <p className="text-surface/60 mb-8 max-w-xs">O item que você procura pode ter sido removido ou não está mais disponível.</p>
        <Link to="/catalog" className="glass-button px-8 py-3 rounded-full text-sm font-bold">Voltar ao Catálogo</Link>
      </div>
    );
  }

  const allImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.image_url || product.img || 'https://picsum.photos/seed/product/800/600'];

  const hasDiscount = product.discount > 0;
  const originalPrice = product.sale_price || product.original_price;
  const displayPrice = hasDiscount
    ? (product.discounted_price ?? (originalPrice ? originalPrice * (1 - product.discount / 100) : originalPrice))
    : originalPrice;

  return (
    <div className="global-bg text-surface font-body selection:bg-secondary/30 min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4 bar-fume border-b border-secondary/10 shadow-2xl shadow-slate-950/10 backdrop-blur-xl">
        <MenuButton onClick={() => setIsSidebarOpen(true)} />

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

      <main className="pb-32 editorial-gradient min-h-screen max-w-5xl mx-auto pt-24">
        <div className="px-4 pt-4">
          {/* Main Image Display */}
          <div className="relative aspect-3/4 sm:aspect-video w-full rounded-2xl overflow-hidden glass-card mb-4">
            <ProductImage 
              src={activeImage} 
              alt={product.name}
              className="transition-all duration-500 h-full"
              imageClassName="object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-6 left-6 flex flex-col gap-2">
              {product.discount > 0 ? (
                <span className="bg-red-800/90 text-white px-4 py-2 text-xs tracking-widest uppercase font-bold rounded-full shadow-xl">
                  {product.discount}% OFF
                </span>
              ) : null}
              {product.is_new ? (
                <span className="bg-secondary text-primary px-4 py-2 text-xs tracking-widest uppercase font-bold rounded-full shadow-xl">
                  Novidade
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => product.stock > 0 && addItem(productToCartItem(product, displayPrice))}
              disabled={product.stock <= 0}
              aria-label="Adicionar ao carrinho"
              title="Adicionar ao carrinho"
              className={`absolute right-4 bottom-4 flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-transform duration-200 ${product.stock > 0 ? 'bg-secondary text-primary hover:scale-105' : 'bg-surface/10 text-surface/40 cursor-not-allowed'} border border-secondary/20`}
            >
              <span className="material-symbols-outlined text-2xl">shopping_cart</span>
            </button>
            <div className="absolute right-4 bottom-24 max-w-55 rounded-full bg-surface/10 border border-secondary/15 px-3 py-2 text-[11px] uppercase tracking-[0.35em] text-surface/70 shadow-lg backdrop-blur-md hidden sm:flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">touch_app</span>
              Toque para adicionar à sacola
            </div>
          </div>

          {/* Thumbnail Gallery */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-4">
              {allImages.map((img: string, idx: number) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${activeImage === img ? 'border-secondary scale-105' : 'border-transparent opacity-60'}`}
                >
                  <ProductImage src={img} alt={`${product.name} ${idx + 1}`} referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}

          <div className="px-2">
            <p className="text-secondary text-xs uppercase tracking-[0.3em] font-bold mb-2">{product.brand || 'Valle Chic'}</p>
            <h2 className="font-headline text-4xl text-surface mb-4 leading-tight">{product.name}</h2>
            
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <span className="text-3xl font-headline italic text-secondary">
                R$ {displayPrice?.toLocaleString('pt-BR')}
              </span>
              {hasDiscount && originalPrice ? (
                <div className="flex items-center gap-3">
                  <span className="text-lg text-surface/40 line-through">
                    R$ {originalPrice.toLocaleString('pt-BR')}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold tracking-widest bg-red-800/90 text-white">
                    -{product.discount}% OFF
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 mb-8">
              <span className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              <span className="text-xs uppercase tracking-widest font-bold text-surface/60">
                {product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque'}
              </span>
            </div>

            <div className="glass-card p-6 rounded-2xl mb-8 border border-secondary/10">
              <h3 className="font-headline text-xl mb-4 text-surface/90">Descrição</h3>
              <p className="text-surface/60 leading-relaxed text-sm">
                {product.description || 'Nenhuma descrição disponível para este produto de luxo.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => product.stock > 0 && addItem(productToCartItem(product, displayPrice))}
                disabled={product.stock <= 0}
                className={`w-full inline-flex items-center justify-center gap-2 px-6 py-5 rounded-full text-sm font-bold uppercase tracking-[0.2em] shadow-2xl transition-all duration-200 ${
                  product.stock > 0
                    ? 'bg-secondary text-primary hover:bg-secondary/90 active:scale-95'
                    : 'bg-surface/10 text-surface/40 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined">shopping_cart</span>
                Adicionar
              </button>
              
              <Link 
                to="/catalog"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-5 rounded-full border border-secondary/20 bg-white/5 text-surface/90 text-sm font-bold uppercase tracking-[0.2em] hover:bg-secondary/10 transition-all duration-200"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Voltar
              </Link>
            </div>
          </div>
        </div>

        {/* Sugestões */}
        {suggestedProducts.length > 0 && (
          <section className="mt-16 px-6">
            <h4 className="font-headline text-2xl text-surface mb-6">Você também pode gostar</h4>
            <div className="flex overflow-x-auto no-scrollbar gap-4 pb-4">
              {suggestedProducts.map(p => (
                <Link key={p.id} to={`/product/${p.id}`} className="shrink-0 w-[40vw] sm:w-40">
                  <div className="aspect-3/4 rounded-xl overflow-hidden glass-card mb-2">
                    <ProductImage src={p.image_url || p.img} alt={p.name} referrerPolicy="no-referrer" />
                    {p.discount > 0 ? (
                      <div className="absolute top-2 left-2">
                        <span className="bg-red-800/90 text-white px-2 py-1 text-[9px] tracking-widest uppercase font-bold rounded-sm">
                          -{p.discount}% OFF
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-surface/80 font-medium truncate">{p.name}</p>
                  <p className="text-secondary text-xs font-headline italic">
                    R$ {(p.discount > 0 ? (p.discounted_price ?? (p.sale_price ? p.sale_price * (1 - p.discount / 100) : p.sale_price)) : p.sale_price)?.toLocaleString('pt-BR')}
                  </p>
                  {p.discount > 0 && p.sale_price ? (
                    <p className="text-[10px] text-surface/40 line-through">R$ {p.sale_price.toLocaleString('pt-BR')}</p>
                  ) : null}
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
