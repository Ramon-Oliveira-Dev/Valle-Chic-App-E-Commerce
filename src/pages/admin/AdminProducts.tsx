import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import NotificationModal from '../../components/NotificationModal';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import ProductImage from '../../components/ProductImage';

export default function AdminProducts() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [soldProducts, setSoldProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });

  useEffect(() => {
    fetchProducts();
    fetchSoldProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro de Carregamento',
        message: 'Não foi possível carregar a lista de produtos.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSoldProducts = async () => {
    try {
      // Fetch sale items joined with sales and products and clients
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          unit_price,
          products (
            name,
            brand,
            category
          ),
          sales (
            sale_date,
            payment_method,
            clients (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSold = data?.map((item: any) => ({
        name: item.products?.name,
        brand: item.products?.brand,
        category: item.products?.category,
        price: item.unit_price,
        saleDate: new Date(item.sales?.sale_date).toLocaleDateString('pt-BR'),
        clientName: item.sales?.clients?.name || 'Cliente não identificado',
        paymentMethod: item.sales?.payment_method?.toUpperCase() || 'N/A'
      })) || [];

      setSoldProducts(formattedSold);
    } catch (error) {
      console.error('Error fetching sold products:', error);
    }
  };

  const handleStockEntry = async (id: string, currentStock: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: currentStock + 1 })
        .eq('id', id);

      if (error) throw error;
      
      setProducts(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, stock: p.stock + 1 };
        }
        return p;
      }));
      
      setModalConfig({
        isOpen: true,
        title: 'Estoque Atualizado',
        message: 'Entrada de estoque realizada com sucesso.',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error updating stock:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro na Atualização',
        message: error.message || 'Ocorreu um erro ao tentar atualizar o estoque.',
        type: 'error'
      });
    }
  };

  const handleStockExit = async (id: string, currentStock: number) => {
    if (currentStock <= 0) return;

    try {
      const newStock = currentStock - 1;
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', id);

      if (error) throw error;

      setProducts(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, stock: newStock };
        }
        return p;
      }));
      
      setModalConfig({
        isOpen: true,
        title: 'Estoque Atualizado',
        message: 'Saída de estoque realizada com sucesso.',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error updating stock:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro na Atualização',
        message: error.message || 'Ocorreu um erro ao tentar atualizar o estoque.',
        type: 'error'
      });
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 ">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-10">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <div>
              <h2 className="font-headline text-2xl italic">Admin <span className="text-secondary">VC</span></h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSino />
          </div>
        </header>

        <div className="px-5 md:px-10 pt-24">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="font-headline text-3xl italic">Gestão de Produtos</h2>
              <p className="text-surface/60 text-sm mt-1">Visualize e gerencie o catálogo de peças.</p>
            </div>
            <Link 
              to="/admin/products/new" 
              className="bg-secondary text-primary px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-secondary/20"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Novo Produto
            </Link>
          </div>

          <div className="glass-card rounded-2xl p-6 mb-10">
            <h3 className="font-headline text-xl italic mb-6">Estoque Ativo</h3>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-secondary/10 text-surface/60 text-[10px] uppercase tracking-widest">
                    <th className="pb-3 font-normal w-12"></th>
                    <th className="pb-3 font-normal">Produto</th>
                    <th className="pb-3 font-normal">Marca</th>
                    <th className="pb-3 font-normal">Categoria</th>
                    <th className="pb-3 font-normal">Preço</th>
                    <th className="pb-3 font-normal text-center">Estoque</th>
                    <th className="pb-3 font-normal text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-secondary/5 hover:bg-white/5 transition-colors">
                      <td className="py-4">
                        <ProductImage src={product.img || 'https://picsum.photos/seed/product/100/100'} alt={product.name} className="w-10 h-10 rounded-lg" referrerPolicy="no-referrer" />
                      </td>
                      <td className="py-4">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-[10px] text-surface/60 uppercase tracking-widest font-mono">{product.sku || `VC-${product.id.slice(0,4).toUpperCase()}`}</p>
                      </td>
                      <td className="py-4 text-surface/60">{product.brand}</td>
                      <td className="py-4 text-surface/60">{product.category}</td>
                      <td className="py-4 font-medium">R$ {product.sale_price?.toLocaleString('pt-BR')}</td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${product.stock <= 2 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {product.stock} un
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleStockEntry(product.id, product.stock)}
                            className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                            title="Entrada"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                          </button>
                          <button 
                            onClick={() => handleStockExit(product.id, product.stock)}
                            disabled={product.stock === 0}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              product.stock > 0 
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' 
                                : 'bg-surface/5 text-surface/20 border border-surface/10 cursor-not-allowed'
                            }`}
                            title="Saída"
                          >
                            <span className="material-symbols-outlined text-sm">remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {products.map((product) => (
                <div key={product.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                  <div className="flex gap-4">
                    <ProductImage src={product.img || 'https://picsum.photos/seed/product/100/100'} alt={product.name} className="w-16 h-16 rounded-lg border border-secondary/20" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-[10px] text-surface/60 uppercase tracking-widest font-mono">{product.sku || `VC-${product.id.slice(0,4).toUpperCase()}`}</p>
                      <div className="flex justify-between items-end mt-2">
                        <div>
                          <p className="text-[10px] text-surface/60 uppercase tracking-widest">Preço</p>
                          <p className="text-sm font-bold text-secondary">R$ {product.sale_price?.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-surface/60 uppercase tracking-widest">Estoque</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${product.stock <= 2 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {product.stock} un
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <p className="text-[10px] text-surface/60 uppercase tracking-widest">{product.brand} • {product.category}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStockEntry(product.id, product.stock)}
                        className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                      <button 
                        onClick={() => handleStockExit(product.id, product.stock)}
                        disabled={product.stock === 0}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          product.stock > 0 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : 'bg-surface/5 text-surface/20 border border-surface/10 opacity-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {soldProducts.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-headline text-xl italic mb-6">Produtos Vendidos</h3>
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-secondary/10 text-surface/40 text-[10px] uppercase tracking-widest">
                      <th className="pb-3 font-normal">Produto</th>
                      <th className="pb-3 font-normal">Marca</th>
                      <th className="pb-3 font-normal">Categoria</th>
                      <th className="pb-3 font-normal">Preço</th>
                      <th className="pb-3 font-normal">Data Venda</th>
                      <th className="pb-3 font-normal">Cliente</th>
                      <th className="pb-3 font-normal text-right">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {soldProducts.map((product, idx) => (
                      <tr key={idx} className="border-b border-secondary/5 hover:bg-white/5 transition-colors">
                        <td className="py-4">
                          <p className="font-medium">{product.name}</p>
                        </td>
                        <td className="py-4 text-surface/60">{product.brand}</td>
                        <td className="py-4 text-surface/60">{product.category}</td>
                        <td className="py-4 font-medium">R$ {product.price?.toLocaleString('pt-BR')}</td>
                        <td className="py-4 text-surface/60">{product.saleDate}</td>
                        <td className="py-4 text-surface/60">{product.clientName}</td>
                        <td className="py-4 text-right text-surface/60">{product.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {soldProducts.map((product, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-[10px] text-surface/40 uppercase tracking-widest">{product.brand} • {product.category}</p>
                      </div>
                      <p className="text-secondary font-bold">R$ {product.price?.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
                      <div>
                        <p className="text-[9px] text-surface/40 uppercase tracking-widest">Cliente</p>
                        <p className="text-[11px] truncate">{product.clientName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-surface/40 uppercase tracking-widest">Data</p>
                        <p className="text-[11px]">{product.saleDate}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-surface/40 uppercase tracking-widest pt-2">
                      <span>Pagamento</span>
                      <span className="text-secondary font-bold">{product.paymentMethod}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />

      <NotificationModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </div>
  );
}
