import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import NotificationModal from '../../components/NotificationModal';
import PDFPreviewModal from '../../components/PDFPreviewModal';
import ProductImage from '../../components/ProductImage';
import { getPrimaryColor } from '../../lib/productMetadata';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Package, 
  ArrowLeftRight, 
  Plus, 
  Boxes, 
  Filter, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  FileText,
  ChevronRight,
  Search,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminInventory() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'inventory'>('inventory');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' });

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    if (category === 'Todos') {
      setSearchTerm('');
    }
  };
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInventory();
  }, [currentPage, searchTerm, activeTab, selectedCategory]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        // Search by name, brand, model, sku OR individual IDs
        query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,individual_ids.cs.{${searchTerm}}`);
      }

      if (selectedCategory === 'Bolsas') {
        query = query.eq('category', 'bolsas');
      } else if (selectedCategory === 'Carteiras') {
        query = query.eq('category', 'carteiras');
      } else if (selectedCategory === 'Kits') {
        query = query.eq('category', 'kits');
      } else if (selectedCategory === 'Promoções') {
        query = query.gt('discount', 0);
      } else if (selectedCategory === 'Acessórios') {
        query = query.eq('category', 'acessorios');
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventory(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro de Carregamento',
        message: 'Não foi possível carregar os itens do estoque.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleDelete = async () => {
    const { id, name } = deleteConfirm;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setInventory(prev => prev.filter(item => item.id !== id));
      setTotalCount(prev => prev - 1);
      
      setModalConfig({
        isOpen: true,
        title: 'Produto Removido',
        message: `O produto "${name}" foi removido com sucesso.`,
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Remover',
        message: error.message || 'Ocorreu um erro ao tentar remover o produto.',
        type: 'error'
      });
    } finally {
      setDeleteConfirm({ isOpen: false, id: '', name: '' });
    }
  };

  const calculateProfit = (cost: number, sale: number) => {
    if (!cost || cost === 0) return 0;
    return Math.round(((sale - cost) / cost) * 100);
  };

  const getModel = (item: any) => item.model || item.modelo || 'Sem modelo';
  const getColor = (item: any) => getPrimaryColor(item) || 'Sem cor';

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 ">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-6">
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

        <div className="px-4 md:px-8 pt-24">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl italic">Estoque <span className="text-secondary">VC</span></h2>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold">Gestão de produtos e movimentações</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Segmented Control Tabs */}
              <div className="relative flex bg-primary/40 p-1 rounded-full border border-secondary/10 backdrop-blur-sm overflow-hidden">
                <motion.div 
                  initial={false}
                  animate={{ x: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute top-1 bottom-1 left-1 w-[calc(100%-8px)] bg-secondary rounded-full shadow-lg shadow-secondary/20"
                />
                <button 
                  onClick={() => setActiveTab('inventory')}
                  className={`relative z-10 flex items-center justify-center gap-2 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 text-primary`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Estoque
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Link 
                  to="/admin/kits/new" 
                  className="px-4 py-2 rounded-full border border-secondary/20 text-secondary/70 font-bold uppercase tracking-widest text-[9px] hover:text-secondary hover:border-secondary transition-all flex items-center gap-1.5 bg-white/5 backdrop-blur-sm active:scale-95"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  Novo Kit
                </Link>
                <Link 
                  to="/admin/products/new" 
                  className="px-4 py-2 rounded-full border border-secondary/20 text-secondary/70 font-bold uppercase tracking-widest text-[9px] hover:text-secondary hover:border-secondary transition-all flex items-center gap-1.5 bg-white/5 backdrop-blur-sm active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Peça
                </Link>
              </div>
            </div>
          </div>

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 bg-primary/20 p-4 rounded-2xl border border-secondary/10 backdrop-blur-sm">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
                  <input 
                    type="text"
                    placeholder="Buscar por nome, SKU ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-primary/40 border border-secondary/10 rounded-xl py-3 pl-12 pr-4 text-xs text-surface placeholder:text-surface/20 focus:outline-none focus:border-secondary/40 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {['Todos', 'Bolsas', 'Carteiras', 'Kits', 'Promoções', 'Acessórios'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`shrink-0 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        selectedCategory === cat 
                          ? 'bg-secondary text-primary border-secondary shadow-lg shadow-secondary/20' 
                          : 'border-secondary/30 text-secondary/70 hover:border-secondary hover:text-secondary bg-transparent'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
          
              {/* Desktop Table View */}
              <div className="hidden md:block glass-card rounded-2xl overflow-hidden border border-secondary/10">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
                  </div>
                ) : inventory.length === 0 ? (
                  <div className="text-center py-20 text-surface/40">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-headline text-lg italic">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-primary/40 border-b border-secondary/10">
                          <th className="px-6 py-4 w-16"></th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Produto</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Marca</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Modelo</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Cor</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Preço Venda</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-center">Lucro</th>
                          
                          {/* PASSO 1: Coluna de Desconto adicionada aqui */}
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-center">Desconto</th>
                          
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-center">Estoque</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary/5">
                        {inventory.map((item) => (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/50 border border-secondary/20 overflow-hidden shadow-inner">
                                <ProductImage src={item.image_url || item.img || 'https://picsum.photos/seed/product/100/100'} alt={item.name} referrerPolicy="no-referrer" />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-surface group-hover:text-secondary transition-colors">{item.name}</span>
                                <span className="text-[9px] text-surface/30 uppercase tracking-widest font-mono mt-0.5">{item.sku || `VC-${item.id.slice(0,4).toUpperCase()}`}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] uppercase tracking-widest text-surface/60 font-bold">{item.brand}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] uppercase tracking-widest text-surface/70 font-bold">{getModel(item)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex max-w-30 items-center rounded-lg border border-secondary/15 bg-secondary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-secondary truncate">
                                {getColor(item)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-secondary">R$ {item.sale_price?.toLocaleString('pt-BR')}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                <TrendingUp className="w-3 h-3" />
                                {calculateProfit(item.cost_price, item.sale_price)}%
                              </span>
                            </td>

                            {/* PASSO 2: Célula de Desconto adicionada aqui com lógica de exibição */}
                            <td className="px-6 py-4 text-center">
                              {item.discount > 0 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-bold">
                                  {item.discount}%
                                </span>
                              ) : (
                                <span className="text-surface/20 font-bold">-</span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center min-w-10 px-2 py-1 rounded-lg text-xs font-bold ${item.stock <= 2 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-secondary/10 text-secondary border border-secondary/20'}`}>
                                {item.stock}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <Link to={`/admin/products/edit/${item.id}`} className="p-2 text-surface/40 hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all">
                                  <Edit3 className="w-4 h-4" />
                                </Link>
                                <button 
                                  onClick={() => setDeleteConfirm({ isOpen: true, id: item.id, name: item.name })}
                                  className="p-2 text-surface/40 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
                  </div>
                ) : inventory.length === 0 ? (
                  <div className="text-center py-12 text-surface/60">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-headline text-lg italic">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  inventory.map((item) => (
                    <div key={item.id} className="glass-card rounded-2xl p-4 border border-secondary/10 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 flex gap-2">
                         <Link to={`/admin/products/edit/${item.id}`} className="p-2 text-surface/40 hover:text-secondary bg-white/5 rounded-lg backdrop-blur-sm">
                          <Edit3 className="w-3.5 h-3.5" />
                        </Link>
                        <button 
                          onClick={() => setDeleteConfirm({ isOpen: true, id: item.id, name: item.name })}
                          className="p-2 text-surface/40 hover:text-rose-400 bg-white/5 rounded-lg backdrop-blur-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-primary/50 border border-secondary/20 overflow-hidden shrink-0 shadow-inner">
                          <ProductImage src={item.image_url || item.img || 'https://picsum.photos/seed/product/100/100'} alt={item.name} referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[8px] font-bold uppercase tracking-widest">
                              <TrendingUp className="w-2.5 h-2.5" />
                              {calculateProfit(item.cost_price, item.sale_price)}%
                            </span>
                            <span className="text-[9px] text-surface/30 uppercase tracking-widest font-mono">{item.sku || `VC-${item.id.slice(0,4).toUpperCase()}`}</span>
                          </div>
                          <h3 className="font-bold text-surface truncate pr-16">{item.name}</h3>
                          <p className="text-[9px] text-surface/40 uppercase tracking-[0.2em] font-bold mt-0.5">{item.brand}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5 pr-14">
                            <span className="rounded-md bg-white/5 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-surface/60">
                              {getModel(item)}
                            </span>
                            <span className="rounded-md bg-secondary/10 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-secondary">
                              {getColor(item)}
                            </span>
                            
                            {/* PASSO 3: Etiqueta de desconto para a versão telemóvel/mobile */}
                            {item.discount > 0 && (
                              <span className="rounded-md bg-yellow-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-yellow-500 border border-yellow-500/20">
                                {item.discount}% OFF
                              </span>
                            )}
                            
                          </div>
                          
                          <div className="flex justify-between items-end mt-3">
                            <div>
                              <p className="text-[8px] text-surface/30 uppercase tracking-widest font-bold mb-0.5">Preço Venda</p>
                              <p className="text-base font-bold text-secondary">R$ {item.sale_price?.toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] text-surface/30 uppercase tracking-widest font-bold mb-0.5">Estoque</p>
                              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${item.stock <= 2 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-secondary/10 text-secondary border border-secondary/20'}`}>
                                {item.stock} un
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />

      {/* Delete Confirmation Modal */}
      <NotificationModal 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja remover "${deleteConfirm.name}" do estoque? Esta ação não pode ser desfeita.`}
        type="warning"
        onConfirm={handleDelete}
      />

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