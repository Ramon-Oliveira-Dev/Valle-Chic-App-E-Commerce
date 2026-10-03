import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { api } from '../../services/api';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import { toast } from 'sonner';
import { maskCurrency, parseCurrency } from '../../lib/utils';
import NotificationModal from '../../components/NotificationModal';
import PDFPreviewModal from '../../components/PDFPreviewModal';
import { CustomDropdown } from '../../components/CustomDropdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useTheme } from '../../contexts/ThemeContext';

const FinancialCard = ({ 
  title, 
  value, 
  percentOf, 
  updatedAt, 
  actionText, 
  icon, 
  colorTheme, 
  onClick 
}: {
  title: string;
  value: number;
  percentOf: number;
  updatedAt: string;
  actionText: string;
  icon: string;
  colorTheme: 'teal' | 'blue';
  onClick: () => void;
}) => {
  const isTeal = colorTheme === 'teal';

  // Custom premium design configuration
  const getTheme = (color: string) => {
    switch(color) {
      case 'teal': return { color: 'text-[#10B981]', textMuted: 'text-[#10B981]/70', border: 'border-emerald-500/20 hover:border-emerald-500/40', bgGlow: 'from-emerald-500/10 to-transparent', iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', barColor: 'bg-emerald-500', ambientColor: 'bg-emerald-500/5', shadow: 'shadow-emerald-950/10 hover:shadow-emerald-500/5' };
      case 'blue': return { color: 'text-[#38BDF8]', textMuted: 'text-[#38BDF8]/70', border: 'border-sky-500/20 hover:border-sky-500/40', bgGlow: 'from-sky-500/10 to-transparent', iconBg: 'bg-sky-500/10 text-sky-400 border border-sky-500/20', barColor: 'bg-sky-500', ambientColor: 'bg-sky-500/5', shadow: 'shadow-sky-950/10 hover:shadow-sky-500/5' };
      case 'amber': return { color: 'text-[#F59E0B]', textMuted: 'text-[#F59E0B]/70', border: 'border-amber-500/20 hover:border-amber-500/40', bgGlow: 'from-amber-500/10 to-transparent', iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', barColor: 'bg-amber-500', ambientColor: 'bg-amber-500/5', shadow: 'shadow-amber-950/10 hover:shadow-amber-500/5' };
      case 'purple': return { color: 'text-[#A855F7]', textMuted: 'text-[#A855F7]/70', border: 'border-purple-500/20 hover:border-purple-500/40', bgGlow: 'from-purple-500/10 to-transparent', iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', barColor: 'bg-purple-500', ambientColor: 'bg-purple-500/5', shadow: 'shadow-purple-950/10 hover:shadow-purple-500/5' };
      case 'emerald': return { color: 'text-[#10B981]', textMuted: 'text-[#10B981]/70', border: 'border-emerald-500/20 hover:border-emerald-500/40', bgGlow: 'from-emerald-500/10 to-transparent', iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', barColor: 'bg-emerald-500', ambientColor: 'bg-emerald-500/5', shadow: 'shadow-emerald-950/10 hover:shadow-emerald-500/5' };
      default: return { color: 'text-[#D4AF37]', textMuted: 'text-[#D4AF37]/70', border: 'border-yellow-600/20 hover:border-yellow-600/40', bgGlow: 'from-yellow-600/10 to-transparent', iconBg: 'bg-yellow-600/10 text-[#D4AF37] border border-yellow-600/20', barColor: 'bg-[#D4AF37]', ambientColor: 'bg-[#D4AF37]/5', shadow: 'shadow-yellow-950/10 hover:shadow-[#D4AF37]/5' };
    }
  };

  const theme = getTheme(colorTheme);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-[#0F1420]/95 backdrop-blur-2xl p-5 rounded-[24px] border ${theme.border} ${theme.shadow} transition-all duration-300 relative overflow-hidden cursor-pointer group flex flex-col justify-between h-full`}
    >
      {/* Luz ambiente de fundo */}
      <div className={`absolute -right-12 -top-12 w-32 h-32 ${theme.ambientColor} rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500`}></div>
      <div className={`absolute -left-12 -bottom-12 w-32 h-32 ${theme.ambientColor} rounded-full blur-3xl pointer-events-none`}></div>
      
      <div className="flex flex-col relative z-10 justify-between h-full space-y-4 w-full">
        <div>
          {/* Header do Card */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
              </div>
              <h3 className={`${theme.color} text-[10px] font-sans font-black uppercase tracking-widest`}>{title}</h3>
            </div>
            <span className="text-surface/30 text-[9px] font-mono tracking-tighter uppercase">{updatedAt}</span>
          </div>
          
          {/* Valor Principal */}
          <div className="mb-2 flex items-baseline gap-1">
            <span className="text-xs font-sans font-black text-surface/30 uppercase tracking-wide">R$</span>
            <span className="text-3xl sm:text-4xl font-headline italic font-black text-white tracking-tight leading-none group-hover:text-secondary transition-colors">
              {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          {/* Barra de Progresso Analítica */}
          <div className="space-y-1.5 mt-4">
            <div className="flex justify-between items-center text-[10px] text-surface/50 font-medium">
              <span>Distribuição do Lucro</span>
              <span className="font-bold text-white">{percentOf}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percentOf}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full ${theme.barColor} rounded-full`}
              />
            </div>
            <p className="text-[8px] text-surface/35 uppercase tracking-widest font-bold mt-1">
              Base de Cálculo: <span className="text-surface/50 font-semibold">Lucro Realizado</span>
            </p>
          </div>
        </div>
        
        {/* Footer do Card */}
        <div className="pt-2">
          <div className="w-full h-px bg-white/5 mb-3"></div>
          
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-surface/30 font-bold uppercase tracking-widest">Meta de Segurança</span>
            <div className={`flex items-center gap-1 ${theme.color} text-[10px] font-sans font-black uppercase tracking-widest group-hover:text-white transition-colors`}>
              <span>{actionText}</span>
              <span className="material-symbols-outlined text-[13px] group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const getTimeAgo = (date: Date | null) => {
  if (!date) return 'Atualizando...';
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Atualizado agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Atualizado há ${hours} h`;
  return `Atualizado em ${date.toLocaleDateString('pt-BR')}`;
};

export default function AdminFinances() {
  const { isDesktopSidebarCollapsed } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('Março 2026');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    itemsSold: 0,
    invested: 0,
    profit: 0,
    workingCapital: 0,
    workingCapitalPercentage: 30,
    profitPercentage: 70,
    revenueGoal: 10000,
    profitGoal: 5000
  });
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [potentialStockRevenue, setPotentialStockRevenue] = useState(0);
  const [potentialStockProfit, setPotentialStockProfit] = useState(0);
  const [newGoals, setNewGoals] = useState({
    revenueGoal: 10000,
    profitGoal: 5000,
    workingCapitalPercentage: 30,
    profitPercentage: 70
  });
  const [revenueInput, setRevenueInput] = useState('R$ 10.000,00');
  const [profitInput, setProfitInput] = useState('R$ 5.000,00');

  const openGoalsModal = () => {
    const rev = newGoals.revenueGoal || (stats.revenue + potentialStockRevenue) || 10000;
    const prof = newGoals.profitGoal || (stats.profit + potentialStockProfit) || 5000;
    setRevenueInput(maskCurrency(Math.round(rev * 100).toString()));
    setProfitInput(maskCurrency(Math.round(prof * 100).toString()));
    setIsGoalsModalOpen(true);
  };
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchFinanceData();

    if (!isSupabaseConfigured) return;

    try {
      const channel = supabase
        .channel('configuracoes_metas_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'configuracoes_metas'
          },
          () => {
            fetchFinanceData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // ignore
    }
  }, []);

  const generatePDF = () => {
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
      doc.text('Relatório Financeiro Mensal', 14, 55);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Mês de Referência: ${selectedMonth}`, 14, 62);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 68);
      
      // Stats Summary Section
      doc.setFillColor(245, 245, 240);
      doc.roundedRect(14, 75, 182, 50, 3, 3, 'F');
      
      doc.setTextColor(191, 155, 48);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INDICADORES DE PERFORMANCE', 20, 85);
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.text(`Faturamento: R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 95);
      doc.text(`Capital de Giro: R$ ${stats.workingCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 103);
      doc.text(`Lucro Bruto: R$ ${stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 111);
      
      doc.text(`Itens Vendidos: ${stats.itemsSold} unidades`, 110, 95);
      doc.text(`Investimento em Estoque: R$ ${stats.invested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 110, 103);
      doc.text(`Margem de Lucro: ${stats.revenue > 0 ? Math.round((stats.profit / stats.revenue) * 100) : 0}%`, 110, 111);
      
      // Goals Section
      doc.setTextColor(191, 155, 48);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('METAS E OBJETIVOS', 14, 140);
      
      const goalsData = [
        ['Lucro Realizado', `R$ ${stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '100%'],
        ['Lucro Disponível (' + stats.profitPercentage + '%)', `R$ ${(stats.profit * (stats.profitPercentage / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '-'],
        ['Capital de Giro (' + stats.workingCapitalPercentage + '%)', `R$ ${(stats.profit * (stats.workingCapitalPercentage / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '-']
      ];
      
      autoTable(doc, {
        startY: 145,
        head: [['META', 'VALOR ESTIPULADO', 'ATINGIDO']],
        body: goalsData,
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
          1: { halign: 'right' },
          2: { halign: 'center', fontStyle: 'bold' }
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
      
      doc.save(`financeiro-Valle Chic-${selectedMonth.replace(' ', '-')}.pdf`);
      toast.success('Relatório financeiro gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar relatório financeiro.');
    }
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      
      let products: any[] = [];
      let sales: any[] = [];
      let saleItems: any[] = [];
      let paidInstallments: any[] = [];

      if (isSupabaseConfigured) {
        try {
          const [
            productsRes,
            salesRes,
            saleItemsRes,
            paidInstallmentsRes
          ] = await Promise.all([
            supabase.from('products').select('stock, cost_price, sale_price'),
            supabase.from('sales').select('*'),
            supabase.from('sale_items').select('quantity, created_at, product_id'),
            supabase.from('installments').select('amount, paid_at').eq('status', 'pago')
          ]);

          if (productsRes?.data) products = productsRes.data;
          if (salesRes?.data) sales = salesRes.data;
          if (paidInstallmentsRes?.data) paidInstallments = paidInstallmentsRes.data;

          if (saleItemsRes?.data) {
            const items = saleItemsRes.data;
            const pIds = [...new Set(items.map((i: any) => i.product_id).filter(Boolean))];
            const { data: pData } = pIds.length > 0
              ? await supabase.from('products').select('id, cost_price, sale_price').in('id', pIds)
              : { data: [] };
            const pMap = new Map((pData || []).map(p => [p.id, p]));
            saleItems = items.map((i: any) => ({
              ...i,
              products: pMap.get(i.product_id) || null
            }));
          }
        } catch (e) {
          console.error("Error fetching direct Supabase data", e);
        }
      }

      if (products.length === 0) {
        const fall = await api.products.getAll();
        products = fall.map(p => ({ 
          stock: p.stock || 0, 
          cost_price: p.cost_price || (p.sale_price ? p.sale_price * 0.6 : 0),
          sale_price: p.sale_price || p.price || 0
        }));
      }
      
      const goalsData = await api.goals.get();
      const workingCapitalPercentage = goalsData.workingCapitalPercentage || 30;
      const profitPercentage = goalsData.profitPercentage || 70;

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const invested = products?.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.cost_price || 0)), 0) || 0;
      
      const monthlySales = sales?.filter(s => {
        const d = new Date(s.sale_date);
        return (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
      }) || [];

      const revenue = monthlySales.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
      
      const salesAmountPaid = sales?.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0) || 0;
      const installmentsTotal = paidInstallments?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
      const workingCapital = salesAmountPaid + installmentsTotal;

      const monthlySaleItems = saleItems?.filter(item => {
        const d = new Date(item.created_at);
        return (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
      }) || [];

      const cogs = monthlySaleItems.reduce((acc, curr: any) => {
        const cost = curr.products?.cost_price || 0;
        return acc + (curr.quantity * cost);
      }, 0);

      const profit = revenue - cogs;
      const itemsSold = monthlySaleItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

      // Cálculo do Faturamento Potencial em Estoque (Estoque * Preço de Venda)
      const calculatedPotentialStockRevenue = products?.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.sale_price || 0)), 0) || 0;
      // Cálculo do Lucro Potencial em Estoque (Estoque * (Preço de Venda - Preço de Custo))
      const calculatedPotentialStockProfit = products?.reduce((acc, curr) => acc + ((curr.stock || 0) * ((curr.sale_price || 0) - (curr.cost_price || 0))), 0) || 0;
      
      setPotentialStockRevenue(calculatedPotentialStockRevenue);
      setPotentialStockProfit(calculatedPotentialStockProfit);

      // Meta de faturamento dinâmica = Faturamento Realizado + Faturamento Potencial do Estoque
      const calculatedRevenueGoal = revenue + calculatedPotentialStockRevenue;
      // Meta de lucro dinâmica = Lucro Realizado + Lucro Potencial do Estoque
      const calculatedProfitGoal = profit + calculatedPotentialStockProfit;

      const finalRevenueGoal = goalsData.revenueGoal || calculatedRevenueGoal || 10000;
      const finalProfitGoal = goalsData.profitGoal || calculatedProfitGoal || 5000;

      setNewGoals({
        revenueGoal: finalRevenueGoal,
        profitGoal: finalProfitGoal,
        workingCapitalPercentage,
        profitPercentage
      });
      setRevenueInput(maskCurrency(Math.round(finalRevenueGoal * 100).toString()));
      setProfitInput(maskCurrency(Math.round(finalProfitGoal * 100).toString()));

      setStats({
        revenue,
        itemsSold,
        invested,
        profit,
        workingCapital,
        workingCapitalPercentage,
        profitPercentage,
        revenueGoal: finalRevenueGoal,
        profitGoal: finalProfitGoal
      });
      setLastUpdated(new Date());

    } catch {
      // fallback smoothly
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    try {
      setLoading(true);
      await api.goals.save(newGoals);
      setIsGoalsModalOpen(false);
      await fetchFinanceData();
      toast.success('Metas salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving goals:', error);
      toast.error('Erro ao salvar metas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className={`flex-1 min-w-0 p-0 pb-20 ${isDesktopSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px]'} transition-all duration-300`}>
        <header className={`fixed top-0 left-0 right-0 ${isDesktopSidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[240px]'} z-30 flex items-center justify-between px-4 sm:px-6 py-3 bar-fume transition-all duration-300 border-b border-white/5`}>
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <MenuButton onClick={() => setIsSidebarOpen(true)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="w-9 h-9 rounded-full bg-primary/40 backdrop-blur-sm border border-secondary/20 flex items-center justify-center text-surface/60 hover:text-secondary transition-colors cursor-pointer" 
              title="Gerar Relatório PDF"
            >
              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
            </button>
            <NotificationSino />
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pt-20 pb-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-2xl italic">Finanças <span className="text-secondary">VC</span></h2>
              </div>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-0.5">
                Controle de caixa, lucros e faturamento executivo
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Selector */}
              <CustomDropdown
                value={selectedMonth}
                onChange={(val) => setSelectedMonth(val)}
                options={[
                  { value: 'Janeiro 2026', label: 'Janeiro 2026' },
                  { value: 'Fevereiro 2026', label: 'Fevereiro 2026' },
                  { value: 'Março 2026', label: 'Março 2026' }
                ]}
                className="min-w-[150px]"
              />

              <button 
                onClick={openGoalsModal}
                className="px-3 py-1.5 rounded-xl bg-secondary/10 border border-secondary/30 text-xs font-bold uppercase tracking-wider text-secondary hover:bg-secondary/20 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">settings</span>
                Metas
              </button>

              <Link 
                to="/admin/debts"
                className="px-3 py-1.5 rounded-xl bg-blue-400/10 border border-blue-400/30 text-xs font-bold uppercase tracking-wider text-blue-400 hover:bg-blue-400/20 transition-all flex items-center gap-1.5 shadow-sm"
                title="Acessar Caderneta de Clientes"
              >
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                Caderneta
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top Row: 5 KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="bg-[#0F1420]/95 backdrop-blur-2xl p-5 rounded-[24px] border border-emerald-500/20 hover:border-emerald-500/40 shadow-lg shadow-emerald-950/10 flex flex-col justify-between cursor-pointer transition-all duration-300"
                  onClick={openGoalsModal}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-[18px]">trending_up</span>
                    </div>
                    <h3 className="text-surface/30 text-[9px] font-black uppercase tracking-widest">Faturamento</h3>
                  </div>
                  <div>
                    <p className="font-headline italic text-2xl text-white font-black leading-tight">R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[10px] text-surface/50 font-medium">
                        <span>Meta</span>
                        <span className="text-emerald-400 font-bold">{Math.min(100, Math.round((stats.revenue / (stats.revenueGoal || 1)) * 100))}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.round((stats.revenue / (stats.revenueGoal || 1)) * 100))}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="bg-[#0F1420]/95 backdrop-blur-2xl p-5 rounded-[24px] border border-sky-500/20 hover:border-sky-500/40 shadow-lg shadow-sky-950/10 flex flex-col justify-between cursor-pointer transition-all duration-300"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                    </div>
                    <h3 className="text-surface/30 text-[9px] font-black uppercase tracking-widest">Caixa</h3>
                  </div>
                  <div>
                    <p className="font-headline italic text-2xl text-white font-black leading-tight">R$ {stats.workingCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-surface/40 uppercase mt-4 font-bold tracking-widest">Entradas acumuladas</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="bg-[#0F1420]/95 backdrop-blur-2xl p-5 rounded-[24px] border border-yellow-600/20 hover:border-yellow-600/40 shadow-lg shadow-yellow-950/10 flex flex-col justify-between cursor-pointer transition-all duration-300"
                  onClick={openGoalsModal}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="w-9 h-9 rounded-xl bg-yellow-600/10 text-[#D4AF37] border border-yellow-600/20 flex items-center justify-center shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                    </div>
                    <h3 className="text-surface/30 text-[9px] font-black uppercase tracking-widest">Lucro</h3>
                  </div>
                  <div>
                    <p className="font-headline italic text-2xl text-white font-black leading-tight">R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[10px] text-surface/50 font-medium">
                        <span>Meta</span>
                        <span className="text-[#D4AF37] font-bold">{Math.min(100, Math.round((stats.profit / (stats.profitGoal || 1)) * 100))}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="bg-[#D4AF37] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.round((stats.profit / (stats.profitGoal || 1)) * 100))}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="bg-[#0F1420]/95 backdrop-blur-2xl p-5 rounded-[24px] border border-amber-500/20 hover:border-amber-500/40 shadow-lg shadow-amber-950/10 flex flex-col justify-between cursor-pointer transition-all duration-300"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    </div>
                    <h3 className="text-surface/30 text-[9px] font-black uppercase tracking-widest">Estoque</h3>
                  </div>
                  <div>
                    <p className="font-headline italic text-2xl text-white font-black leading-tight">R$ {stats.invested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-surface/40 uppercase mt-4 font-bold tracking-widest">Investimento</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="bg-[#0F1420]/95 backdrop-blur-2xl p-5 rounded-[24px] border border-purple-500/20 hover:border-purple-500/40 shadow-lg shadow-purple-950/10 flex flex-col justify-between cursor-pointer transition-all duration-300 col-span-2 sm:col-span-1"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                    </div>
                    <h3 className="text-surface/30 text-[9px] font-black uppercase tracking-widest">Vendas</h3>
                  </div>
                  <div>
                    <p className="font-headline italic text-2xl text-white font-black leading-tight">{stats.itemsSold} <span className="text-xs font-sans text-surface/50 font-normal">peças</span></p>
                    <p className="text-[10px] text-surface/40 uppercase mt-4 font-bold tracking-widest">Itens vendidos</p>
                  </div>
                </motion.div>
              </div>

              {/* Base Calculation Subheader */}
              <div className="flex items-center justify-between px-1 py-0.5">
                <p className="text-surface/60 text-[10px] uppercase tracking-widest font-bold font-sans flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  BASE DE CÁLCULO: <span className="text-secondary">LUCRO REAL (R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                </p>
                <span className="text-[10px] text-surface/40 font-mono hidden sm:inline">{getTimeAgo(lastUpdated)}</span>
              </div>

              {/* Main Content Grid: 12 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left Side (7 Cols): Financial Distribution Cards */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FinancialCard 
                    title="Lucro Disponível"
                    value={stats.profit * (stats.profitPercentage / 100)}
                    percentOf={stats.profitPercentage}
                    updatedAt={getTimeAgo(lastUpdated)}
                    actionText="VER METAS"
                    icon="payments"
                    colorTheme="teal"
                    onClick={openGoalsModal}
                  />

                  <FinancialCard 
                    title="Capital de Giro"
                    value={stats.profit * (stats.workingCapitalPercentage / 100)}
                    percentOf={stats.workingCapitalPercentage}
                    updatedAt={getTimeAgo(lastUpdated)}
                    actionText="GERENCIAR"
                    icon="account_balance"
                    colorTheme="blue"
                    onClick={openGoalsModal}
                  />
                </div>

                {/* Right Side (5 Cols): Fluxo de Caixa Card */}
                <div className="lg:col-span-5">
                  <div className="glass-card rounded-[16px] p-4 sm:p-5 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                        <h3 className="font-headline text-lg italic text-surface">Fluxo de Caixa Operacional</h3>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded">Mês Atual</span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5 border border-white/5">
                          <div>
                            <p className="text-xs font-bold text-surface">Entradas (Vendas)</p>
                            <p className="text-[8px] text-surface/50 uppercase tracking-widest">Total de vendas brutas</p>
                          </div>
                          <p className="text-emerald-400 font-bold text-xs sm:text-sm">R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5 border border-white/5">
                          <div>
                            <p className="text-xs font-bold text-surface">Custo de Mercadorias (CMV)</p>
                            <p className="text-[8px] text-surface/50 uppercase tracking-widest">Custo de aquisição das peças</p>
                          </div>
                          <p className="text-rose-400 font-bold text-xs sm:text-sm">- R$ {(stats.revenue - stats.profit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-secondary/15 flex justify-between items-center p-2.5 rounded-lg bg-secondary/10 border border-secondary/20">
                      <div>
                        <p className="text-xs font-bold text-secondary uppercase tracking-wider">Saldo Operacional</p>
                        <p className="text-[8px] text-secondary/60 uppercase tracking-widest">Lucro líquido real</p>
                      </div>
                      <p className="text-secondary font-bold text-base sm:text-lg">R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Goals Modal */}
              <AnimatePresence>
                {isGoalsModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="glass-card w-full max-w-md p-6 rounded-[20px] border border-secondary/20 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                      <h3 className="font-headline text-xl italic mb-4 text-secondary uppercase tracking-wider text-center">Metas Financeiras</h3>
                      
                      {/* Cabeçalho Dinâmico */}
                      <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3.5 mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-secondary font-bold mb-0.5">Lucro Líquido Real (Mês Atual)</p>
                          <p className="text-xl font-headline text-surface">R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-lg">payments</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Monetary Values Section */}
                        <div className="space-y-3">
                          <h4 className="text-secondary text-xs font-bold uppercase tracking-widest border-b border-secondary/20 pb-1.5">Metas Mensais (R$)</h4>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] uppercase tracking-widest text-surface/60">Meta de Faturamento (Mês)</label>
                              <span className="text-[8px] uppercase tracking-widest text-emerald-400 font-bold">Definir Objetivo</span>
                            </div>
                            <div className="w-full bg-surface/10 border border-surface/20 rounded-lg py-2 px-3 flex items-center focus-within:border-secondary transition-colors">
                              <input 
                                type="text" 
                                inputMode="numeric"
                                value={revenueInput}
                                onChange={(e) => {
                                  const masked = maskCurrency(e.target.value);
                                  setRevenueInput(masked);
                                  const parsed = parseCurrency(masked);
                                  setNewGoals(prev => ({ ...prev, revenueGoal: parsed }));
                                }}
                                className="w-full bg-transparent text-secondary font-headline text-lg italic font-bold outline-none border-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] uppercase tracking-widest text-surface/60">Meta de Lucro Desejado (Mês)</label>
                              <span className="text-[8px] uppercase tracking-widest text-secondary font-bold">Definir Objetivo</span>
                            </div>
                            <div className="w-full bg-surface/10 border border-surface/20 rounded-lg py-2 px-3 flex items-center focus-within:border-secondary transition-colors">
                              <input 
                                type="text" 
                                inputMode="numeric"
                                value={profitInput}
                                onChange={(e) => {
                                  const masked = maskCurrency(e.target.value);
                                  setProfitInput(masked);
                                  const parsed = parseCurrency(masked);
                                  setNewGoals(prev => ({ ...prev, profitGoal: parsed }));
                                }}
                                className="w-full bg-transparent text-secondary font-headline text-lg italic font-bold outline-none border-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Seção de Sincronização Dinâmica com o Estoque */}
                        <div className="bg-[#111622] border border-secondary/20 rounded-[16px] p-4 text-xs space-y-3 shadow-inner">
                          <p className="text-[9px] uppercase tracking-wider text-secondary font-bold flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <span className="material-symbols-outlined text-[14px]">analytics</span>
                            Valores Cadastrados no Estoque & Vendas
                          </p>
                          <div className="space-y-1.5 text-surface/70">
                            <div className="flex justify-between items-center">
                              <span>Faturamento Realizado (Vendas):</span>
                              <span className="text-emerald-400 font-mono font-bold">R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Faturamento Estimado (Estoque):</span>
                              <span className="text-white font-mono font-semibold">R$ {potentialStockRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-secondary text-xs pt-1 border-t border-white/5">
                              <span>Soma (Meta de Faturamento):</span>
                              <span className="font-mono">R$ {(stats.revenue + potentialStockRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            
                            <div className="border-t border-white/5 my-2"></div>
                            
                            <div className="flex justify-between items-center">
                              <span>Lucro Realizado (Vendas):</span>
                              <span className="text-emerald-400 font-mono font-bold">R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Lucro Potencial (Estoque):</span>
                              <span className="text-white font-mono font-semibold">R$ {potentialStockProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-secondary text-xs pt-1 border-t border-white/5">
                              <span>Soma (Meta de Lucro):</span>
                              <span className="font-mono">R$ {(stats.profit + potentialStockProfit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const rev = stats.revenue + potentialStockRevenue;
                              const prof = stats.profit + potentialStockProfit;
                              setNewGoals(prev => ({
                                ...prev,
                                revenueGoal: rev,
                                profitGoal: prof
                              }));
                              setRevenueInput(maskCurrency(Math.round(rev * 100).toString()));
                              setProfitInput(maskCurrency(Math.round(prof * 100).toString()));
                              toast.success('Metas preenchidas com os valores de faturamento e lucro do estoque!');
                            }}
                            className="w-full py-2.5 rounded-xl bg-secondary text-primary hover:bg-secondary/90 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-secondary/10"
                          >
                            <span className="material-symbols-outlined text-[14px]">sync</span>
                            Sincronizar com Estoque + Vendas
                          </button>
                        </div>

                        {/* Percentages Section */}
                        <div className="space-y-3 pt-2">
                          <h4 className="text-secondary text-xs font-bold uppercase tracking-widest border-b border-secondary/20 pb-1.5">Distribuição Percentual</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex flex-col">
                                <label className="text-[9px] uppercase tracking-widest text-surface/60 mb-0.5">Capital de Giro</label>
                                <span className="text-secondary font-headline text-xl italic">{newGoals.workingCapitalPercentage}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0"
                                max="100"
                                step="1"
                                value={newGoals.workingCapitalPercentage}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setNewGoals({ 
                                    ...newGoals, 
                                    workingCapitalPercentage: val,
                                    profitPercentage: 100 - val
                                  });
                                }}
                                className="w-full accent-secondary h-1.5 bg-primary/40 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex flex-col">
                                <label className="text-[9px] uppercase tracking-widest text-surface/60 mb-0.5">Lucro</label>
                                <span className="text-secondary font-headline text-xl italic">{newGoals.profitPercentage}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0"
                                max="100"
                                step="1"
                                value={newGoals.profitPercentage}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setNewGoals({ 
                                    ...newGoals, 
                                    profitPercentage: val,
                                    workingCapitalPercentage: 100 - val
                                  });
                                }}
                                className="w-full accent-secondary h-1.5 bg-primary/40 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {newGoals.workingCapitalPercentage + newGoals.profitPercentage > 100 && (
                          <p className="text-rose-400 text-[10px] uppercase tracking-widest font-bold text-center bg-rose-400/10 py-1.5 rounded-lg">
                            A soma das porcentagens não pode exceder 100%
                          </p>
                        )}

                        <div className="flex gap-3 pt-4">
                          <button 
                            onClick={() => setIsGoalsModalOpen(false)}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl border border-secondary/30 bg-gradient-to-b from-black to-surface/5 text-secondary font-bold uppercase tracking-widest text-[10px] hover:bg-secondary/10 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            Cancelar
                          </button>
                          <button 
                            onClick={handleSaveGoals}
                            disabled={newGoals.workingCapitalPercentage + newGoals.profitPercentage > 100 || loading}
                            className={`flex-1 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${newGoals.workingCapitalPercentage + newGoals.profitPercentage > 100 || loading ? 'bg-surface/10 text-surface/20 cursor-not-allowed shadow-none' : 'bg-gradient-to-b from-secondary to-[#997a26] text-primary hover:from-[#e6c258] hover:to-[#806620] shadow-secondary/20 border border-[#ffdf70]/50'}`}
                          >
                            {loading ? 'Salvando...' : 'Salvar Metas'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <PDFPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={() => { generatePDF(); setIsPreviewOpen(false); }}
        title="Pré-visualização do Relatório Financeiro"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Faturamento</p>
              <p className="text-2xl font-serif italic text-slate-900">R$ {stats.revenue.toLocaleString('pt-BR')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Lucro Bruto</p>
              <p className="text-2xl font-serif italic text-emerald-600">R$ {stats.profit.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="p-5 bg-slate-900 rounded-2xl text-white">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Distribuição do Lucro</p>
              <span className="text-xs font-bold">R$ {stats.profit.toLocaleString('pt-BR')}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-secondary" 
                style={{ width: `${stats.workingCapitalPercentage}%` }}
              ></div>
              <div 
                className="h-full bg-emerald-500" 
                style={{ width: `${stats.profitPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-white/60">
              <span>Giro: R$ {(stats.profit * (stats.workingCapitalPercentage / 100)).toLocaleString('pt-BR')}</span>
              <span>Lucro: R$ {(stats.profit * (stats.profitPercentage / 100)).toLocaleString('pt-BR')}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-[9px] uppercase text-slate-400 font-bold mb-1">Itens Vendidos</p>
              <p className="text-sm font-bold text-slate-700">{stats.itemsSold}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-[9px] uppercase text-slate-400 font-bold mb-1">Margem</p>
              <p className="text-sm font-bold text-slate-700">{stats.revenue > 0 ? Math.round((stats.profit / stats.revenue) * 100) : 0}%</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-[9px] uppercase text-slate-400 font-bold mb-1">Estoque</p>
              <p className="text-sm font-bold text-slate-700">R$ {stats.invested.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>
      </PDFPreviewModal>

      <BottomNavigation />
    </div>
  );
}

