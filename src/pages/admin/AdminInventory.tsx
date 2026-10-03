import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { api } from '../../services/api';
import { toast } from 'sonner';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import NotificationModal from '../../components/NotificationModal';
import PDFPreviewModal from '../../components/PDFPreviewModal';
import { CustomDropdown } from '../../components/CustomDropdown';
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
  Calendar,
  CalendarDays,
  CalendarRange,
  X,
  Pin,
  ShoppingBag,
  DollarSign,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useTheme } from '../../contexts/ThemeContext';

export default function AdminInventory() {
  const { isDesktopSidebarCollapsed } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  // Date Filtering states: dia, mês, ano ou personalizada
  const [dateFilterType, setDateFilterType] = useState<'all' | 'today' | 'month' | 'year' | 'custom'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  
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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const loadImage = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const generateInventoryPDF = async () => {
    try {
      toast.info('Gerando relatório PDF de alta qualidade...');
      const doc = new jsPDF();
      const primaryColor = [6, 13, 26]; // #060D1A
      const secondaryColor = [244, 192, 37]; // #F4C025

      // Load logo image
      const logoImg = await loadImage('/pwa-512x512.png') || await loadImage('/apple-touch-icon.png');

      // 1. Header main block inside 10mm margin (y: 10 to 46, width: 190)
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.roundedRect(10, 10, 190, 36, 4, 4, 'F');

      // Top Accent Gold Border on Header block
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.roundedRect(10, 10, 190, 2.5, 2, 2, 'F');

      // Render Logo or Brand Badge
      if (logoImg) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, 15, 26, 26, 3, 3, 'F');
        doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setLineWidth(0.4);
        doc.roundedRect(15, 15, 26, 26, 3, 3, 'S');
        
        doc.addImage(logoImg, 'PNG', 16, 16, 24, 24);
      } else {
        doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.roundedRect(15, 15, 26, 26, 3, 3, 'F');
        doc.setFont('serif', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('VC', 28, 30, { align: 'center' });
      }

      // Brand Title & Subtitle
      const titleX = 46;
      doc.setFont('serif', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(21);
      doc.text('VALLE CHIC', titleX, 23);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('RELATÓRIO EXECUTIVO DE ESTOQUE', titleX, 30);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(180, 190, 205);
      doc.text('Sistema de Gestão & Controle de Produtos', titleX, 35);

      // Meta Box (Top Right, Margin Right = 10mm -> ends at x=200)
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      doc.setFillColor(15, 25, 45);
      doc.roundedRect(138, 14, 57, 28, 3, 3, 'F');
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(138, 14, 57, 28, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('DOCUMENTO OFICIAL', 142, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(220, 225, 235);
      doc.text(`Emissão: ${dateStr} às ${timeStr}`, 142, 25);
      doc.text(`Categoria: ${selectedCategory}`, 142, 30);
      doc.text(`Itens Listados: ${filteredInventory.length} de ${inventory.length}`, 142, 35);

      // 3. Executive KPI Summary Cards (Margins: 10mm Left, 10mm Right -> Printable Width = 190mm)
      const totalItems = filteredInventory.reduce((acc, item) => acc + (item.stock || 0), 0);
      const totalCost = filteredInventory.reduce((acc, item) => acc + ((item.cost_price || 0) * (item.stock || 0)), 0);
      const totalValue = filteredInventory.reduce((acc, item) => acc + ((item.price || 0) * (item.stock || 0)), 0);
      const estimatedMargin = totalValue > 0 ? Math.round(((totalValue - totalCost) / totalValue) * 100) : 0;

      // Card 1: Quantidade Total (x=10, width=60)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(10, 51, 60, 18, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL DE PEÇAS', 14, 56);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${totalItems} un.`, 14, 63);

      // Card 2: Custo Total (Investimento) (x=75, width=60)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(75, 51, 60, 18, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text('CUSTO INVESTIDO', 79, 56);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 79, 63);

      // Card 3: Valor de Venda (Destaque Gold & Navy) (x=140, width=60, ends at x=200)
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(140, 51, 60, 18, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('VALOR ESTIMADO (VENDA)', 144, 56);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Margem Est.: ${estimatedMargin}%`, 196, 56, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 144, 63);

      // 4. Products Table (Margins 10mm Left, 10mm Right -> Total Width = 190mm)
      const tableRows = filteredInventory.map((item, idx) => {
        const codeDisplay = item.code || item.sku || `#VC-${String(idx + 1).padStart(3, '0')}`;
        const itemTotal = (item.price || 0) * (item.stock || 0);

        return [
          codeDisplay,
          item.name || 'Sem Nome',
          item.category || 'Geral',
          `${item.stock || 0}`,
          `R$ ${(item.cost_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ];
      });

      // Add Summary / Totals Row at end of table
      tableRows.push([
        'TOTAIS',
        'RESUMO DO ESTOQUE',
        '-',
        `${totalItems}`,
        '-',
        '-',
        `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: 74,
        head: [['CÓDIGO', 'PRODUTO', 'CATEGORIA', 'QTD', 'CUSTO UN.', 'VENDA UN.', 'VALOR TOTAL']],
        body: tableRows,
        headStyles: {
          fillColor: [6, 13, 26],
          textColor: [244, 192, 37],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'left',
          cellPadding: 3
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: 'bold', textColor: [71, 85, 105] }, // Código
          1: { cellWidth: 56, fontStyle: 'bold' },                           // Produto
          2: { cellWidth: 26 },                                             // Categoria
          3: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },         // Qtd
          4: { cellWidth: 23, halign: 'right' },                            // Custo Un.
          5: { cellWidth: 23, halign: 'right' },                            // Venda Un.
          6: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [6, 13, 26] } // Total Venda
        },
        margin: { top: 74, bottom: 15, left: 10, right: 10 },
        didParseCell: (data) => {
          // Format Summary Row
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.textColor = [6, 13, 26];
          }
        }
      });

      // 5. Page Numbers & Footer on Every Page (Margin 10mm Bottom -> y=287mm)
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer Gold Line
        doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setLineWidth(0.4);
        doc.line(10, 282, 200, 282);

        // Footer Text Left
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('VALLE CHIC MANAGEMENT SYSTEM', 10, 287);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('• DOCUMENTO DE USO INTERNO E CONFIDENCIAL', 59, 287);

        // Footer Page Right
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(`Página ${i} de ${pageCount}`, 200, 287, { align: 'right' });
      }

      doc.save(`relatorio-estoque-valle-chic-${now.toISOString().slice(0, 10)}.pdf`);
      toast.success('Relatório PDF do estoque gerado com sucesso!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Erro ao gerar relatório PDF.');
    }
  };

  const generateInventoryExcel = () => {
    try {
      const headers = ['Código', 'Produto', 'Categoria', 'Quantidade em Estoque', 'Custo Unitário (R$)', 'Preço de Venda (R$)', 'Valor Total em Estoque (R$)'];
      const rows = filteredInventory.map(item => [
        `"${item.code || item.sku || ''}"`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${item.category || 'Geral'}"`,
        item.stock || 0,
        (item.cost_price || 0).toFixed(2).replace('.', ','),
        (item.price || 0).toFixed(2).replace('.', ','),
        ((item.price || 0) * (item.stock || 0)).toFixed(2).replace('.', ',')
      ]);

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-estoque-valle-chic-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Relatório Excel (CSV) gerado com sucesso!');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error('Erro ao exportar relatório.');
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      let list: any[] = [];

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            list = data;
          }
        } catch {
          // fallback
        }
      }

      if (list.length === 0) {
        const allProducts = await api.products.getAll();
        list = allProducts || [];
      }

      setInventory(list);
    } catch {
      const allProducts = await api.products.getAll();
      setInventory(allProducts || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleDelete = async () => {
    const { id, name } = deleteConfirm;
    try {
      await api.products.delete(id);
      setInventory(prev => prev.filter(item => item.id !== id));
      
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

  const formatEntryDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('pt-BR');
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatEntryTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Filtered Inventory with Search, Category & Entry Date Filter
  const filteredInventory = useMemo(() => {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const currentMonthNum = now.getMonth() + 1;
    const currentYearNum = now.getFullYear();

    return inventory.filter(item => {
      // 1. Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(term);
        const matchBrand = item.brand?.toLowerCase().includes(term);
        const matchModel = (item.model || item.modelo)?.toLowerCase().includes(term);
        const matchSku = item.sku?.toLowerCase().includes(term);
        const matchCategory = item.category?.toLowerCase().includes(term);
        if (!matchName && !matchBrand && !matchModel && !matchSku && !matchCategory) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== 'Todos') {
        const cat = selectedCategory.toLowerCase();
        if (selectedCategory === 'Promoções') {
          if (!item.discount || item.discount <= 0) return false;
        } else if (selectedCategory === 'Kits') {
          if (!item.isKit && !item.is_kit && item.category?.toLowerCase() !== 'kits') return false;
        } else {
          if (item.category?.toLowerCase() !== cat) return false;
        }
      }

      // 3. Entry Date Filtering (Dia, Mês, Ano, Custom)
      const itemDate = item.created_at ? new Date(item.created_at) : new Date();
      const itemDateIso = itemDate.toISOString().slice(0, 10);
      const itemMonth = itemDate.getMonth() + 1;
      const itemYear = itemDate.getFullYear();

      if (dateFilterType === 'today') {
        if (itemDateIso !== todayIso) return false;
      } else if (dateFilterType === 'month') {
        if (Number(selectedMonth) !== itemMonth || Number(selectedYear) !== itemYear) return false;
      } else if (dateFilterType === 'year') {
        if (Number(selectedYear) !== itemYear) return false;
      } else if (dateFilterType === 'custom') {
        if (selectedDate && itemDateIso !== selectedDate) return false;
      }

      return true;
    });
  }, [inventory, searchTerm, selectedCategory, dateFilterType, selectedDate, selectedMonth, selectedYear]);

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const current = new Date().getFullYear();
    yearsSet.add(String(current));
    yearsSet.add(String(current - 1));
    inventory.forEach(item => {
      if (item.created_at) {
        try {
          const y = new Date(item.created_at).getFullYear();
          if (y) yearsSet.add(String(y));
        } catch {}
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [inventory]);

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

  const stats = useMemo(() => {
    let totalItems = 0;
    let totalCost = 0;
    let totalSale = 0;

    inventory.forEach(item => {
      const stock = Number(item.stock) || 0;
      const cost = Number(item.cost_price) || 0;
      const sale = Number(item.sale_price) || 0;
      totalItems += stock;
      totalCost += cost * stock;
      totalSale += sale * stock;
    });

    const totalProfit = totalSale - totalCost;
    return { totalItems, totalCost, totalSale, totalProfit };
  }, [inventory]);

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className={`flex-1 min-w-0 p-0 pb-28 ${isDesktopSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px]'} transition-all duration-300`}>
        {/* Top Navbar */}
        <header className={`fixed top-0 left-0 right-0 ${isDesktopSidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[240px]'} z-40 flex items-center justify-between px-6 py-4 bar-fume transition-all duration-300 border-b border-white/5`}>
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <MenuButton onClick={() => setIsSidebarOpen(true)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationSino />
          </div>
        </header>

        <div className="px-6 lg:px-10 max-w-[1600px] mx-auto pt-24">
          
          {/* Main Title and Action Buttons */}
          <div className="mb-4 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-2xl italic">Estoque <span className="text-secondary">VC</span></h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold">
                  {filteredInventory.length} de {inventory.length} peças
                </span>
              </div>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold">
                Gestão de produtos, movimentações e datas de entrada
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-4 py-2 rounded-full border border-secondary/30 text-secondary font-bold uppercase tracking-widest text-[9px] hover:bg-secondary/15 hover:border-secondary transition-all flex items-center gap-1.5 bg-secondary/5 backdrop-blur-sm active:scale-95 cursor-pointer shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-secondary" />
                  Gerar Relatório
                </button>
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

          {/* Executive Summary Cards - Grade 2x2 no Mobile (2 em cima, 2 em baixo) e 4 no Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
            {/* 1. Itens em Estoque */}
            <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-secondary/20 relative overflow-hidden group hover:border-secondary/50 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-surface/60 truncate pr-1">Itens em Estoque</span>
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shrink-0">
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-lg sm:text-2xl font-headline italic font-bold text-surface">{stats.totalItems}</span>
                  <span className="text-[10px] sm:text-xs text-surface/50">un.</span>
                </div>
                <p className="text-[8px] sm:text-[10px] text-surface/40 mt-0.5 truncate">{inventory.length} produtos</p>
              </div>
            </div>

            {/* 2. Valor Total Compra */}
            <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-secondary/20 relative overflow-hidden group hover:border-secondary/50 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-surface/60 truncate pr-1">Total Compra</span>
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm sm:text-xl font-headline italic font-bold text-surface truncate">
                    R$ {stats.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[8px] sm:text-[10px] text-surface/40 mt-0.5 truncate">Custo investido</p>
              </div>
            </div>

            {/* 3. Valor Total Venda */}
            <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-secondary/20 relative overflow-hidden group hover:border-secondary/50 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-surface/60 truncate pr-1">Total Venda</span>
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm sm:text-xl font-headline italic font-bold text-secondary truncate">
                    R$ {stats.totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[8px] sm:text-[10px] text-surface/40 mt-0.5 truncate">Potencial venda</p>
              </div>
            </div>

            {/* 4. Lucro Total Estimado */}
            <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-secondary/20 relative overflow-hidden group hover:border-secondary/50 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-surface/60 truncate pr-1">Lucro Estimado</span>
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-secondary/20 border border-secondary/40 flex items-center justify-center text-secondary shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm sm:text-xl font-headline italic font-bold text-secondary truncate">
                    R$ {stats.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[8px] sm:text-[10px] text-surface/40 mt-0.5 truncate">Margem projetada</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FROZEN / STICKY HEADER & FILTERS BAR (PINNED ON SCROLL FOR EASY ACCESS)    */}
          {/* ========================================================================= */}
          <div className="sticky top-[64px] z-30 bg-[#060D1A]/95 backdrop-blur-xl p-4 rounded-2xl border border-secondary/15 shadow-2xl space-y-3 transition-all mb-6">
                
                {/* Search & Date Filter Type Buttons */}
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50" />
                    <input 
                      type="text"
                      placeholder="Buscar por nome, SKU, modelo ou marca..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-primary/60 border border-secondary/20 rounded-xl py-2.5 pl-11 pr-9 text-xs text-surface placeholder:text-surface/30 focus:outline-none focus:border-secondary/60 transition-all shadow-inner"
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

                  {/* Date Filter Selector Buttons: Todos | Hoje (Dia) | Mês | Ano | Data Específica */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-primary/40 p-1 rounded-xl border border-secondary/15">
                    <span className="text-[9px] uppercase tracking-wider text-surface/40 font-bold px-2 hidden sm:inline flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-secondary" /> Entrada:
                    </span>

                    <button
                      onClick={() => setDateFilterType('all')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        dateFilterType === 'all'
                          ? 'bg-secondary text-primary shadow-md shadow-secondary/20'
                          : 'text-surface/60 hover:text-surface hover:bg-white/5'
                      }`}
                    >
                      Todas
                    </button>

                    <button
                      onClick={() => setDateFilterType('today')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        dateFilterType === 'today'
                          ? 'bg-secondary text-primary shadow-md shadow-secondary/20'
                          : 'text-surface/60 hover:text-surface hover:bg-white/5'
                      }`}
                    >
                      Hoje (Dia)
                    </button>

                    <button
                      onClick={() => setDateFilterType('month')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        dateFilterType === 'month'
                          ? 'bg-secondary text-primary shadow-md shadow-secondary/20'
                          : 'text-surface/60 hover:text-surface hover:bg-white/5'
                      }`}
                    >
                      Mês
                    </button>

                    <button
                      onClick={() => setDateFilterType('year')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        dateFilterType === 'year'
                          ? 'bg-secondary text-primary shadow-md shadow-secondary/20'
                          : 'text-surface/60 hover:text-surface hover:bg-white/5'
                      }`}
                    >
                      Ano
                    </button>

                    <button
                      onClick={() => setDateFilterType('custom')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        dateFilterType === 'custom'
                          ? 'bg-secondary text-primary shadow-md shadow-secondary/20'
                          : 'text-surface/60 hover:text-surface hover:bg-white/5'
                      }`}
                    >
                      Data Exata
                    </button>
                  </div>
                </div>

                {/* Sub-bar: Category Chips & Dynamic Date Selectors */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-white/5">
                  
                  {/* Category Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                    {['Todos', 'Bolsas', 'Carteiras', 'Kits', 'Promoções', 'Acessórios'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`shrink-0 px-3.5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
                          selectedCategory === cat 
                            ? 'bg-secondary text-primary border-secondary shadow-md shadow-secondary/20' 
                            : 'border-secondary/20 text-secondary/70 hover:border-secondary hover:text-secondary bg-transparent'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Contextual Date Controls */}
                  {dateFilterType === 'month' && (
                    <div className="flex items-center gap-2 shrink-0 min-w-[220px]">
                      <CustomDropdown
                        value={selectedMonth}
                        onChange={(val) => setSelectedMonth(val)}
                        options={monthsList}
                        className="min-w-[120px]"
                      />

                      <CustomDropdown
                        value={selectedYear}
                        onChange={(val) => setSelectedYear(val)}
                        options={availableYears.map(y => ({ value: y, label: String(y) }))}
                        className="min-w-[90px]"
                      />
                    </div>
                  )}

                  {dateFilterType === 'year' && (
                    <div className="flex items-center gap-2 shrink-0 min-w-[120px]">
                      <span className="text-[10px] text-surface/50 uppercase font-bold">Filtrar Ano:</span>
                      <CustomDropdown
                        value={selectedYear}
                        onChange={(val) => setSelectedYear(val)}
                        options={availableYears.map(y => ({ value: y, label: String(y) }))}
                        className="min-w-[90px]"
                      />
                    </div>
                  )}

                  {dateFilterType === 'custom' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-surface/50 uppercase font-bold">Escolher Dia:</span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-primary/80 border border-secondary/20 rounded-lg px-3 py-1 text-xs text-surface font-semibold focus:outline-none focus:border-secondary"
                      />
                    </div>
                  )}
                </div>
              </div>
          
              {/* Desktop Table View */}
              <div className="hidden md:block glass-card rounded-2xl overflow-hidden border border-secondary/10">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
                  </div>
                ) : filteredInventory.length === 0 ? (
                  <div className="text-center py-20 text-surface/40">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-headline text-lg italic">Nenhum produto encontrado para estes filtros</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('Todos');
                        setDateFilterType('all');
                      }}
                      className="mt-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-secondary font-bold"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-290px)] overflow-y-auto overflow-x-auto border border-white/5 rounded-2xl bg-[#0b111d]/50 custom-scrollbar shadow-2xl">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      
                      {/* FROZEN / STICKY TABLE THEAD */}
                      <thead className="sticky top-0 z-20 bg-[#111622] shadow-md">
                        <tr className="border-b border-secondary/20 bg-[#111622]">
                          <th className="px-5 py-4 w-16 bg-[#111622]"></th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold bg-[#111622]">Produto</th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold bg-[#111622]">Marca</th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold bg-[#111622]">Modelo / Cor</th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold bg-[#111622]">Data Entrada</th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold bg-[#111622]">Preço Venda</th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold text-center bg-[#111622]">Lucro Estimado</th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold text-center bg-[#111622]">Desconto</th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold text-center bg-[#111622]">Estoque</th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold text-right bg-[#111622]">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary/5">
                        {filteredInventory.map((item) => {
                          const profitPercent = calculateProfit(item.cost_price, item.sale_price);
                          const profitReais = item.cost_price 
                            ? (item.sale_price - item.cost_price) 
                            : (item.sale_price * 0.4);

                          return (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                              {/* Imagem */}
                              <td className="px-5 py-3.5">
                                <div className="w-12 h-12 rounded-xl bg-primary/50 border border-secondary/20 overflow-hidden shadow-inner flex items-center justify-center">
                                  <ProductImage src={item.image_url || item.img || 'https://picsum.photos/seed/product/100/100'} alt={item.name} referrerPolicy="no-referrer" />
                                </div>
                              </td>

                              {/* Nome & SKU */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col max-w-[200px]">
                                  <span className="font-bold text-surface group-hover:text-secondary transition-colors truncate">{item.name}</span>
                                  <span className="text-[9px] text-surface/40 uppercase tracking-widest font-mono mt-0.5">{item.sku || `VC-${item.id.slice(0,4).toUpperCase()}`}</span>
                                </div>
                              </td>

                              {/* Marca */}
                              <td className="px-5 py-3.5">
                                <span className="text-[10px] uppercase tracking-widest text-surface/70 font-bold">{item.brand || 'Valle Chic'}</span>
                              </td>

                              {/* Modelo / Cor */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="text-[10px] uppercase tracking-widest text-surface/80 font-bold truncate max-w-[120px]">{getModel(item)}</span>
                                  <span className="inline-flex items-center rounded-md border border-secondary/15 bg-secondary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-secondary truncate">
                                    {getColor(item)}
                                  </span>
                                </div>
                              </td>

                              {/* DATA DE ENTRADA */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col">
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-surface/90">
                                    <Calendar className="w-3 h-3 text-secondary" />
                                    {formatEntryDate(item.created_at)}
                                  </span>
                                  {item.created_at && (
                                    <span className="text-[9px] text-surface/40 font-mono mt-0.5">
                                      {formatEntryTime(item.created_at)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Preço de Venda */}
                              <td className="px-5 py-3.5">
                                <span className="font-bold text-secondary text-sm whitespace-nowrap">
                                  R$ {item.sale_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>

                              {/* Lucro Estimado em R$ e % */}
                              <td className="px-5 py-3.5 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-bold text-emerald-400 text-xs whitespace-nowrap">
                                    +R$ {(profitReais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400/80 font-bold mt-0.5 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                    <TrendingUp className="w-2.5 h-2.5" />
                                    +{profitPercent}%
                                  </span>
                                </div>
                              </td>

                              {/* Desconto */}
                              <td className="px-5 py-3.5 text-center">
                                {item.discount > 0 ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-bold">
                                    {item.discount}% OFF
                                  </span>
                                ) : (
                                  <span className="text-surface/20 font-bold">-</span>
                                )}
                              </td>

                              {/* Estoque */}
                              <td className="px-5 py-3.5 text-center">
                                <span className={`inline-flex items-center justify-center min-w-10 px-2 py-1 rounded-lg text-xs font-bold ${item.stock <= 2 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-secondary/10 text-secondary border border-secondary/20'}`}>
                                  {item.stock} un
                                </span>
                              </td>

                              {/* Ações */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center justify-end gap-2">
                                  <Link to={`/admin/products/edit/${item.id}`} className="p-2 text-surface/40 hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all" title="Editar Peça">
                                    <Edit3 className="w-4 h-4" />
                                  </Link>
                                  <button 
                                    onClick={() => setDeleteConfirm({ isOpen: true, id: item.id, name: item.name })}
                                    className="p-2 text-surface/40 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                                    title="Excluir Peça"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
                ) : filteredInventory.length === 0 ? (
                  <div className="text-center py-12 text-surface/60">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-headline text-lg italic">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  filteredInventory.map((item) => {
                    const profitPercent = calculateProfit(item.cost_price, item.sale_price);
                    const profitReais = item.cost_price 
                      ? (item.sale_price - item.cost_price) 
                      : (item.sale_price * 0.4);

                    return (
                      <div key={item.id} className="glass-card rounded-2xl p-4 border border-secondary/10 relative overflow-hidden group space-y-3">
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
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                                <TrendingUp className="w-2.5 h-2.5" />
                                +R$ {profitReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({profitPercent}%)
                              </span>
                              <span className="text-[9px] text-surface/30 uppercase tracking-widest font-mono">{item.sku || `VC-${item.id.slice(0,4).toUpperCase()}`}</span>
                            </div>
                            <h3 className="font-bold text-surface truncate pr-16">{item.name}</h3>
                            <p className="text-[9px] text-surface/40 uppercase tracking-[0.2em] font-bold mt-0.5">{item.brand}</p>
                            
                            {/* Data de Entrada Badge */}
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-surface/60">
                              <Calendar className="w-3 h-3 text-secondary" />
                              <span>Entrada: <strong>{formatEntryDate(item.created_at)}</strong></span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5 pr-14">
                              <span className="rounded-md bg-white/5 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-surface/60">
                                {getModel(item)}
                              </span>
                              <span className="rounded-md bg-secondary/10 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-secondary">
                                {getColor(item)}
                              </span>
                              
                              {item.discount > 0 && (
                                <span className="rounded-md bg-yellow-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-yellow-500 border border-yellow-500/20">
                                  {item.discount}% OFF
                                </span>
                              )}
                            </div>
                            
                            <div className="flex justify-between items-end mt-3 pt-2 border-t border-white/5">
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
                    );
                  })
                )}
              </div>
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

      {/* Report Export Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 rounded-[20px] border border-secondary/20 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-headline text-lg italic text-secondary uppercase tracking-wider">Relatório de Estoque</h3>
                    <p className="text-[9px] uppercase tracking-widest text-surface/50 font-bold">Valle Chic Gestão</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-surface/60 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Stats in Modal */}
              <div className="bg-[#0B111D] p-3.5 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-surface/60 uppercase tracking-widest font-bold text-[9px]">Peças em Estoque:</span>
                  <span className="font-bold text-surface">{filteredInventory.reduce((acc, i) => acc + (i.stock || 0), 0)} itens</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-surface/60 uppercase tracking-widest font-bold text-[9px]">Custo Total:</span>
                  <span className="font-bold text-surface">R$ {filteredInventory.reduce((acc, i) => acc + ((i.cost_price || 0) * (i.stock || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-surface/60 uppercase tracking-widest font-bold text-[9px]">Valor Total de Venda:</span>
                  <span className="font-bold text-secondary">R$ {filteredInventory.reduce((acc, i) => acc + ((i.price || 0) * (i.stock || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <button 
                  onClick={() => {
                    generateInventoryPDF();
                    setIsReportModalOpen(false);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#060D1A] to-[#0D1B2A] border border-secondary/40 text-secondary font-bold uppercase tracking-widest text-xs hover:border-secondary transition-all flex items-center justify-between shadow-lg cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-surface font-bold text-xs">Relatório em PDF</p>
                      <p className="text-[8px] text-surface/50 font-normal uppercase tracking-widest">Padrão e Tema do App</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-secondary group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => {
                    generateInventoryExcel();
                    setIsReportModalOpen(false);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-widest text-xs hover:bg-emerald-500/20 transition-all flex items-center justify-between shadow-lg cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-emerald-400 font-bold text-xs">Exportar para Excel (CSV)</p>
                      <p className="text-[8px] text-emerald-400/60 font-normal uppercase tracking-widest">Compatível com Planilhas</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-surface/60 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
