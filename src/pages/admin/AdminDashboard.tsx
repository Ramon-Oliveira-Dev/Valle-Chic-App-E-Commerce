import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, ChevronRight, UserMinus, CheckCircle, UserCheck, AlertTriangle, ArrowRight, Gift, Sparkles, Download, Upload } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useTheme } from '../../contexts/ThemeContext';

import NotificationSino from '../../components/NotificationSino';
import PDFPreviewModal from '../../components/PDFPreviewModal';
import MenuButton from '../../components/MenuButton';

export default function AdminDashboard() {
  const { isDesktopSidebarCollapsed } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalStock: 0,
    stockValue: 0,
    toReceive: 0,
    totalReceived: 0,
    activeClients: 0,
    inadimplentesCount: 0,
    incompleteProfileCount: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [birthdayClients, setBirthdayClients] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stockCarouselRef = useRef<HTMLDivElement>(null);

  const handleExportBackup = () => {
    try {
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        products: localStorage.getItem('vc_products') ? JSON.parse(localStorage.getItem('vc_products')!) : [],
        sales: localStorage.getItem('vc_sales') ? JSON.parse(localStorage.getItem('vc_sales')!) : [],
        clients: localStorage.getItem('vc_clients') ? JSON.parse(localStorage.getItem('vc_clients')!) : [],
        debts: localStorage.getItem('vc_debts') ? JSON.parse(localStorage.getItem('vc_debts')!) : [],
        mimos: localStorage.getItem('vc_mimos') ? JSON.parse(localStorage.getItem('vc_mimos')!) : [],
        notifications: localStorage.getItem('vc_notifications') ? JSON.parse(localStorage.getItem('vc_notifications')!) : [],
        logs: localStorage.getItem('vc_logs') ? JSON.parse(localStorage.getItem('vc_logs')!) : [],
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `valle-chic-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Backup exportado com sucesso! Seus dados estão salvos para o deploy.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao exportar backup.');
    }
  };

  const handleImportBackup = (event: any) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (parsed && typeof parsed === 'object') {
            if (parsed.products) localStorage.setItem('vc_products', JSON.stringify(parsed.products));
            if (parsed.sales) localStorage.setItem('vc_sales', JSON.stringify(parsed.sales));
            if (parsed.clients) localStorage.setItem('vc_clients', JSON.stringify(parsed.clients));
            if (parsed.debts) localStorage.setItem('vc_debts', JSON.stringify(parsed.debts));
            if (parsed.mimos) localStorage.setItem('vc_mimos', JSON.stringify(parsed.mimos));
            if (parsed.notifications) localStorage.setItem('vc_notifications', JSON.stringify(parsed.notifications));
            if (parsed.logs) localStorage.setItem('vc_logs', JSON.stringify(parsed.logs));

            toast.success('Backup restaurado com sucesso! Atualizando sistema...');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            toast.error('Arquivo de backup inválido.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Erro ao ler arquivo de backup.');
        }
      };
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!recentOrders.length) return;
    
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        const cardWidth = 280 + 16; // 280px width + 16px gap
        
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          // Reached the end, scroll back to start
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Scroll to next card
          carouselRef.current.scrollTo({ left: scrollLeft + cardWidth, behavior: 'smooth' });
        }
      }
    }, 4000);
    
    return () => clearInterval(interval);
  }, [recentOrders]);

  useEffect(() => {
    if (!lowStockItems.length) return;
    
    const interval = setInterval(() => {
      if (stockCarouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = stockCarouselRef.current;
        const cardWidth = 280 + 16; // 280px width + 16px gap
        
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          // Reached the end, scroll back to start
          stockCarouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Scroll to next card
          stockCarouselRef.current.scrollTo({ left: scrollLeft + cardWidth, behavior: 'smooth' });
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [lowStockItems]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setDbStatus('checking');
      
      const currentMonth = new Date().getMonth() + 1;

      // Parallel data fetching for better performance
      const [
        { totalStock, stockValue },
        lowStock,
        allClients,
        todayBirthdays,
        upcomingBdays,
        recentSales,
        toReceive,
        totalReceived,
      ] = await Promise.all([
        api.products.getStats(),
        api.products.getLowStock(2, 3),
        api.clients.getAll(),
        api.clients.getTodayBirthdays(),
        api.clients.getUpcomingBirthdays(7),
        api.sales.getRecent(5),
        api.sales.getAccountsReceivable(),
        api.sales.getTotalReceived(),
      ]);

      let inadimplentesCount = (allClients as any[]).filter(c => c.payment_status === 'Inadimplente').length;
      if (isSupabaseConfigured) {
        try {
          const inadimplentesRes = await supabase.from('clients').select('id', { count: 'exact', head: true }).eq('payment_status', 'Inadimplente');
          if (typeof inadimplentesRes.count === 'number') {
            inadimplentesCount = inadimplentesRes.count;
          }
        } catch (e) {
          console.warn('Inadimplentes count error:', e);
        }
      }

      const incompleteCount = (allClients as any[]).filter(c => c.status === 'Pendente').length;

      setDbStatus('online');

      setStats({
        totalStock,
        stockValue,
        toReceive,
        totalReceived,
        activeClients: (allClients as any[]).filter(c => c.status === 'Ativo').length,
        inadimplentesCount,
        incompleteProfileCount: incompleteCount
      });
      setRecentOrders(recentSales || []);
      setLowStockItems(lowStock);
      setBirthdayClients(todayBirthdays);
      setUpcomingBirthdays(upcomingBdays);

      // Check for today's birthdays and create notifications
      if (todayBirthdays?.length > 0) {
        for (const client of todayBirthdays) {
          try {
            await api.notifications.insert({
              type: 'aniversario',
              title: `Aniversário: ${client.name}`,
              message: `Hoje é o aniversário de ${client.name}! Envie um parabéns especial.`,
              priority: 'medium'
            });
          } catch {
            // ignore
          }
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDbStatus('offline');
      toast.error('Erro ao carregar dados do dashboard. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      
      // Logo placeholder (simulated with text for now, or you can add a base64 image)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(191, 155, 48); // Secondary color
      doc.text('VALLE CHIC', 105, 25, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.setFont('helvetica', 'italic');
      doc.text('Elegância e Sofisticação em cada detalhe', 105, 32, { align: 'center' });
      
      doc.setDrawColor(191, 155, 48);
      doc.setLineWidth(0.5);
      doc.line(20, 38, 190, 38);
      
      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text('RELATÓRIO ADMINISTRATIVO', 105, 50, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, 57, { align: 'center' });
      
      // Stats Section
      doc.setFontSize(14);
      doc.setTextColor(191, 155, 48);
      doc.text('RESUMO GERAL', 14, 75);
      
      const statsData = [
        ['Total em Estoque', `${stats.totalStock} peças`],
        ['Valor do Estoque (Custo)', `R$ ${stats.stockValue.toLocaleString('pt-BR')}`],
        ['Total Recebido', `R$ ${stats.totalReceived.toLocaleString('pt-BR')}`],
        ['A Receber', `R$ ${stats.toReceive.toLocaleString('pt-BR')}`],
        ['Clientes Ativos', `${stats.activeClients}`]
      ];
      
      autoTable(doc, {
        startY: 80,
        head: [['Indicador', 'Valor']],
        body: statsData,
        theme: 'grid',
        headStyles: { fillColor: [191, 155, 48], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
      });
      
      // Recent Orders Section
      const lastY = (doc as any).lastAutoTable?.finalY || 120;
      doc.setFontSize(14);
      doc.setTextColor(191, 155, 48);
      doc.text('VENDAS RECENTES', 14, lastY + 20);
      
      const ordersData = recentOrders.map(order => [
        `#${order.id.slice(0, 4)}`,
        order.clients?.name || 'N/A',
        new Date(order.sale_date).toLocaleDateString('pt-BR'),
        order.status.toUpperCase(),
        `R$ ${order.total_amount.toLocaleString('pt-BR')}`
      ]);
      
      autoTable(doc, {
        startY: lastY + 25,
        head: [['Venda', 'Cliente', 'Data', 'Status', 'Valor Total']],
        body: ordersData,
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
      });
      
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Valle Chic - Sistema de Gestão Administrativa - Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
      }
      
      doc.save('relatorio-administrativo-Valle Chic.pdf');
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF.');
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main Content */}
      <main className={`flex-1 min-w-0 p-0 pb-36 sm:pb-32 lg:pb-16 ${isDesktopSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px]'} transition-all duration-300`}>
        <header className={`fixed top-0 left-0 right-0 ${isDesktopSidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[240px]'} z-30 flex items-center justify-between px-6 py-3 bar-fume transition-all duration-300 border-b border-white/5`}>
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <MenuButton onClick={() => setIsSidebarOpen(true)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSino />
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pt-24 pb-8">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-3xl italic">Dashboard</h2>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
                Visão geral do negócio e métricas executivas
              </p>
            </div>

            {/* Vercel / Cloud Backup & Restore Banner */}
            <div className="bg-[#0F1420]/95 backdrop-blur-2xl rounded-[18px] p-3 sm:px-4 sm:py-2.5 border border-secondary/30 shadow-md flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary border border-secondary/30 flex items-center justify-center shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-headline text-xs sm:text-sm italic text-white font-bold leading-tight">Backup para Vercel</h3>
                  <p className="text-[9px] text-surface/50">Salve ou restaure seus dados</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-3 py-1.5 rounded-xl bg-secondary text-primary font-bold text-[10px] uppercase tracking-wider hover:bg-white transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Exportar Backup (.json)"
                >
                  <Download className="w-3 h-3" />
                  <span>Baixar</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-secondary/15 hover:bg-secondary hover:text-primary text-secondary border border-secondary/40 font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Restaurar Backup"
                >
                  <Upload className="w-3 h-3" />
                  <span>Restaurar</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportBackup} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          {/* Stats Grid - Ultra Compact & Organized */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="bg-[#0F1420]/95 backdrop-blur-2xl p-5 rounded-[24px] border border-secondary/20 shadow-lg shadow-secondary/5 flex flex-col justify-between cursor-pointer transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center shrink-0 shadow-md">
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                </div>
                <p className="text-surface/30 text-[9px] font-black uppercase tracking-widest truncate">Estoque</p>
              </div>
              <p className="font-headline italic text-2xl text-white font-black leading-tight">{stats.totalStock.toLocaleString('pt-BR')}</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0F1420]/95 backdrop-blur-2xl p-5 rounded-[24px] border border-sky-500/20 shadow-lg shadow-sky-950/10 flex flex-col justify-between cursor-pointer transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0 shadow-md">
                  <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                </div>
                <p className="text-surface/30 text-[9px] font-black uppercase tracking-widest truncate">Investimento</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-sans font-black text-surface/30 uppercase tracking-wide">R$</span>
                <p className="font-headline italic text-2xl text-white font-black leading-tight">{stats.stockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0F1420]/95 backdrop-blur-2xl p-5 rounded-[24px] border border-emerald-500/20 shadow-lg shadow-emerald-950/10 flex flex-col justify-between cursor-pointer transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-md">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                </div>
                <p className="text-surface/30 text-[9px] font-black uppercase tracking-widest truncate">Recebido</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-sans font-black text-surface/30 uppercase tracking-wide">R$</span>
                <p className="font-headline italic text-2xl text-white font-black leading-tight">{stats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0F1420]/95 backdrop-blur-2xl p-5 rounded-[24px] border border-purple-500/20 shadow-lg shadow-purple-950/10 flex flex-col justify-between cursor-pointer transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-md">
                  <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                </div>
                <p className="text-surface/30 text-[9px] font-black uppercase tracking-widest truncate">A Receber</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-sans font-black text-surface/30 uppercase tracking-wide">R$</span>
                <p className="font-headline italic text-2xl text-white font-black leading-tight">{stats.toReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </motion.div>
          </div>

          {/* Enhanced Clients Card - Integrated Compact Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#0B111D] p-3 sm:p-3.5 rounded-[14px] border-t border-t-secondary/30 shadow-md mb-2.5 overflow-hidden relative group"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 relative z-10">
              <div>
                <h3 className="font-headline text-lg italic mb-0.5">Gestão de Clientes</h3>
                <p className="text-surface/40 text-[8px] uppercase tracking-widest font-bold">Base de dados e indicadores</p>
              </div>
              
              <div className="flex flex-row justify-around items-center w-full md:w-auto gap-4 md:gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-[#4CAF50] opacity-70" />
                    <p className="text-surface/60 text-[8px] uppercase tracking-widest font-bold">Ativos</p>
                  </div>
                  <p className="font-sans font-bold text-lg text-[#4CAF50]">{stats.activeClients}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400 opacity-70" />
                    <p className="text-surface/60 text-[8px] uppercase tracking-widest font-bold">Inadimplentes</p>
                  </div>
                  <p className="font-sans font-bold text-lg text-rose-400">{stats.inadimplentesCount}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <UserMinus className="w-3 h-3 text-orange-400 opacity-70" />
                    <p className="text-surface/60 text-[8px] uppercase tracking-widest font-bold">Sem Cadastro</p>
                  </div>
                  <p className="font-sans font-bold text-lg text-orange-400">{stats.incompleteProfileCount}</p>
                </div>
              </div>

              <Link 
                to="/admin/clients"
                className="w-full md:w-auto px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A1220] font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 hover:bg-[#F3E5AB] transition-all shadow-md shadow-[#D4AF37]/20"
              >
                <span>Gerenciar Clientes</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>

        {/* 2-Column Responsive Grid Layout (Vendas, Estoque & Mimos) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5">
          <div className="xl:col-span-2 space-y-2.5">
            
            {/* Vendas Recentes */}
            <div className="glass-card rounded-[14px] p-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-headline text-base italic">Vendas Recentes</h3>
                <Link to="/admin/sales" className="text-secondary text-[9px] uppercase tracking-widest font-bold hover:underline">Ver Todas</Link>
              </div>
              
              <div className="flex overflow-x-auto gap-2.5 snap-x snap-mandatory hide-scrollbar pb-1" ref={carouselRef}>
                {recentOrders.length === 0 ? (
                  <p className="text-center text-surface/60 text-xs py-4 italic w-full">Nenhuma venda registrada</p>
                ) : (
                  <>
                    {recentOrders.map((order) => (
                      <div key={order.id} className="min-w-[230px] w-[230px] h-[115px] bg-[#161B22] rounded-[12px] p-2.5 flex flex-col justify-between shadow-md snap-start border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-white text-xs truncate pr-2">{order.clients?.name || 'Consumidor Final'}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] uppercase tracking-widest font-bold whitespace-nowrap ${
                            order.status === 'pago' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {order.status === 'pago' ? 'PAGO' : 'AGUARDANDO...'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2.5 my-auto">
                          {order.sale_items?.[0]?.products?.image_url ? (
                            <img src={order.sale_items[0].products.image_url} alt="Produto" className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]/20 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20 shrink-0">
                              <span className="text-[9px] font-bold text-[#D4AF37]">VC</span>
                            </div>
                          )}
                          <div className="flex-1 flex flex-col justify-center overflow-hidden">
                            {order.sale_items?.[0] ? (
                              <span className="text-[11px] text-gray-300 truncate">
                                <span className="font-bold text-[#D4AF37]">{order.sale_items[0].quantity}x</span> {order.sale_items[0].products?.name || 'Produto Excluído'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-500 italic">Sem itens</span>
                            )}
                            {order.sale_items?.length > 1 && (
                              <span className="text-[9px] text-gray-500">+ {order.sale_items.length - 1} outro(s)</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-end border-t border-white/5 pt-1.5">
                          <span className="text-[9px] text-gray-500">{new Date(order.created_at || order.sale_date).toLocaleDateString('pt-BR')}</span>
                          <span className="font-bold text-[#FFD700] text-xs">
                            R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    <Link to="/admin/sales" className="min-w-[160px] w-[160px] h-[115px] bg-[#161B22]/50 rounded-[12px] p-2.5 flex flex-col items-center justify-center shadow-md snap-start border border-dashed border-[#D4AF37]/30 hover:bg-[#161B22] transition-colors group">
                      <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-1.5 group-hover:bg-[#D4AF37]/20 transition-colors">
                        <ChevronRight className="text-[#D4AF37] w-4 h-4" />
                      </div>
                      <span className="text-[#D4AF37] font-bold text-[10px] uppercase tracking-widest">Ver Todas</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Estoque Baixo */}
            <div className="glass-card rounded-[14px] p-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-headline text-base italic">Estoque Baixo</h3>
                <Link to="/admin/inventory" className="text-secondary text-[9px] uppercase tracking-widest font-bold hover:underline">Ver Completo</Link>
              </div>
              
              <div className="flex overflow-x-auto gap-2.5 snap-x snap-mandatory hide-scrollbar pb-1" ref={stockCarouselRef}>
                {lowStockItems.length === 0 ? (
                  <p className="text-center text-surface/60 text-xs py-4 italic w-full">Estoque saudável</p>
                ) : (
                  <>
                    {lowStockItems.map((item, i) => {
                      const pseudoRandomRate = (item.id.charCodeAt(0) % 3) + 1;
                      const depletionDays = Math.max(0, Math.ceil(item.stock / pseudoRandomRate));
                      const isZeroStock = item.stock === 0;
                      
                      return (
                        <div 
                          key={i} 
                          className={`min-w-[230px] w-[230px] h-[115px] bg-[#161B22] rounded-[12px] p-2.5 flex flex-col justify-between shadow-md snap-start border relative ${
                            isZeroStock ? 'border-rose-500/50 animate-pulse' : 'border-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-gray-400 uppercase tracking-wider truncate pr-2">{item.brand || 'Sem Categoria'}</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest shrink-0 ${
                              isZeroStock ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {item.stock} RESTANTE
                            </span>
                          </div>

                          <div className="flex gap-2.5 items-center my-auto">
                            <img 
                              src={item.image_url || 'https://picsum.photos/seed/product/100/100'} 
                              alt={item.name} 
                              className={`w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0 ${isZeroStock ? 'opacity-50 grayscale' : ''}`} 
                              referrerPolicy="no-referrer" 
                            />
                            
                            <div className="flex flex-col justify-center overflow-hidden">
                              <p className="text-xs font-bold text-white truncate leading-tight mb-0.5">{item.name}</p>
                              {isZeroStock ? (
                                <p className="text-[9px] font-bold text-rose-500">ESGOTADO!</p>
                              ) : (
                                <p className={`text-[9px] font-medium ${depletionDays < 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  Esgota em {depletionDays} dia{depletionDays !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Fidelidade & Mimos Side Card */}
          <div className="xl:col-span-1">
            <div className="bg-[#0F1420]/95 backdrop-blur-2xl rounded-[18px] sm:rounded-[22px] p-4 sm:p-5 flex flex-col justify-between h-full shadow-lg shadow-secondary/5 border border-secondary/20 min-h-[220px] transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary border border-secondary/25 flex items-center justify-center shadow-md shrink-0">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-headline text-base sm:text-lg italic text-white font-bold leading-tight truncate">Fidelidade & Mimos</h3>
                      <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-surface/40 font-semibold truncate">Aniversários & Cupons</p>
                    </div>
                  </div>
                  {(birthdayClients.length > 0 || upcomingBirthdays.length > 0) && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[9px] font-bold shrink-0">
                      {birthdayClients.length + upcomingBirthdays.length} {birthdayClients.length + upcomingBirthdays.length === 1 ? 'cliente' : 'clientes'}
                    </span>
                  )}
                </div>
                
                {birthdayClients.length === 0 && upcomingBirthdays.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <div className="w-11 h-11 rounded-2xl bg-secondary/10 border border-secondary/15 flex items-center justify-center text-secondary/40 mb-2">
                      <Gift className="w-5 h-5" />
                    </div>
                    <p className="text-white font-headline text-sm italic font-bold mb-0.5">Nenhum aniversariante hoje</p>
                    <p className="text-surface/50 text-[11px] leading-relaxed">Crie mimos e cupons para fidelizar suas clientes.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 text-center">
                    {birthdayClients.length === 0 && upcomingBirthdays.length > 0 ? (
                      <>
                        <p className="text-[#D4AF37] font-headline text-base font-bold mb-0.5">Prepare os mimos!</p>
                        <p className="text-surface/70 text-xs mb-3">{upcomingBirthdays.length} {upcomingBirthdays.length === 1 ? 'cliente faz' : 'clientes fazem'} aniversário esta semana</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[#D4AF37] font-headline text-base font-bold mb-0.5">{birthdayClients.length} {birthdayClients.length === 1 ? 'cliente faz' : 'clientes fazem'} aniversário hoje!</p>
                        {upcomingBirthdays.length > 0 && (
                          <p className="text-surface/70 text-xs mb-3">{upcomingBirthdays.length} {upcomingBirthdays.length === 1 ? 'aniversariante' : 'aniversariantes'} nos próximos 7 dias</p>
                        )}
                      </>
                    )}

                    {(() => {
                      const allBirthdays = [...birthdayClients, ...upcomingBirthdays];
                      return (
                        <div className="flex justify-center -space-x-2.5 mb-2">
                          {allBirthdays.slice(0, 4).map((client, i) => (
                            <div key={i} className="w-9 h-9 rounded-full border border-[#D4AF37] bg-[#151E3F] flex items-center justify-center shadow-md relative" style={{ zIndex: 10 - i }}>
                              {client.photo_url || client.image_url ? (
                                <img src={client.photo_url || client.image_url} alt={client.name} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[#D4AF37] font-headline text-xs font-bold">{client.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                          ))}
                          {allBirthdays.length > 4 && (
                            <div className="w-9 h-9 rounded-full border border-[#D4AF37] bg-[#151E3F] flex items-center justify-center shadow-md relative" style={{ zIndex: 0 }}>
                              <span className="text-[#D4AF37] font-bold text-xs">+{allBirthdays.length - 4}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <Link 
                to="/admin/mimos" 
                state={{ upcomingBirthdays: upcomingBirthdays, todayBirthdays: birthdayClients }}
                className="w-full h-10 sm:h-11 rounded-xl bg-secondary text-primary font-black uppercase tracking-wider text-[11px] sm:text-xs flex items-center justify-center gap-2 hover:bg-white transition-all shadow-md active:scale-98 mt-2 cursor-pointer"
              >
                <Gift className="w-4 h-4 shrink-0" />
                <span>{birthdayClients.length > 0 || upcomingBirthdays.length > 0 ? 'Presentear Clientes' : 'Gerar Cupons & Mimos'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      </main>
      
      <BottomNavigation />

      <PDFPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={() => { generatePDF(); setIsPreviewOpen(false); }}
        title="Pré-visualização do Relatório"
      >
        <div className="space-y-8">
          <div className="mb-10">
            <h2 className="text-lg font-bold uppercase tracking-wider mb-4 border-b border-slate-200 pb-1 text-slate-800">Resumo Geral</h2>
            <div className="grid grid-cols-2 gap-y-4 text-sm text-slate-700">
              <div className="font-bold">Total em Estoque:</div>
              <div className="text-right">{stats.totalStock} peças</div>
              <div className="font-bold">Valor do Estoque (Custo):</div>
              <div className="text-right">R$ {stats.stockValue.toLocaleString('pt-BR')}</div>
              <div className="font-bold">Total Recebido:</div>
              <div className="text-right">R$ {stats.totalReceived.toLocaleString('pt-BR')}</div>
              <div className="font-bold">A Receber:</div>
              <div className="text-right">R$ {stats.toReceive.toLocaleString('pt-BR')}</div>
              <div className="font-bold">Clientes Ativos:</div>
              <div className="text-right">{stats.activeClients}</div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider mb-4 border-b border-slate-200 pb-1 text-slate-800">Vendas Recentes</h2>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-3 border border-slate-200 text-slate-600 font-bold">ID</th>
                  <th className="p-3 border border-slate-200 text-slate-600 font-bold">Cliente</th>
                  <th className="p-3 border border-slate-200 text-slate-600 font-bold">Data</th>
                  <th className="p-3 border border-slate-200 text-slate-600 font-bold">Status</th>
                  <th className="p-3 border border-slate-200 text-slate-600 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border border-slate-100 font-mono text-slate-500">#{order.id.slice(0, 4)}</td>
                    <td className="p-3 border border-slate-100 text-slate-700 font-medium">{order.clients?.name || 'N/A'}</td>
                    <td className="p-3 border border-slate-100 text-slate-500">{new Date(order.sale_date).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 border border-slate-100">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                        order.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 border border-slate-100 text-right font-bold text-slate-900">R$ {order.total_amount.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PDFPreviewModal>
    </div>
  );
}

