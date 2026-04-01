import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import NotificationBell from '../../components/NotificationBell';
import MenuButton from '../../components/MenuButton';
import NotificationModal from '../../components/NotificationModal';
import PDFPreviewModal from '../../components/PDFPreviewModal';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');
  const [movements, setMovements] = useState<any[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' });
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
    if (activeTab === 'inventory') {
      fetchInventory();
    } else {
      fetchMovements();
    }
  }, [currentPage, searchTerm, activeTab]);

  const fetchMovements = async () => {
    try {
      setMovementsLoading(true);
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          products:product_id (name, sku)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setMovementsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        // Search by name, brand, sku OR individual IDs
        query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,individual_ids.cs.{${searchTerm}}`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

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

  const filteredMovements = movements.filter(mov => {
    if (filterMonth === 'all') return true;
    const movMonth = new Date(mov.date).getUTCMonth() + 1;
    return movMonth.toString() === filterMonth;
  });

  const totalEntries = filteredMovements
    .filter(m => m.type === 'entry')
    .reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    
  const totalExits = filteredMovements
    .filter(m => m.type === 'exit')
    .reduce((acc, curr) => acc + (curr.quantity || 0), 0);

  const generateMovementsPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header with Gradient-like effect
      doc.setFillColor(191, 155, 48); // Secondary color
      doc.rect(0, 0, 210, 40, 'F');
      
      // Logo
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bolditalic');
      doc.text('VALLE CHIC', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('EXCELÊNCIA EM ACESSÓRIOS', 105, 28, { align: 'center' });
      
      // Report Info
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Movimentação de Estoque', 14, 55);
      
      const monthLabel = filterMonth === 'all' ? 'Todo o período' : `Mês ${filterMonth}`;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${monthLabel}`, 14, 62);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 68);
      
      // Summary Section
      doc.setFillColor(245, 245, 240);
      doc.roundedRect(14, 75, 182, 30, 3, 3, 'F');
      
      doc.setTextColor(191, 155, 48);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO DO PERÍODO', 20, 85);
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.text(`Total de Entradas: ${totalEntries} unidades`, 20, 95);
      doc.text(`Total de Saídas: ${totalExits} unidades`, 110, 95);
      
      // Movements Table
      const tableData = filteredMovements.map(mov => [
        new Date(mov.date).toLocaleDateString('pt-BR'),
        mov.products?.name || 'Produto Excluído',
        mov.type === 'entry' ? 'ENTRADA' : 'SAÍDA',
        mov.quantity.toString(),
        mov.description || '-'
      ]);
      
      autoTable(doc, {
        startY: 115,
        head: [['DATA', 'PRODUTO', 'TIPO', 'QTD', 'DESCRIÇÃO']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [191, 155, 48],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [60, 60, 60]
        },
        columnStyles: {
          2: { halign: 'center', fontStyle: 'bold' },
          3: { halign: 'center' }
        },
        alternateRowStyles: {
          fillColor: [250, 250, 245]
        }
      });
      
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Valle Chic - Sistema de Gestão Interna | Página ${i} de ${pageCount}`,
          105,
          285,
          { align: 'center' }
        );
      }
      
      doc.save(`movimentacao-vallechic-${new Date().getTime()}.pdf`);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar relatório PDF.');
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 overflow-y-auto">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-6">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <div>
              <h2 className="font-headline text-2xl italic">Admin <span className="text-secondary">VC</span></h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'movements' && (
              <button 
                onClick={() => setIsPreviewOpen(true)}
                className="w-10 h-10 rounded-full bg-primary/40 backdrop-blur-sm border border-secondary/20 flex items-center justify-center text-surface/60 hover:text-secondary transition-colors" 
                title="Gerar Relatório PDF"
              >
                <span className="material-symbols-outlined">picture_as_pdf</span>
              </button>
            )}
            <NotificationBell />
          </div>
        </header>

        <div className="px-4 md:px-8">
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
                  animate={{ x: activeTab === 'inventory' ? 0 : '100%' }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-secondary rounded-full shadow-lg shadow-secondary/20"
                />
                <button 
                  onClick={() => setActiveTab('inventory')}
                  className={`relative z-10 flex items-center justify-center gap-2 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'inventory' ? 'text-primary' : 'text-surface/60 hover:text-secondary'}`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Estoque
                </button>
                <button 
                  onClick={() => setActiveTab('movements')}
                  className={`relative z-10 flex items-center justify-center gap-2 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'movements' ? 'text-primary' : 'text-surface/60 hover:text-secondary'}`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Movimentos
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

          {activeTab === 'inventory' ? (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-primary/20 p-4 rounded-2xl border border-secondary/10 backdrop-blur-sm">
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
                  <input 
                    type="text"
                    placeholder="Buscar por nome, SKU ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-primary/40 border border-secondary/10 rounded-xl py-3 pl-12 pr-4 text-xs text-surface placeholder:text-surface/20 focus:outline-none focus:border-secondary/40 transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 bg-primary/40 p-1 rounded-xl border border-secondary/5">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <Filter className="w-3.5 h-3.5 text-secondary" />
                    <span className="text-[10px] uppercase tracking-widest text-surface/40 font-bold">Filtrar</span>
                  </div>
                  <select
                    value={searchTerm === '' ? 'Todos' : searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value === 'Todos' ? '' : e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent border-none py-2 px-4 text-[11px] text-surface focus:outline-none transition-all appearance-none cursor-pointer font-bold min-w-[140px]"
                  >
                    {['Todos', 'Bolsas', 'Maletas', 'Carteiras', 'Acessórios'].map((cat) => (
                      <option key={cat} value={cat} className="bg-primary">{cat}</option>
                    ))}
                  </select>
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
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Preço Venda</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-center">Lucro</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-center">Estoque</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary/5">
                        {inventory.map((item) => (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/50 border border-secondary/20 overflow-hidden shadow-inner">
                                <img src={item.image_url || item.img || 'https://picsum.photos/seed/product/100/100'} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                              <span className="font-bold text-secondary">R$ {item.sale_price?.toLocaleString('pt-BR')}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                <TrendingUp className="w-3 h-3" />
                                {calculateProfit(item.cost_price, item.sale_price)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-xs font-bold ${item.stock <= 2 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-secondary/10 text-secondary border border-secondary/20'}`}>
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
                          <img src={item.image_url || item.img || 'https://picsum.photos/seed/product/100/100'} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
          ) : (
            <div className="space-y-6">
              {/* Summary Panels */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-5 rounded-2xl border border-secondary/10 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-[8px] uppercase tracking-widest text-emerald-400/60 font-bold bg-emerald-500/5 px-2 py-1 rounded-lg">Entradas</span>
                  </div>
                  <p className="text-[10px] text-surface/40 uppercase tracking-widest font-bold mb-1">Total Unidades</p>
                  <p className="font-headline text-3xl text-surface">{totalEntries}</p>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-secondary/10 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <span className="text-[8px] uppercase tracking-widest text-rose-400/60 font-bold bg-rose-500/5 px-2 py-1 rounded-lg">Saídas</span>
                  </div>
                  <p className="text-[10px] text-surface/40 uppercase tracking-widest font-bold mb-1">Total Unidades</p>
                  <p className="font-headline text-3xl text-surface">{totalExits}</p>
                </div>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden border border-secondary/10">
                <div className="p-5 border-b border-secondary/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-headline text-lg italic">Histórico de Movimentações</h3>
                      <p className="text-[9px] text-surface/40 uppercase tracking-widest font-bold">Registros detalhados</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-primary/40 p-1.5 rounded-xl border border-secondary/10">
                    <Calendar className="w-3.5 h-3.5 text-secondary ml-2" />
                    <select 
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="bg-transparent border-none rounded-lg py-1 px-3 text-[11px] text-surface font-bold focus:outline-none appearance-none cursor-pointer min-w-[120px]"
                    >
                      <option value="all">Todo o período</option>
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                        <option key={i} value={String(i + 1)}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-primary/40 border-b border-secondary/10">
                        <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Data</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Produto</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-center">Tipo</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-center">Qtd</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Descrição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/5">
                      {movementsLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto"></div>
                          </td>
                        </tr>
                      ) : filteredMovements.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-10" />
                            <p className="text-surface/40 text-sm italic">Nenhuma movimentação registrada</p>
                          </td>
                        </tr>
                      ) : (
                        filteredMovements.map((mov) => (
                          <tr key={mov.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 text-xs text-surface/60 font-medium">
                              {new Date(mov.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-surface group-hover:text-secondary transition-colors">{mov.products?.name || 'Produto Removido'}</span>
                                <span className="text-[9px] text-surface/30 font-mono uppercase tracking-widest">{mov.products?.sku || '-'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${
                                mov.type === 'entry' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {mov.type === 'entry' ? 'Entrada' : 'Saída'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`font-bold text-sm ${mov.type === 'entry' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {mov.type === 'entry' ? '+' : '-'}{mov.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-surface/50 italic max-w-xs truncate" title={mov.description}>
                                {mov.description || 'Sem descrição'}
                              </p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <PDFPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={() => { generateMovementsPDF(); setIsPreviewOpen(false); }}
        title="Pré-visualização do Relatório de Movimentação"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total de Entradas</p>
              <p className="text-2xl font-serif italic text-slate-900">{totalEntries} unidades</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total de Saídas</p>
              <p className="text-2xl font-serif italic text-slate-900">{totalExits} unidades</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMovements.slice(0, 8).map((mov, idx) => (
                  <tr key={idx} className="text-slate-600">
                    <td className="px-4 py-3">{new Date(mov.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 font-medium">{mov.products?.name || 'Produto Excluído'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${mov.type === 'entry' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {mov.type === 'entry' ? 'ENTRADA' : 'SAÍDA'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{mov.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMovements.length > 8 && (
              <div className="p-3 bg-slate-50 text-center">
                <p className="text-[10px] text-slate-400 italic">E mais {filteredMovements.length - 8} registros no documento completo...</p>
              </div>
            )}
          </div>
        </div>
      </PDFPreviewModal>

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
