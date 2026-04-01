import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import NotificationBell from '../../components/NotificationBell';
import MenuButton from '../../components/MenuButton';
import { toast } from 'sonner';
import { maskCurrency, parseCurrency } from '../../lib/utils';
import NotificationModal from '../../components/NotificationModal';
import PDFPreviewModal from '../../components/PDFPreviewModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminFinances() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('Março 2026');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    itemsSold: 0,
    invested: 0,
    profit: 0,
    workingCapital: 0,
    estimatedRevenue: 0,
    targetWorkingCapital: 0,
    workingCapitalPercentage: 30,
    profitPercentage: 20
  });
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [newGoals, setNewGoals] = useState({
    estimatedRevenue: '',
    targetWorkingCapital: '',
    workingCapitalPercentage: 30,
    profitPercentage: 20
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    fetchFinanceData();

    const channel = supabase
      .channel('business_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_settings'
        },
        () => {
          fetchFinanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      doc.text(`Faturamento: R$ ${stats.revenue.toLocaleString('pt-BR')}`, 20, 95);
      doc.text(`Capital de Giro: R$ ${stats.workingCapital.toLocaleString('pt-BR')}`, 20, 103);
      doc.text(`Lucro Bruto: R$ ${stats.profit.toLocaleString('pt-BR')}`, 20, 111);
      
      doc.text(`Itens Vendidos: ${stats.itemsSold} unidades`, 110, 95);
      doc.text(`Investimento em Estoque: R$ ${stats.invested.toLocaleString('pt-BR')}`, 110, 103);
      doc.text(`Margem de Lucro: ${stats.revenue > 0 ? Math.round((stats.profit / stats.revenue) * 100) : 0}%`, 110, 111);
      
      // Goals Section
      doc.setTextColor(191, 155, 48);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('METAS E OBJETIVOS', 14, 140);
      
      const goalsData = [
        ['Meta de Faturamento', `R$ ${stats.estimatedRevenue.toLocaleString('pt-BR')}`, `${stats.estimatedRevenue > 0 ? ((stats.revenue / stats.estimatedRevenue) * 100).toFixed(1) : 0}%`],
        ['Meta de Lucro (' + stats.profitPercentage + '%)', `R$ ${(stats.estimatedRevenue * (stats.profitPercentage / 100)).toLocaleString('pt-BR')}`, `${stats.estimatedRevenue > 0 ? ((stats.profit / (stats.estimatedRevenue * (stats.profitPercentage / 100))) * 100).toFixed(1) : 0}%`],
        ['Meta de Capital de Giro (' + stats.workingCapitalPercentage + '%)', `R$ ${stats.targetWorkingCapital.toLocaleString('pt-BR')}`, `${stats.targetWorkingCapital > 0 ? (((stats.workingCapital * (stats.workingCapitalPercentage / 100)) / stats.targetWorkingCapital) * 100).toFixed(1) : 0}%`]
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
      
      doc.save(`financeiro-vallechic-${selectedMonth.replace(' ', '-')}.pdf`);
      toast.success('Relatório financeiro gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar relatório financeiro.');
    }
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      
      // Parallel data fetching for better performance
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [
        { data: settings },
        { data: products },
        { data: sales },
        { data: saleItems },
        { data: paidInstallments }
      ] = await Promise.all([
        supabase.from('business_settings').select('*').limit(1).maybeSingle(),
        supabase.from('products').select('stock, cost_price'),
        supabase.from('sales').select('*'),
        supabase.from('sale_items').select('quantity, created_at, products (cost_price)'),
        supabase.from('installments').select('amount, paid_at').eq('status', 'pago')
      ]);
      
      const estimatedRevenue = settings?.estimated_revenue || 0;
      const targetWorkingCapital = settings?.target_working_capital || 0;
      const workingCapitalPercentage = settings?.working_capital_percentage || 30;
      const profitPercentage = settings?.profit_percentage || 20;
      
      setNewGoals({ 
        estimatedRevenue: maskCurrency((estimatedRevenue * 100).toFixed(0)), 
        targetWorkingCapital: maskCurrency((targetWorkingCapital * 100).toFixed(0)),
        workingCapitalPercentage,
        profitPercentage
      });

      const invested = products?.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.cost_price || 0)), 0) || 0;
      
      // Filter sales for current month
      const monthlySales = sales?.filter(s => {
        const d = new Date(s.sale_date);
        return (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
      }) || [];

      const revenue = monthlySales.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
      
      // Working Capital is the total cash actually received (Sales down payments + Paid installments)
      // For the progress card, we might want the total received this month or overall.
      // Usually, "Capital de Giro" is the total available cash.
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

      setStats({
        revenue,
        itemsSold,
        invested,
        profit,
        workingCapital,
        estimatedRevenue,
        targetWorkingCapital,
        workingCapitalPercentage,
        profitPercentage
      });

    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    try {
      setLoading(true);
      // Fetch the first row to get the ID if it exists
      const { data: existing, error: fetchError } = await supabase
        .from('business_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.warn('Error fetching settings:', fetchError);
      }

      const payload: any = {
        estimated_revenue: parseCurrency(newGoals.estimatedRevenue),
        target_working_capital: parseCurrency(newGoals.targetWorkingCapital),
        working_capital_percentage: newGoals.workingCapitalPercentage,
        profit_percentage: newGoals.profitPercentage,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('business_settings')
          .update(payload)
          .eq('id', existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('business_settings')
          .insert([payload]);
        error = insertError;
      }

      if (error) {
        if (error.code === '42703') {
          throw new Error('As colunas de percentual ainda não existem no banco de dados. Por favor, execute a migração SQL.');
        }
        throw error;
      }
      
      setIsGoalsModalOpen(false);
      await fetchFinanceData();
      toast.success('Metas atualizadas com sucesso!');
    } catch (error: any) {
      console.error('Error saving goals:', error);
      toast.error(`Erro ao salvar metas: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-32 overflow-y-auto">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-6">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <div>
              <h2 className="font-headline text-2xl italic">Admin <span className="text-secondary">VC</span></h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="w-10 h-10 rounded-full bg-primary/40 backdrop-blur-sm border border-secondary/20 flex items-center justify-center text-surface/60 hover:text-secondary transition-colors" 
              title="Gerar Relatório PDF"
            >
              <span className="material-symbols-outlined">picture_as_pdf</span>
            </button>
            <NotificationBell />
          </div>
        </header>

        <div className="px-4 md:px-8">
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="font-headline text-xl italic">Finanças <span className="text-secondary">VC</span></h2>
              <p className="text-surface/60 text-[11px] uppercase tracking-widest font-medium mt-1">Performance • {selectedMonth}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 bg-primary/40 p-1.5 rounded-2xl border border-secondary/10">
              <button 
                onClick={() => setIsGoalsModalOpen(true)}
                className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary/10 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">settings</span>
                Metas
              </button>
              <div className="w-px h-4 bg-secondary/10 self-center"></div>
              <Link 
                to="/admin/debts"
                className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary/10 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                Dívidas
              </Link>
              <div className="w-px h-4 bg-secondary/10 self-center"></div>
              <div className="relative">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-secondary pl-2 pr-8 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] appearance-none cursor-pointer focus:outline-none"
                >
                  <option value="Janeiro 2026">Janeiro 2026</option>
                  <option value="Fevereiro 2026">Fevereiro 2026</option>
                  <option value="Março 2026">Março 2026</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-secondary text-xs pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Profit Distribution Progress */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 rounded-2xl border border-secondary/20 shadow-lg"
                >
                  <div className="flex flex-col mb-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-secondary text-sm font-bold uppercase tracking-widest mb-1">Distribuição de Lucro</h3>
                        <p className="text-surface/60 text-xs">Lucro Realizado ({stats.profitPercentage}%) vs. Meta Mensal</p>
                      </div>
                      <div className="flex items-center gap-1 bg-secondary/10 px-2 py-1 rounded-lg">
                        <span className="text-xs font-bold text-secondary">
                          {stats.estimatedRevenue > 0 ? (((stats.workingCapital * (stats.profitPercentage / 100)) / (stats.estimatedRevenue * (stats.profitPercentage / 100))) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-surface">
                        R$ {(stats.workingCapital * (stats.profitPercentage / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-surface/40 text-sm ml-2">/ R$ {(stats.estimatedRevenue * (stats.profitPercentage / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full h-4 bg-surface/10 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((stats.workingCapital * (stats.profitPercentage / 100)) / ((stats.estimatedRevenue * (stats.profitPercentage / 100)) || 1)) * 100, 100)}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className={`h-full relative ${(((stats.workingCapital * (stats.profitPercentage / 100)) / ((stats.estimatedRevenue * (stats.profitPercentage / 100)) || 1)) * 100) > 0 ? 'bg-gradient-to-r from-[#FFD700]/60 to-[#FFD700]' : 'bg-transparent'}`}
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:30px_30px] animate-[shimmer_2s_linear_infinite]"></div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* Working Capital Progress */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-6 rounded-2xl border border-secondary/20 shadow-lg"
                >
                  <div className="flex flex-col mb-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-1">Capital de Giro</h3>
                        <p className="text-surface/60 text-xs">Saldo em Caixa ({stats.workingCapitalPercentage}%) vs. Meta de Capital</p>
                      </div>
                      <div className="flex items-center gap-1 bg-blue-400/10 px-2 py-1 rounded-lg">
                        <span className="text-xs font-bold text-blue-400">
                          {stats.targetWorkingCapital > 0 ? (((stats.workingCapital * (stats.workingCapitalPercentage / 100)) / stats.targetWorkingCapital) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-surface">
                        R$ {(stats.workingCapital * (stats.workingCapitalPercentage / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-surface/40 text-sm ml-2">/ R$ {stats.targetWorkingCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full h-4 bg-surface/10 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((stats.workingCapital * (stats.workingCapitalPercentage / 100)) / (stats.targetWorkingCapital || 1)) * 100, 100)}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className={`h-full relative ${(((stats.workingCapital * (stats.workingCapitalPercentage / 100)) / (stats.targetWorkingCapital || 1)) * 100) > 0 ? 'bg-gradient-to-r from-blue-400/60 to-blue-400' : 'bg-transparent'}`}
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:30px_30px] animate-[shimmer_2s_linear_infinite]"></div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-4 rounded-2xl border-t-2 border-t-emerald-400 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="material-symbols-outlined text-emerald-400 text-lg">trending_up</span>
                    <h3 className="text-surface/40 text-[9px] uppercase tracking-widest font-bold">Faturamento</h3>
                  </div>
                  <div>
                    <p className="font-headline text-xl text-surface">R$ {stats.revenue.toLocaleString('pt-BR')}</p>
                    <p className="text-[8px] text-surface/30 uppercase mt-1">Total bruto</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-4 rounded-2xl border-t-2 border-t-blue-400 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="material-symbols-outlined text-blue-400 text-lg">account_balance_wallet</span>
                    <h3 className="text-surface/40 text-[9px] uppercase tracking-widest font-bold">Capital</h3>
                  </div>
                  <div>
                    <p className="font-headline text-xl text-surface">R$ {stats.workingCapital.toLocaleString('pt-BR')}</p>
                    <p className="text-[8px] text-surface/30 uppercase mt-1">Em caixa</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card p-4 rounded-2xl border-t-2 border-t-secondary flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="material-symbols-outlined text-secondary text-lg">payments</span>
                    <h3 className="text-surface/40 text-[9px] uppercase tracking-widest font-bold">Lucro</h3>
                  </div>
                  <div>
                    <p className="font-headline text-xl text-surface">R$ {stats.profit.toLocaleString('pt-BR')}</p>
                    <p className="text-secondary text-[8px] uppercase mt-1 font-bold">Margem: {stats.revenue > 0 ? Math.round((stats.profit / stats.revenue) * 100) : 0}%</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card p-4 rounded-2xl border-t-2 border-t-amber-400 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">inventory_2</span>
                    <h3 className="text-surface/40 text-[9px] uppercase tracking-widest font-bold">Estoque</h3>
                  </div>
                  <div>
                    <p className="font-headline text-xl text-surface">R$ {stats.invested.toLocaleString('pt-BR')}</p>
                    <p className="text-[8px] text-surface/30 uppercase mt-1">Custo total</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="glass-card p-4 rounded-2xl border-t-2 border-t-purple-400 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="material-symbols-outlined text-purple-400 text-lg">shopping_cart</span>
                    <h3 className="text-surface/40 text-[9px] uppercase tracking-widest font-bold">Vendas</h3>
                  </div>
                  <div>
                    <p className="font-headline text-xl text-surface">{stats.itemsSold}</p>
                    <p className="text-[8px] text-surface/30 uppercase mt-1">Unidades</p>
                  </div>
                </motion.div>
              </div>

              {/* Goals Modal */}
              <AnimatePresence>
                {isGoalsModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="glass-card w-full max-w-md p-8 rounded-3xl border border-secondary/20 shadow-2xl"
                    >
                      <h3 className="font-headline text-2xl italic mb-6">Configurar Metas</h3>
                      
                      <div className="space-y-6">
                        {/* Monetary Values Section */}
                        <div className="space-y-4">
                          <h4 className="text-secondary text-sm font-bold uppercase tracking-widest border-b border-secondary/20 pb-2">Valores Monetários</h4>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-surface/60">Faturamento Estimado (Mês)</label>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              value={newGoals.estimatedRevenue}
                              onChange={(e) => setNewGoals({ ...newGoals, estimatedRevenue: maskCurrency(e.target.value) })}
                              className="w-full bg-primary/40 border border-secondary/20 rounded-xl py-3 px-4 text-surface font-bold text-lg focus:outline-none focus:border-secondary transition-colors"
                              placeholder="R$ 0,00"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-surface/60">Capital de Giro Desejado</label>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              value={newGoals.targetWorkingCapital}
                              onChange={(e) => setNewGoals({ ...newGoals, targetWorkingCapital: maskCurrency(e.target.value) })}
                              className="w-full bg-primary/40 border border-secondary/20 rounded-xl py-3 px-4 text-surface font-bold text-lg focus:outline-none focus:border-secondary transition-colors"
                              placeholder="R$ 0,00"
                            />
                          </div>
                        </div>

                        {/* Percentages Section */}
                        <div className="space-y-4 pt-4">
                          <h4 className="text-secondary text-sm font-bold uppercase tracking-widest border-b border-secondary/20 pb-2">Distribuição Percentual</h4>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <div className="flex flex-col">
                                <label className="text-[10px] uppercase tracking-widest text-surface/60 mb-1">Capital de Giro</label>
                                <span className="text-secondary font-headline text-2xl italic">{newGoals.workingCapitalPercentage}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0"
                                max="100"
                                step="1"
                                value={newGoals.workingCapitalPercentage}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const revenue = parseCurrency(newGoals.estimatedRevenue);
                                  const targetVal = (revenue * (val / 100)).toFixed(0);
                                  setNewGoals({ 
                                    ...newGoals, 
                                    workingCapitalPercentage: val,
                                    targetWorkingCapital: maskCurrency(targetVal)
                                  });
                                }}
                                className="w-full accent-secondary h-2 bg-primary/40 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                            <div className="space-y-3">
                              <div className="flex flex-col">
                                <label className="text-[10px] uppercase tracking-widest text-surface/60 mb-1">Lucro</label>
                                <span className="text-secondary font-headline text-2xl italic">{newGoals.profitPercentage}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0"
                                max="100"
                                step="1"
                                value={newGoals.profitPercentage}
                                onChange={(e) => setNewGoals({ ...newGoals, profitPercentage: parseInt(e.target.value) || 0 })}
                                className="w-full accent-secondary h-2 bg-primary/40 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {newGoals.workingCapitalPercentage + newGoals.profitPercentage > 100 && (
                          <p className="text-rose-400 text-[10px] uppercase tracking-widest font-bold text-center bg-rose-400/10 py-2 rounded-lg">
                            A soma das porcentagens não pode exceder 100%
                          </p>
                        )}

                        <div className="flex gap-4 pt-6">
                          <button 
                            onClick={() => setIsGoalsModalOpen(false)}
                            className="flex-1 py-3 rounded-xl border border-transparent text-surface/60 font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 hover:text-surface transition-all"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={handleSaveGoals}
                            disabled={newGoals.workingCapitalPercentage + newGoals.profitPercentage > 100}
                            className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg ${newGoals.workingCapitalPercentage + newGoals.profitPercentage > 100 ? 'bg-surface/10 text-surface/20 cursor-not-allowed shadow-none' : 'bg-secondary text-primary hover:bg-secondary/90 shadow-secondary/20 hover:shadow-secondary/40 hover:-translate-y-0.5'}`}
                          >
                            Salvar Metas
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-headline text-xl italic mb-6">Fluxo de Caixa</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <p className="text-sm font-medium">Entradas (Vendas)</p>
                      <p className="text-[10px] text-surface/60 uppercase tracking-widest">Total acumulado</p>
                    </div>
                    <p className="text-emerald-400 font-bold">R$ {stats.revenue.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <p className="text-sm font-medium">Custo de Mercadoria Vendida (CMV)</p>
                      <p className="text-[10px] text-surface/60 uppercase tracking-widest">Baseado no custo real</p>
                    </div>
                    <p className="text-rose-400 font-bold">- R$ {(stats.revenue - stats.profit).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="h-px bg-white/10 my-4" />
                  <div className="flex justify-between items-center p-4 rounded-xl bg-secondary/10 border border-secondary/20">
                    <div>
                      <p className="text-sm font-bold text-secondary">Saldo Operacional</p>
                      <p className="text-[10px] text-secondary/60 uppercase tracking-widest">Líquido real</p>
                    </div>
                    <p className="text-secondary font-bold text-xl">R$ {stats.profit.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </>
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
              <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">Capital de Giro</p>
              <span className="text-xs font-bold">{stats.targetWorkingCapital > 0 ? (((stats.workingCapital * (stats.workingCapitalPercentage / 100)) / stats.targetWorkingCapital) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary" 
                style={{ width: `${Math.min(((stats.workingCapital * (stats.workingCapitalPercentage / 100)) / (stats.targetWorkingCapital || 1)) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-white/60">
              <span>R$ {(stats.workingCapital * (stats.workingCapitalPercentage / 100)).toLocaleString('pt-BR')}</span>
              <span>Meta: R$ {stats.targetWorkingCapital.toLocaleString('pt-BR')}</span>
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
