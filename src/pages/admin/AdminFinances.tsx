import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import { toast } from 'sonner';
import { maskCurrency, parseCurrency } from '../../lib/utils';
import NotificationModal from '../../components/NotificationModal';
import PDFPreviewModal from '../../components/PDFPreviewModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const colorClass = isTeal ? 'text-[#25A2A9]' : 'text-[#335EDD]';
  const borderClass = isTeal ? 'border-[#25A2A9]/30' : 'border-[#335EDD]/30';
  const bgGlowClass = isTeal ? 'bg-[#25A2A9]/5' : 'bg-[#335EDD]/5';
  const iconBgClass = isTeal ? 'bg-[#25A2A9]/10' : 'bg-[#335EDD]/10';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-[#0B111D]/90 backdrop-blur-xl p-6 rounded-[24px] border ${borderClass} shadow-lg relative overflow-hidden cursor-pointer group`}
    >
      {/* Inner Glow */}
      <div className={`absolute top-0 left-0 w-full h-full ${bgGlowClass} opacity-100 blur-2xl pointer-events-none`}></div>
      
      <div className="flex flex-col relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full ${iconBgClass} flex items-center justify-center`}>
            <span className={`material-symbols-outlined ${colorClass} text-[20px] font-light`}>{icon}</span>
          </div>
          <h3 className={`${colorClass} text-[15px] font-sans font-medium`}>{title}</h3>
        </div>
        
        <div className="mb-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-sans font-light text-surface/70">R$</span>
          <span className="text-[42px] font-sans font-bold text-surface tracking-tight leading-none">
            {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <p className="text-[13px] font-sans font-normal text-surface/70 mb-4">
          Distribuído: {percentOf}% do Lucro Real
        </p>
        
        <div className="w-full h-px bg-surface/10 mb-4"></div>
        
        <div className="flex items-center justify-between">
          <span className="text-surface/50 text-[12px] font-sans">{updatedAt}</span>
          <div className={`flex items-center gap-1 ${colorClass} text-[13px] font-sans font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform`}>
            <span>{actionText}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
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
    profitPercentage: 70
  });
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [newGoals, setNewGoals] = useState({
    workingCapitalPercentage: 30,
    profitPercentage: 70
  });
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
        ['Lucro Realizado', `R$ ${stats.profit.toLocaleString('pt-BR')}`, '100%'],
        ['Lucro Disponível (' + stats.profitPercentage + '%)', `R$ ${(stats.profit * (stats.profitPercentage / 100)).toLocaleString('pt-BR')}`, '-'],
        ['Capital de Giro (' + stats.workingCapitalPercentage + '%)', `R$ ${(stats.profit * (stats.workingCapitalPercentage / 100)).toLocaleString('pt-BR')}`, '-']
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
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Parallel data fetching for better performance
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const mesAno = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

      const [
        { data: settings },
        { data: products },
        { data: sales },
        { data: saleItems },
        { data: paidInstallments }
      ] = await Promise.all([
        user ? supabase.from('configuracoes_metas')
          .select('*')
          .eq('user_id', user.id)
          .eq('mes_ano', mesAno)
          .maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('products').select('stock, cost_price'),
        supabase.from('sales').select('*'),
        supabase.from('sale_items').select('quantity, created_at, products (cost_price)'),
        supabase.from('installments').select('amount, paid_at').eq('status', 'pago')
      ]);
      
      const workingCapitalPercentage = settings?.percentual_capital_giro || 30;
      const profitPercentage = settings?.percentual_lucro || 70;
      
      setNewGoals({ 
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
      // Usually, "Capital de Giro" is the total available cash overall.
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

      // Profit should be calculated based on the items sold this month
      // Revenue is the total amount of sales this month
      // COGS is the cost of goods sold this month
      const profit = revenue - cogs;
      const itemsSold = monthlySaleItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

      setStats({
        revenue,
        itemsSold,
        invested,
        profit,
        workingCapital,
        workingCapitalPercentage,
        profitPercentage
      });
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const mesAno = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

      const capitalGiroDesejado = stats.profit * (newGoals.workingCapitalPercentage / 100);
      const faturamentoEstimado = stats.revenue;

      const payload = {
        user_id: user.id,
        mes_ano: mesAno,
        faturamento_estimado: faturamentoEstimado,
        capital_giro_desejado: capitalGiroDesejado,
        percentual_capital_giro: newGoals.workingCapitalPercentage,
        percentual_lucro: newGoals.profitPercentage,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('configuracoes_metas')
        .upsert(payload, { onConflict: 'user_id,mes_ano' });

      if (error) {
        if (error.code === '42P01') {
          throw new Error('A tabela configuracoes_metas não existe. Por favor, crie-a no Supabase.');
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

      <main className="flex-1 min-w-0 p-0 pb-32 ">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-6">
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
            <NotificationSino />
          </div>
        </header>

        <div className="px-4 md:px-6 pt-24">
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-headline text-xl italic text-secondary">Finanças VC</h2>
                <p className="text-surface/60 text-[11px] uppercase tracking-widest font-medium mt-1">Performance</p>
              </div>
              
              {/* Date Selector */}
              <div className="relative flex items-center mt-1">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-surface/60 pr-5 font-sans font-medium text-[12px] appearance-none cursor-pointer focus:outline-none"
                >
                  <option value="Janeiro 2026">Janeiro 2026</option>
                  <option value="Fevereiro 2026">Fevereiro 2026</option>
                  <option value="Março 2026">Março 2026</option>
                </select>
                <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-surface/40 text-[14px] font-light pointer-events-none">expand_more</span>
              </div>
            </div>
            
            {/* Action Pills */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsGoalsModalOpen(true)}
                className="px-4 py-1.5 rounded-full bg-secondary/5 border border-secondary/30 backdrop-blur-md text-[11px] font-sans font-medium text-secondary hover:bg-secondary/10 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px] font-light">settings</span>
                Metas
              </button>
              <Link 
                to="/admin/debts"
                className="px-4 py-1.5 rounded-full bg-blue-400/5 border border-blue-400/30 backdrop-blur-md text-[11px] font-sans font-medium text-blue-400 hover:bg-blue-400/10 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px] font-light">account_balance_wallet</span>
                Dívidas
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center px-1">
                <p className="text-surface/60 text-[11px] uppercase tracking-widest font-bold font-sans">
                  BASE DE CÁLCULO: <span className="text-secondary">LUCRO REAL (R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-8">
                {/* Profit Distribution */}
                <FinancialCard 
                  title="Lucro Disponível"
                  value={stats.profit * (stats.profitPercentage / 100)}
                  percentOf={stats.profitPercentage}
                  updatedAt={getTimeAgo(lastUpdated)}
                  actionText="VER DETALHES"
                  icon="payments"
                  colorTheme="teal"
                  onClick={() => setIsGoalsModalOpen(true)}
                />

                {/* Working Capital */}
                <FinancialCard 
                  title="Capital de Giro"
                  value={stats.profit * (stats.workingCapitalPercentage / 100)}
                  percentOf={stats.workingCapitalPercentage}
                  updatedAt={getTimeAgo(lastUpdated)}
                  actionText="GERENCIAR"
                  icon="account_balance"
                  colorTheme="blue"
                  onClick={() => setIsGoalsModalOpen(true)}
                />
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
                      className="glass-card w-full max-w-md p-8 rounded-t-[24px] rounded-b-3xl border border-secondary/20 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                      <h3 className="font-headline text-2xl italic mb-6 text-secondary uppercase tracking-wider text-center">Metas Financeiras</h3>
                      
                      {/* Cabeçalho Dinâmico */}
                      <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 mb-6 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1">Lucro Líquido Real (Mês Atual)</p>
                          <p className="text-2xl font-headline text-surface">R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined">payments</span>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        {/* Monetary Values Section */}
                        <div className="space-y-4">
                          <h4 className="text-secondary text-sm font-bold uppercase tracking-widest border-b border-secondary/20 pb-2">Valores Monetários</h4>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] uppercase tracking-widest text-surface/60">Capital de Giro Desejado</label>
                              <span className="text-[8px] uppercase tracking-widest text-secondary font-bold">Calculado Automaticamente</span>
                            </div>
                            <div className="w-full bg-surface/10 border border-surface/20 rounded-xl py-3 px-4 flex items-center justify-between opacity-80 cursor-not-allowed">
                              <span className="text-surface font-bold text-lg">
                                R$ {(stats.profit * (newGoals.workingCapitalPercentage / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="material-symbols-outlined text-secondary/60 text-xl">lock</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] uppercase tracking-widest text-surface/60">Meta de Lucro (Mês)</label>
                              <span className="text-[8px] uppercase tracking-widest text-secondary font-bold">Calculado Automaticamente</span>
                            </div>
                            <div className="w-full bg-surface/10 border border-surface/20 rounded-xl py-3 px-4 flex items-center justify-between opacity-80 cursor-not-allowed">
                              <span className="text-surface font-bold text-lg">
                                R$ {(stats.profit * (newGoals.profitPercentage / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="material-symbols-outlined text-secondary/60 text-xl">lock</span>
                            </div>
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
                                  setNewGoals({ 
                                    ...newGoals, 
                                    workingCapitalPercentage: val,
                                    profitPercentage: 100 - val
                                  });
                                }}
                                className="w-full accent-secondary h-2 bg-primary/40 rounded-lg appearance-none cursor-pointer"
                              />
                              <p className="text-[10px] text-surface/40">
                                Isso representa <span className="text-secondary font-bold">R$ {(stats.profit * (newGoals.workingCapitalPercentage / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> de capital de giro
                              </p>
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
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setNewGoals({ 
                                    ...newGoals, 
                                    profitPercentage: val,
                                    workingCapitalPercentage: 100 - val
                                  });
                                }}
                                className="w-full accent-secondary h-2 bg-primary/40 rounded-lg appearance-none cursor-pointer"
                              />
                              <p className="text-[10px] text-surface/40">
                                Isso representa <span className="text-secondary font-bold">R$ {(stats.profit * (newGoals.profitPercentage / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> de lucro estimado
                              </p>
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
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl border border-secondary/30 bg-gradient-to-b from-black to-surface/5 text-secondary font-bold uppercase tracking-widest text-[10px] hover:bg-secondary/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            Cancelar
                          </button>
                          <button 
                            onClick={handleSaveGoals}
                            disabled={newGoals.workingCapitalPercentage + newGoals.profitPercentage > 100 || loading}
                            className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg flex items-center justify-center gap-2 ${newGoals.workingCapitalPercentage + newGoals.profitPercentage > 100 || loading ? 'bg-surface/10 text-surface/20 cursor-not-allowed shadow-none' : 'bg-gradient-to-b from-secondary to-[#997a26] text-primary hover:from-[#e6c258] hover:to-[#806620] shadow-secondary/20 hover:shadow-secondary/40 hover:-translate-y-0.5 border border-[#ffdf70]/50'}`}
                          >
                            {loading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-surface/20 border-t-surface/60 rounded-full animate-spin"></div>
                                Salvando...
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[16px]">save</span>
                                Salvar Metas
                              </>
                            )}
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

