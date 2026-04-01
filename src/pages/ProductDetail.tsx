import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import BottomNavigation from '../components/BottomNavigation';
import Sidebar from '../components/Sidebar';

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

  return (
    <div className="global-bg text-surface font-body selection:bg-secondary/30 min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 flex items-center justify-between px-6 py-4 bar-fume">
        <div className="w-10"></div> {/* Spacer to keep logo centered */}
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

      <main className="pb-32 editorial-gradient min-h-screen max-w-5xl mx-auto">
        <div className="px-4 pt-4">
          {/* Main Image Display */}
          <div className="relative aspect-[3/4] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden glass-card mb-4">
            <img 
              src={activeImage} 
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-6 left-6 flex flex-col gap-2">
              {product.discount && product.discount > 0 && (
                <span className="bg-red-800/90 text-white px-4 py-2 text-xs tracking-widest uppercase font-bold rounded-full shadow-xl">
                  {product.discount}% OFF
                </span>
              )}
              {product.is_new && (
                <span className="bg-secondary text-primary px-4 py-2 text-xs tracking-widest uppercase font-bold rounded-full shadow-xl">
                  Novidade
                </span>
              )}
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
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}

          <div className="px-2">
            <p className="text-secondary text-xs uppercase tracking-[0.3em] font-bold mb-2">{product.brand || 'Vallechic'}</p>
            <h2 className="font-headline text-4xl text-surface mb-4 leading-tight">{product.name}</h2>
            
            <div className="flex items-baseline gap-4 mb-8">
              <span className="text-3xl font-headline italic text-secondary">R$ {product.sale_price?.toLocaleString('pt-BR')}</span>
              {product.discount && product.discount > 0 && product.original_price && (
                <span className="text-lg text-surface/40 line-through">R$ {product.original_price?.toLocaleString('pt-BR')}</span>
              )}
            </div>

            <div className="glass-card p-6 rounded-2xl mb-8 border border-secondary/10">
              <h3 className="font-headline text-xl mb-4 text-surface/90">Descrição</h3>
              <p className="text-surface/60 leading-relaxed text-sm">
                {product.description || 'Nenhuma descrição disponível para este produto de luxo.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {product.stock > 0 ? (
                <button 
                  onClick={() => addItem({ id: product.id, name: product.name, price: product.sale_price, image: product.image_url || product.img })}
                  className="w-full glass-button py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-2xl shadow-secondary/20 font-bold text-lg"
                >
                  <span className="material-symbols-outlined">shopping_cart</span>
                  Adicionar à Sacola
                </button>
              ) : (
                <div className="w-full bg-primary/40 text-surface/40 py-5 rounded-2xl flex items-center justify-center gap-3 cursor-not-allowed border border-surface/10">
                  <span className="material-symbols-outlined">block</span>
                  Esgotado
                </div>
              )}
              
              <Link 
                to="/catalog"
                className="w-full border border-secondary/20 py-4 rounded-2xl flex items-center justify-center text-surface/60 text-sm font-medium hover:bg-secondary/5 transition-colors"
              >
                Continuar Comprando
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
                <Link key={p.id} to={`/product/${p.id}`} className="shrink-0 w-[40vw] sm:w-[160px]">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden glass-card mb-2">
                    <img src={p.image_url || p.img} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <p className="text-[10px] text-surface/80 font-medium truncate">{p.name}</p>
                  <p className="text-secondary text-xs font-headline italic">R$ {p.sale_price?.toLocaleString('pt-BR')}</p>
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
