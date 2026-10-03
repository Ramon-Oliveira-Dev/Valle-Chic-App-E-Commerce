import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { api } from '../../services/api';
import { toast } from 'sonner';
import NotificationModal from '../../components/NotificationModal';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import ProductImage from '../../components/ProductImage';
import PDFPreviewModal from '../../components/PDFPreviewModal';
import { CustomDropdown } from '../../components/CustomDropdown';
import { getPrimaryColor } from '../../lib/productMetadata';
import { useTheme } from '../../contexts/ThemeContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Package, 
  Plus, 
  Boxes, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  FileText, 
  AlertTriangle,
  ArrowUpDown,
  ShoppingBag,
  Sparkles,
  Percent,
  Layers,
  X,
  CheckCircle2,
  DollarSign,
  Calendar
} from 'lucide-react';

export default function AdminProducts() {
  const { isDesktopSidebarCollapsed } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [soldProducts, setSoldProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedStockStatus, setSelectedStockStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price_desc' | 'price_asc' | 'stock_asc' | 'stock_desc' | 'recent' | 'oldest'>('recent');
  const [activeTab, setActiveTab] = useState<'catalog' | 'sold'>('catalog');

  // Date Filtering: Dia, Mês, Ano ou Específica
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | 'month' | 'year' | 'custom'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  // Modal states
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({ 
    isOpen: false, 
    id: '', 
    name: '' 
  });
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

  useEffect(() => {
    fetchProducts();
    fetchSoldProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setProducts(data);
          return;
        }
      }
      const fallbackList = await api.products.getAll();
      setProducts(fallbackList || []);
    } catch (error) {
      console.error('Error fetching products, falling back to local list:', error);
      const fallbackList = await api.products.getAll();
      setProducts(fallbackList || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchSoldProducts = async () => {
    try {
      if (!isSupabaseConfigured) {
        setSoldProducts([]);
        return;
      }
      const { data: rawItems, error } = await supabase
        .from('sale_items')
        .select('quantity, unit_price, product_id, sale_id')
        .order('created_at', { ascending: false });

      if (error || !rawItems) {
        setSoldProducts([]);
        return;
      }

      const productIds = [...new Set(rawItems.map(i => i.product_id).filter(Boolean))];
      const saleIds = [...new Set(rawItems.map(i => i.sale_id).filter(Boolean))];

      const [prodsRes, salesRes] = await Promise.all([
        productIds.length > 0 ? supabase.from('products').select('id, name, brand, category, sku').in('id', productIds) : { data: [] },
        saleIds.length > 0 ? supabase.from('sales').select('id, sale_date, payment_method, client_id').in('id', saleIds) : { data: [] }
      ]);

      const salesList = salesRes.data || [];
      const clientIds = [...new Set(salesList.map(s => s.client_id).filter(Boolean))];
      const { data: clientsData } = clientIds.length > 0
        ? await supabase.from('clients').select('id, name').in('id', clientIds)
        : { data: [] };

      const productsMap = new Map((prodsRes.data || []).map(p => [p.id, p]));
      const clientsMap = new Map((clientsData || []).map(c => [c.id, c]));
      const salesMap = new Map(salesList.map(s => [s.id, {
        ...s,
        clientName: clientsMap.get(s.client_id)?.name || 'Cliente Balcão'
      }]));

      const formattedSold = rawItems.map((item: any) => {
        const prod = productsMap.get(item.product_id);
        const sale = salesMap.get(item.sale_id);

        return {
          name: prod?.name || 'Produto sem nome',
          brand: prod?.brand || 'Valle Chic',
          category: prod?.category || 'Geral',
          sku: prod?.sku || '',
          quantity: item.quantity || 1,
          price: item.unit_price || 0,
          saleDate: sale?.sale_date ? new Date(sale.sale_date).toLocaleDateString('pt-BR') : 'Data recente',
          clientName: sale?.clientName || 'Cliente Balcão',
          paymentMethod: sale?.payment_method?.toUpperCase() || 'PIX'
        };
      });

      setSoldProducts(formattedSold);
    } catch (error: any) {
      console.warn('Error fetching sold products:', error?.message || error);
      setSoldProducts([]);
    }
  };

  const handleStockEntry = async (id: string, currentStock: number) => {
    const newStock = (Number(currentStock) || 0) + 1;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
    toast.success('Estoque aumentado (+1)');

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', id);

        if (error) throw error;
      } else {
        await api.products.update(id, { stock: newStock });
      }
    } catch (error: any) {
      console.error('Error updating stock:', error);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: currentStock } : p));
      toast.error('Erro ao atualizar estoque');
    }
  };

  const handleStockExit = async (id: string, currentStock: number) => {
    if (currentStock <= 0) return;
    const newStock = currentStock - 1;
    
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
    toast.success('Estoque reduzido (-1)');

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', id);

        if (error) throw error;
      } else {
        await api.products.update(id, { stock: newStock });
      }
    } catch (error: any) {
      console.error('Error updating stock:', error);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: currentStock } : p));
      toast.error('Erro ao atualizar estoque');
    }
  };

  const handleDeleteProduct = async () => {
    const { id, name } = deleteConfirm;
    try {
      await api.products.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success(`"${name}" removido com sucesso.`);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Erro ao remover produto.');
    } finally {
      setDeleteConfirm({ isOpen: false, id: '', name: '' });
    }
  };

  const calculateProfit = (cost: number, sale: number) => {
    if (!cost || cost === 0) return 0;
    return Math.round(((sale - cost) / cost) * 100);
  };

  const getModel = (item: any) => item.model || item.modelo || 'Padrão';
  const getColor = (item: any) => getPrimaryColor(item) || 'Neutro';

  const formatEntryDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('pt-BR');
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatEntryTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);

    return products.filter((product) => {
      // 1. Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = product.name?.toLowerCase().includes(term);
        const matchBrand = product.brand?.toLowerCase().includes(term);
        const matchCategory = product.category?.toLowerCase().includes(term);
        const matchModel = (product.model || product.modelo)?.toLowerCase().includes(term);
        const matchSku = product.sku?.toLowerCase().includes(term);
        if (!matchName && !matchBrand && !matchCategory && !matchModel && !matchSku) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== 'Todos') {
        const cat = selectedCategory.toLowerCase();
        if (selectedCategory === 'Promoções') {
          if (!product.discount || product.discount <= 0) return false;
        } else if (selectedCategory === 'Kits') {
          if (!product.is_kit && !product.isKit && product.category?.toLowerCase() !== 'kits') return false;
        } else {
          if (product.category?.toLowerCase() !== cat) return false;
        }
      }

      // 3. Stock status filter
      if (selectedStockStatus === 'in_stock' && product.stock <= 2) return false;
      if (selectedStockStatus === 'low_stock' && (product.stock <= 0 || product.stock > 2)) return false;
      if (selectedStockStatus === 'out_of_stock' && product.stock > 0) return false;

      // 4. Entry Date filter (Dia, Mês, Ano, Custom)
      const pDate = product.created_at ? new Date(product.created_at) : new Date();
      const pDateIso = pDate.toISOString().slice(0, 10);
      const pMonth = pDate.getMonth() + 1;
      const pYear = pDate.getFullYear();

      if (dateFilterType === 'today') {
        if (pDateIso !== todayIso) return false;
      } else if (dateFilterType === 'month') {
        if (Number(selectedMonth) !== pMonth || Number(selectedYear) !== pYear) return false;
      } else if (dateFilterType === 'year') {
        if (Number(selectedYear) !== pYear) return false;
      } else if (dateFilterType === 'custom') {
        if (selectedDate && pDateIso !== selectedDate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'price_desc') return (b.sale_price || 0) - (a.sale_price || 0);
      if (sortBy === 'price_asc') return (a.sale_price || 0) - (b.sale_price || 0);
      if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
      if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
      if (sortBy === 'recent') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return 0;
    });
  }, [products, searchTerm, selectedCategory, selectedStockStatus, sortBy, dateFilterType, selectedDate, selectedMonth, selectedYear]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = products.length;
    const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
    const totalStockValue = products.reduce((acc, p) => acc + ((Number(p.sale_price) || 0) * (Number(p.stock) || 0)), 0);
    const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= 2 && (Number(p.stock) || 0) > 0).length;
    const outOfStockCount = products.filter(p => (Number(p.stock) || 0) <= 0).length;
    const promoCount = products.filter(p => (Number(p.discount) || 0) > 0).length;
    return { totalCount, totalUnits, totalStockValue, lowStockCount, outOfStockCount, promoCount };
  }, [products]);

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const current = new Date().getFullYear();
    yearsSet.add(String(current));
    yearsSet.add(String(current - 1));
    products.forEach(p => {
      if (p.created_at) {
        try {
          const y = new Date(p.created_at).getFullYear();
          if (y) yearsSet.add(String(y));
        } catch {}
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [products]);

  const monthsList = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  // PDF Export
  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Valle Chic - Catálogo & Gestão de Produtos', 14, 20);
    doc.setFontSize(10);
    doc.text(`Relatório emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);
    doc.text(`Total de Produtos: ${filteredProducts.length} | Valor Total em Estoque: R$ ${stats.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 34);

    const tableData = filteredProducts.map((p) => [
      p.sku || `VC-${p.id.slice(0, 4).toUpperCase()}`,
      p.name,
      p.brand || 'Valle Chic',
      p.category || 'Geral',
      formatEntryDate(p.created_at),
      `R$ ${(p.sale_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `${p.discount ? `${p.discount}%` : '-'}`,
      `${p.stock || 0} un`
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['SKU', 'Produto', 'Marca', 'Categoria', 'Data Entrada', 'Preço', 'Desc.', 'Estoque']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [244, 192, 37], textColor: [11, 17, 29] },
      styles: { fontSize: 8, cellPadding: 2 }
    });

    doc.save(`catalogo-produtos-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Relatório PDF baixado com sucesso!');
    setIsPreviewOpen(false);
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col selection:bg-secondary selection:text-primary">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className={`flex-1 min-w-0 p-0 pb-28 ${isDesktopSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px]'} transition-all duration-300`}>
        {/* Top Navbar */}
        <header className={`fixed top-0 left-0 right-0 ${isDesktopSidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[240px]'} z-40 flex items-center justify-between px-4 sm:px-6 py-4 bar-fume transition-all duration-300 border-b border-white/5`}>
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <MenuButton onClick={() => setIsSidebarOpen(true)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface/80 hover:text-secondary border border-white/10 text-xs font-bold uppercase tracking-wider transition-colors"
              title="Gerar PDF do Catálogo"
            >
              <FileText className="w-3.5 h-3.5 text-secondary" />
              Relatório PDF
            </button>
            <NotificationSino />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="px-6 lg:px-10 max-w-[1600px] mx-auto pt-24 w-full">
          
          {/* Header & Main Actions */}
          <div className="mb-4 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-2xl sm:text-3xl italic tracking-tight">Produtos <span className="text-secondary">VC</span></h1>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-bold">
                  {filteredProducts.length} de {stats.totalCount} itens
                </span>
              </div>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
                Catálogo completo de peças, coleções e estoque ativo
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              <Link 
                to="/admin/kits/new" 
                className="px-4 py-2.5 rounded-xl border border-secondary/30 text-secondary hover:bg-secondary/10 font-bold uppercase tracking-widest text-[10px] transition-all flex items-center gap-1.5 bg-white/5 shadow-sm active:scale-95"
              >
                <Boxes className="w-4 h-4 text-secondary" />
                Novo Kit
              </Link>
              <Link 
                to="/admin/products/new" 
                className="bg-secondary text-primary px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-secondary/90 transition-all flex items-center gap-1.5 shadow-lg shadow-secondary/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Novo Produto
              </Link>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div className="glass-card rounded-2xl p-4 border border-white/5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-surface/60 mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold">Total no Catálogo</span>
                <Package className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-surface">{stats.totalCount}</p>
                <p className="text-[10px] text-surface/50 mt-0.5">{stats.totalUnits} unidades totais</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-surface/60 mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold">Valor em Estoque</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-secondary">
                  R$ {stats.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Preço de venda
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-surface/60 mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold">Estoque Crítico</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-rose-400">
                  {stats.lowStockCount + stats.outOfStockCount}
                </p>
                <p className="text-[10px] text-surface/50 mt-0.5">
                  {stats.outOfStockCount} esgotados • {stats.lowStockCount} baixos
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-surface/60 mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold">Em Promoção</span>
                <Percent className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-yellow-400">{stats.promoCount}</p>
                <p className="text-[10px] text-surface/50 mt-0.5">com desconto ativo</p>
              </div>
            </div>
          </div>

          {/* Tab Selector: Catálogo & Estoque / Histórico de Vendas */}
          <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'catalog' 
                  ? 'bg-secondary text-primary shadow-md shadow-secondary/20' 
                  : 'text-surface/60 hover:text-surface hover:bg-white/5'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Catálogo de Produtos ({filteredProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('sold')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'sold' 
                  ? 'bg-secondary text-primary shadow-md shadow-secondary/20' 
                  : 'text-surface/60 hover:text-surface hover:bg-white/5'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Vendas Recentes ({soldProducts.length})
            </button>
          </div>

          {activeTab === 'catalog' && (
            <div className="space-y-4">
              
              {/* ========================================================================= */}
              {/* FROZEN / STICKY SEARCH & DATE FILTERS BAR                                 */}
              {/* ========================================================================= */}
              <div className="sticky top-[64px] z-30 bg-[#060D1A]/95 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-secondary/15 shadow-2xl space-y-3 transition-all">
                
                {/* Search, Stock Status & Date Selector Row */}
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface/40" />
                    <input 
                      type="text"
                      placeholder="Buscar por nome, SKU, marca, modelo ou categoria..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-primary/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-9 text-xs sm:text-sm text-surface placeholder:text-surface/30 focus:outline-none focus:border-secondary transition-all shadow-inner"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface/40 hover:text-surface"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Stock Status & Sort select */}
                  <div className="flex flex-wrap items-center gap-2 min-w-[150px]">
                    <CustomDropdown
                      value={selectedStockStatus}
                      onChange={(val) => setSelectedStockStatus(val)}
                      options={[
                        { value: 'all', label: 'Status: Todos' },
                        { value: 'in_stock', label: 'Em Estoque (> 2)' },
                        { value: 'low_stock', label: 'Estoque Baixo (1-2)' },
                        { value: 'out_of_stock', label: 'Esgotado (0)' }
                      ]}
                      className="min-w-[150px]"
                    />

                    <CustomDropdown
                      value={sortBy}
                      onChange={(val) => setSortBy(val)}
                      options={[
                        { value: 'recent', label: 'Mais Recentes' },
                        { value: 'oldest', label: 'Mais Antigos' },
                        { value: 'name', label: 'Nome A-Z' },
                        { value: 'price_desc', label: 'Preço: Maior' },
                        { value: 'price_asc', label: 'Preço: Menor' },
                        { value: 'stock_asc', label: 'Estoque: Menor' },
                        { value: 'stock_desc', label: 'Estoque: Maior' }
                      ]}
                      className="min-w-[150px]"
                    />
                  </div>
                </div>

                {/* Entry Date Filter Buttons: Todas | Hoje | Mês | Ano | Data Exata */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
                  
                  {/* Category Chips Bar */}
                  <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                    {['Todos', 'Bolsas', 'Carteiras', 'Maletas', 'Kits', 'Promoções', 'Acessórios'].map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                            isSelected 
                              ? 'bg-secondary text-primary border-secondary shadow-md shadow-secondary/20' 
                              : 'bg-white/5 border-white/10 text-surface/70 hover:border-secondary/40 hover:text-secondary'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Date Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 bg-primary/40 p-1 rounded-xl border border-secondary/15">
                    <span className="text-[9px] uppercase tracking-wider text-surface/40 font-bold px-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-secondary" /> Entrada:
                    </span>

                    <button
                      onClick={() => setDateFilterType('all')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        dateFilterType === 'all'
                          ? 'bg-secondary text-primary shadow-sm shadow-secondary/20'
                          : 'text-surface/60 hover:text-surface hover:bg-white/5'
                      }`}
                    >
                      Todas
                    </button>

                    <button
                      onClick={() => setDateFilterType('today')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        dateFilterType === 'today'
                          ? 'bg-secondary text-primary shadow-sm shadow-secondary/20'
                          : 'text-surface/60 hover:text-surface hover:bg-white/5'
                      }`}
                    >
                      Hoje
                    </button>

                    <button
                      onClick={() => setDateFilterType('month')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        dateFilterType === 'month'
                          ? 'bg-secondary text-primary shadow-sm shadow-secondary/20'
                          : 'text-surface/60 hover:text-surface hover:bg-white/5'
                      }`}
                    >
                      Mês
                    </button>

                    <button
                      onClick={() => setDateFilterType('year')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        dateFilterType === 'year'
                          ? 'bg-secondary text-primary shadow-sm shadow-secondary/20'
                          : 'text-surface/60 hover:text-surface hover:bg-white/5'
                      }`}
                    >
                      Ano
                    </button>

                    <button
                      onClick={() => setDateFilterType('custom')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        dateFilterType === 'custom'
                          ? 'bg-secondary text-primary shadow-sm shadow-secondary/20'
                          : 'text-surface/60 hover:text-surface hover:bg-white/5'
                      }`}
                    >
                      Dia
                    </button>

                    {dateFilterType === 'month' && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="bg-primary/90 border border-secondary/20 rounded-lg px-2 py-1 text-[11px] text-surface font-semibold focus:outline-none focus:border-secondary cursor-pointer"
                        >
                          {monthsList.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="bg-primary/90 border border-secondary/20 rounded-lg px-2 py-1 text-[11px] text-surface font-semibold focus:outline-none focus:border-secondary cursor-pointer"
                        >
                          {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {dateFilterType === 'year' && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="bg-primary/90 border border-secondary/20 rounded-lg px-2 py-1 text-[11px] text-surface font-semibold focus:outline-none focus:border-secondary cursor-pointer"
                        >
                          {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {dateFilterType === 'custom' && (
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-primary/90 border border-secondary/20 rounded-lg px-2 py-0.5 text-[11px] text-surface font-semibold focus:outline-none focus:border-secondary ml-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Table / Cards Container */}
              <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
                    <p className="text-xs text-surface/50 uppercase tracking-widest">Carregando catálogo...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <Package className="w-12 h-12 mx-auto mb-3 text-secondary/30" />
                    <h3 className="font-headline text-lg italic">Nenhum produto encontrado</h3>
                    <p className="text-xs text-surface/50 mt-1 max-w-sm mx-auto">
                      Tente ajustar os filtros ou a palavra de busca para localizar as peças.
                    </p>
                    {(searchTerm || selectedCategory !== 'Todos' || selectedStockStatus !== 'all' || dateFilterType !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('Todos');
                          setSelectedStockStatus('all');
                          setDateFilterType('all');
                        }}
                        className="mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-secondary font-bold"
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* ========================================================================= */}
                    {/* DESKTOP & TABLET TABLE VIEW (Frozen THEAD + Responsive scroll container)  */}
                    {/* ========================================================================= */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1040px]">
                        
                        {/* FROZEN / STICKY THEAD */}
                        <thead className="sticky top-0 z-10 bg-[#0B111D] shadow-sm">
                          <tr className="bg-primary/60 border-b border-white/10 text-[10px] uppercase tracking-wider text-surface/60 font-bold">
                            <th className="py-3.5 px-4 w-14"></th>
                            <th className="py-3.5 px-4">Produto & SKU</th>
                            <th className="py-3.5 px-4">Marca</th>
                            <th className="py-3.5 px-4">Categoria</th>
                            <th className="py-3.5 px-4">Modelo / Cor</th>
                            <th className="py-3.5 px-4">Data Entrada</th>
                            <th className="py-3.5 px-4">Preço Venda</th>
                            <th className="py-3.5 px-4 text-center">Lucro Estimado</th>
                            <th className="py-3.5 px-4 text-center">Desconto</th>
                            <th className="py-3.5 px-4 text-center">Estoque</th>
                            <th className="py-3.5 px-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                          {filteredProducts.map((product) => {
                            const isLowStock = product.stock <= 2 && product.stock > 0;
                            const isOutOfStock = product.stock <= 0;
                            const profitPercent = calculateProfit(product.cost_price, product.sale_price);
                            const profitReais = product.cost_price 
                              ? (product.sale_price || 0) - product.cost_price 
                              : (product.sale_price || 0) * 0.4;

                            return (
                              <tr 
                                key={product.id} 
                                className="hover:bg-white/5 transition-colors group"
                              >
                                {/* Image */}
                                <td className="py-3.5 px-4">
                                  <div className="w-12 h-12 rounded-xl bg-primary/60 border border-white/10 overflow-hidden shadow-sm shrink-0 flex items-center justify-center relative">
                                    <ProductImage 
                                      src={product.image_url || product.img || 'https://picsum.photos/seed/product/100/100'} 
                                      alt={product.name} 
                                      referrerPolicy="no-referrer" 
                                    />
                                    {product.discount > 0 && (
                                      <span className="absolute top-0 right-0 bg-yellow-500 text-slate-900 text-[8px] font-black px-1 rounded-bl">
                                        %
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Name & SKU */}
                                <td className="py-3.5 px-4">
                                  <div className="flex flex-col max-w-[200px]">
                                    <span className="font-bold text-surface group-hover:text-secondary transition-colors truncate">
                                      {product.name}
                                    </span>
                                    <span className="text-[10px] text-surface/40 uppercase tracking-widest font-mono mt-0.5">
                                      {product.sku || `VC-${product.id.slice(0, 4).toUpperCase()}`}
                                    </span>
                                  </div>
                                </td>

                                {/* Brand */}
                                <td className="py-3.5 px-4">
                                  <span className="text-[11px] uppercase tracking-wider text-surface/70 font-semibold">
                                    {product.brand || 'Valle Chic'}
                                  </span>
                                </td>

                                {/* Category */}
                                <td className="py-3.5 px-4">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-surface/80 font-bold">
                                    {product.category || 'Geral'}
                                  </span>
                                </td>

                                {/* Model / Color */}
                                <td className="py-3.5 px-4">
                                  <div className="flex flex-col gap-1 items-start">
                                    <span className="text-[11px] text-surface/80 font-medium truncate max-w-[120px]">
                                      {getModel(product)}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-wider text-secondary/80 font-bold">
                                      {getColor(product)}
                                    </span>
                                  </div>
                                </td>

                                {/* DATA DE ENTRADA */}
                                <td className="py-3.5 px-4">
                                  <div className="flex flex-col">
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-surface/90">
                                      <Calendar className="w-3 h-3 text-secondary" />
                                      {formatEntryDate(product.created_at)}
                                    </span>
                                    {product.created_at && (
                                      <span className="text-[9px] text-surface/40 font-mono mt-0.5">
                                        {formatEntryTime(product.created_at)}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Preço Venda */}
                                <td className="py-3.5 px-4">
                                  <span className="font-bold text-secondary text-sm whitespace-nowrap">
                                    R$ {(product.sale_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </td>

                                {/* Lucro em R$ e % */}
                                <td className="py-3.5 px-4 text-center">
                                  <div className="inline-flex flex-col items-center justify-center">
                                    <span className="font-bold text-emerald-400 text-xs whitespace-nowrap">
                                      +R$ {profitReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    {profitPercent > 0 && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400/80 font-bold mt-0.5 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                        <TrendingUp className="w-2.5 h-2.5" /> +{profitPercent}%
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Discount */}
                                <td className="py-3.5 px-4 text-center">
                                  {product.discount > 0 ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold">
                                      {product.discount}% OFF
                                    </span>
                                  ) : (
                                    <span className="text-surface/30 text-xs">-</span>
                                  )}
                                </td>

                                {/* Stock with Quick Adjusters */}
                                <td className="py-3.5 px-4 text-center">
                                  <div className="inline-flex items-center gap-1.5 bg-primary/40 p-1 rounded-xl border border-white/10">
                                    <button 
                                      onClick={() => handleStockExit(product.id, product.stock)}
                                      disabled={isOutOfStock}
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                        !isOutOfStock
                                          ? 'hover:bg-rose-500/20 text-rose-400 hover:scale-110 active:scale-95' 
                                          : 'text-surface/20 cursor-not-allowed'
                                      }`}
                                      title="Diminuir estoque (-1)"
                                    >
                                      -
                                    </button>
                                    
                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold min-w-10 text-center ${
                                      isOutOfStock 
                                        ? 'bg-rose-500/20 text-rose-400' 
                                        : isLowStock 
                                          ? 'bg-amber-500/20 text-amber-400' 
                                          : 'bg-emerald-500/20 text-emerald-400'
                                    }`}>
                                      {product.stock} un
                                    </span>

                                    <button 
                                      onClick={() => handleStockEntry(product.id, product.stock)}
                                      className="w-6 h-6 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 hover:scale-110 active:scale-95 transition-all"
                                      title="Aumentar estoque (+1)"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Link 
                                      to={`/admin/products/edit/${product.id}`}
                                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-secondary/20 text-surface/60 hover:text-secondary flex items-center justify-center transition-colors"
                                      title="Editar Produto"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </Link>
                                    <button 
                                      onClick={() => setDeleteConfirm({ isOpen: true, id: product.id, name: product.name })}
                                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-rose-500/20 text-surface/60 hover:text-rose-400 flex items-center justify-center transition-colors"
                                      title="Remover Produto"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ========================================================================= */}
                    {/* MOBILE CARD VIEW (Fluid, thumb-friendly on all mobile viewports)          */}
                    {/* ========================================================================= */}
                    <div className="md:hidden divide-y divide-white/5">
                      {filteredProducts.map((product) => {
                        const isLowStock = product.stock <= 2 && product.stock > 0;
                        const isOutOfStock = product.stock <= 0;
                        const profitPercent = calculateProfit(product.cost_price, product.sale_price);
                        const profitReais = product.cost_price 
                          ? (product.sale_price || 0) - product.cost_price 
                          : (product.sale_price || 0) * 0.4;

                        return (
                          <div key={product.id} className="p-4 space-y-3">
                            <div className="flex gap-3 items-start">
                              {/* Thumbnail */}
                              <div className="w-16 h-16 rounded-xl bg-primary/60 border border-white/10 overflow-hidden shrink-0 shadow-sm relative">
                                <ProductImage 
                                  src={product.image_url || product.img || 'https://picsum.photos/seed/product/100/100'} 
                                  alt={product.name} 
                                  referrerPolicy="no-referrer" 
                                />
                                {product.discount > 0 && (
                                  <span className="absolute top-0 right-0 bg-yellow-500 text-slate-900 text-[8px] font-black px-1 rounded-bl">
                                    {product.discount}%
                                  </span>
                                )}
                              </div>

                              {/* Title & Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-bold text-surface text-sm line-clamp-1">{product.name}</h4>
                                    <p className="text-[10px] text-surface/40 uppercase tracking-widest font-mono">
                                      {product.sku || `VC-${product.id.slice(0, 4).toUpperCase()}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Link 
                                      to={`/admin/products/edit/${product.id}`}
                                      className="p-1.5 rounded-lg bg-white/5 text-surface/60 hover:text-secondary"
                                      title="Editar"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </Link>
                                    <button 
                                      onClick={() => setDeleteConfirm({ isOpen: true, id: product.id, name: product.name })}
                                      className="p-1.5 rounded-lg bg-white/5 text-surface/60 hover:text-rose-400"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Data de Entrada */}
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-surface/60">
                                  <Calendar className="w-3 h-3 text-secondary" />
                                  <span>Entrada: <strong>{formatEntryDate(product.created_at)}</strong></span>
                                </div>

                                {/* Tags Row */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-surface/70 font-semibold uppercase">
                                    {product.brand || 'Valle Chic'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-surface/70 font-semibold uppercase">
                                    {product.category || 'Geral'}
                                  </span>
                                  {product.model && (
                                    <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-secondary font-medium">
                                      {getModel(product)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Middle Profit Highlight on Mobile */}
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                              <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-emerald-400" /> Lucro Estimado:
                              </span>
                              <span className="text-xs font-bold text-emerald-400">
                                +R$ {profitReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {profitPercent > 0 && `(+${profitPercent}%)`}
                              </span>
                            </div>

                            {/* Bottom Card Controls: Price vs Stock Adjuster */}
                            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                              <div>
                                <p className="text-[9px] uppercase tracking-wider text-surface/40 font-bold">Preço de Venda</p>
                                <span className="text-base font-bold text-secondary">
                                  R$ {(product.sale_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              {/* Finger-friendly Stock Buttons */}
                              <div className="flex items-center gap-1.5 bg-primary/60 p-1 rounded-xl border border-white/10">
                                <button 
                                  onClick={() => handleStockExit(product.id, product.stock)}
                                  disabled={isOutOfStock}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                                    !isOutOfStock
                                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 active:scale-95' 
                                      : 'text-surface/20 cursor-not-allowed'
                                  }`}
                                  title="Reduzir estoque"
                                >
                                  -
                                </button>
                                
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold min-w-10 text-center ${
                                  isOutOfStock 
                                    ? 'bg-rose-500/20 text-rose-400' 
                                    : isLowStock 
                                      ? 'bg-amber-500/20 text-amber-400' 
                                      : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {product.stock} un
                                </span>

                                <button 
                                  onClick={() => handleStockEntry(product.id, product.stock)}
                                  className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm active:scale-95"
                                  title="Aumentar estoque"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tab: Histórico de Produtos Vendidos */}
          {activeTab === 'sold' && (
            <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-headline text-lg italic">Itens Vendidos Recentemente</h3>
                  <p className="text-xs text-surface/50 mt-0.5">Histórico extraído dos pedidos e vendas finalizadas.</p>
                </div>
              </div>

              {soldProducts.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-secondary/30" />
                  <p className="font-headline text-lg italic">Nenhuma venda registrada ainda</p>
                  <p className="text-xs text-surface/50 mt-1">Quando você registrar vendas, elas aparecerão listadas aqui.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-primary/40 border-b border-white/10 text-[10px] uppercase tracking-wider text-surface/60 font-bold">
                          <th className="py-3.5 px-4">Produto</th>
                          <th className="py-3.5 px-4">Marca & Categoria</th>
                          <th className="py-3.5 px-4">Preço Unitário</th>
                          <th className="py-3.5 px-4 text-center">Quantidade</th>
                          <th className="py-3.5 px-4">Data Venda</th>
                          <th className="py-3.5 px-4">Cliente</th>
                          <th className="py-3.5 px-4 text-right">Pagamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {soldProducts.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-surface">{item.name}</td>
                            <td className="py-3.5 px-4 text-xs text-surface/70">
                              {item.brand} • {item.category}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-secondary">
                              R$ {(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-surface/80">{item.quantity} un</td>
                            <td className="py-3.5 px-4 text-xs text-surface/70">{item.saleDate}</td>
                            <td className="py-3.5 px-4 text-xs text-surface/90 font-medium">{item.clientName}</td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="px-2 py-0.5 rounded bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold">
                                {item.paymentMethod}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Sold Cards */}
                  <div className="md:hidden divide-y divide-white/5">
                    {soldProducts.map((item, idx) => (
                      <div key={idx} className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-surface text-sm">{item.name}</h4>
                            <p className="text-[10px] text-surface/50 uppercase tracking-widest">{item.brand} • {item.category}</p>
                          </div>
                          <span className="text-secondary font-bold text-sm">
                            R$ {(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-surface/40">Cliente</p>
                            <p className="text-surface/80 font-medium truncate">{item.clientName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-wider text-surface/40">Data & Pagto</p>
                            <p className="text-surface/80">{item.saleDate} • <span className="text-secondary font-bold">{item.paymentMethod}</span></p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </main>

      <BottomNavigation />

      {/* Delete Confirmation Modal */}
      <NotificationModal 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
        title="Remover Produto"
        message={`Tem certeza que deseja remover "${deleteConfirm.name}" do catálogo? Esta ação é irreversível.`}
        type="warning"
        onConfirm={handleDeleteProduct}
      />

      {/* PDF Preview Modal */}
      <PDFPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={generatePDF}
        title="Prévia do Catálogo em PDF"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            O documento abaixo contém todos os <strong>{filteredProducts.length}</strong> produtos filtrados atualmente.
          </p>
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Produto</th>
                  <th className="p-2">Data Entrada</th>
                  <th className="p-2">Preço</th>
                  <th className="p-2 text-center">Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredProducts.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td className="p-2 font-mono">{p.sku || `VC-${p.id.slice(0, 4).toUpperCase()}`}</td>
                    <td className="p-2 font-medium">{p.name}</td>
                    <td className="p-2">{formatEntryDate(p.created_at)}</td>
                    <td className="p-2 font-bold text-amber-600">R$ {p.sale_price?.toLocaleString('pt-BR')}</td>
                    <td className="p-2 text-center font-bold">{p.stock} un</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProducts.length > 8 && (
            <p className="text-[11px] text-slate-400 text-center italic">
              + {filteredProducts.length - 8} outros produtos incluídos no PDF final...
            </p>
          )}
        </div>
      </PDFPreviewModal>

      {/* Generic Modal */}
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
