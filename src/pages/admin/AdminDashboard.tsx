import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, ChevronRight, UserMinus, CheckCircle, UserCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase';
import { api } from '../../services/api';
import { toast } from 'sonner';

import NotificationSino from '../../components/NotificationSino';
import PDFPreviewModal from '../../components/PDFPreviewModal';
import MenuButton from '../../components/MenuButton';

export default function AdminDashboard() {
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
  const stockCarouselRef = useRef<HTMLDivElement>(null);

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
        inadimplentesRes
      ] = await Promise.all([
        api.products.getStats(),
        api.products.getLowStock(2, 3),
        api.clients.getAll(),
        api.clients.getTodayBirthdays(),
        api.clients.getUpcomingBirthdays(7),
        api.sales.getRecent(5),
        api.sales.getAccountsReceivable(),
        api.sales.getTotalReceived(),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('payment_status', 'Inadimplente')
      ]);

      const incompleteCount = (allClients as any[]).filter(c => c.status === 'Pendente').length;

      setDbStatus('online');

      setStats({
        totalStock,
        stockValue,
        toReceive,
        totalReceived,
        activeClients: (allClients as any[]).filter(c => c.status === 'Ativo').length,
        inadimplentesCount: (allClients as any[]).filter(c => c.payment_status === 'Inadimplente').length,
        incompleteProfileCount: incompleteCount
      });
      setRecentOrders(recentSales || []);
      setLowStockItems(lowStock);
      setBirthdayClients(todayBirthdays);
      setUpcomingBirthdays(upcomingBdays);

      // Check for today's birthdays and create notifications
      for (const client of todayBirthdays) {
        // Check if notification already exists for today
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'birthday')
          .eq('title', `Aniversário: ${client.name}`)
          .gte('created_at', new Date().toISOString().split('T')[0]);

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert([{
            type: 'birthday',
            title: `Aniversário: ${client.name}`,
            message: `Hoje é o aniversário de ${client.name}! Envie um parabéns especial.`,
            priority: 'medium',
            is_read: false,
            metadata: { clientId: client.id, phone: client.phone }
          }]);
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
      <main className="flex-1 min-w-0 p-0 pb-28 ">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-6">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <div>
              <h2 className="font-headline text-xl italic">Dashboard <span className="text-secondary">VC</span></h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1 h-1 rounded-full ${
                  dbStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                  dbStatus === 'offline' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 
                  'bg-surface/20 animate-pulse'
                }`}></div>
                <span className="text-[7px] uppercase tracking-widest text-surface/60 font-bold">
                  {dbStatus === 'online' ? 'Online' : dbStatus === 'offline' ? 'Offline' : '...'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="w-10 h-10 rounded-full bg-primary/40 backdrop-blur-sm border border-secondary/20 flex items-center justify-center text-surface/60 hover:text-secondary transition-all" 
              title="Gerar Relatório PDF"
            >
              <span className="material-symbols-outlined">picture_as_pdf</span>
            </button>
            <NotificationSino />
          </div>
        </header>

        <div className="px-4 md:px-6 pt-24">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="font-headline text-xl italic text-secondary">Dashboard VC</h2>
              <p className="text-surface/60 text-[11px] uppercase tracking-widest font-medium mt-1">Visão Geral</p>
            </div>
          </div>

          {/* Stats Grid - Condensed for better density */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0B111D] p-5 rounded-[20px] border-t border-t-secondary/50 shadow-lg flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[16px] font-light">inventory_2</span>
                </div>
                <p className="text-surface/80 text-[12px] font-sans font-medium">Estoque Total</p>
              </div>
              <p className="font-sans font-semibold text-2xl text-surface">{stats.totalStock.toLocaleString('pt-BR')}</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0B111D] p-5 rounded-[20px] border-t border-t-blue-400/50 shadow-lg flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined text-[16px] font-light">account_balance_wallet</span>
                </div>
                <p className="text-surface/80 text-[12px] font-sans font-medium">Investimento</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-sans font-light text-surface/60">R$</span>
                <p className="font-sans font-semibold text-2xl text-surface">{stats.stockValue.toLocaleString('pt-BR')}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0B111D] p-5 rounded-[20px] border-t border-t-emerald-400/50 shadow-lg flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-[16px] font-light">payments</span>
                </div>
                <p className="text-surface/80 text-[12px] font-sans font-medium">Total Recebido</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-sans font-light text-surface/60">R$</span>
                <p className="font-sans font-semibold text-2xl text-surface">{stats.totalReceived.toLocaleString('pt-BR')}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0B111D] p-5 rounded-[20px] border-t border-t-purple-400/50 shadow-lg flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-400/10 flex items-center justify-center text-purple-400">
                  <span className="material-symbols-outlined text-[16px] font-light">pending_actions</span>
                </div>
                <p className="text-surface/80 text-[12px] font-sans font-medium">A Receber</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-sans font-light text-surface/60">R$</span>
                <p className="font-sans font-semibold text-2xl text-surface">{stats.toReceive.toLocaleString('pt-BR')}</p>
              </div>
            </motion.div>
          </div>

          {/* Enhanced Clients Card - Full Width on Mobile, Integrated into Grid on Desktop */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0B111D] p-6 rounded-[20px] border-t border-t-secondary/30 shadow-lg mb-8 overflow-hidden relative group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-8xl text-secondary">group</span>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div>
                <h3 className="font-headline text-2xl italic mb-1">Gestão de Clientes</h3>
                <p className="text-surface/40 text-[10px] uppercase tracking-widest">Base de dados e indicadores de fidelidade</p>
              </div>
              
              <div className="flex flex-row justify-around items-center w-full md:w-auto gap-4 md:gap-8">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-1">
                    <UserCheck className="w-3 h-3 text-[#4CAF50] opacity-50" />
                    <p className="text-surface/60 text-[10px] uppercase tracking-widest font-sans">Ativos</p>
                  </div>
                  <p className="font-sans font-semibold text-3xl text-[#4CAF50]">{stats.activeClients}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400 opacity-50" />
                    <p className="text-surface/60 text-[10px] uppercase tracking-widest font-sans">Inadimplentes</p>
                  </div>
                  <p className="font-sans font-semibold text-3xl text-rose-400">{stats.inadimplentesCount}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-1">
                    <UserMinus className="w-3 h-3 text-orange-400 opacity-50" />
                    <p className="text-surface/60 text-[10px] uppercase tracking-widest font-sans">Sem Cadastro</p>
                  </div>
                  <p className="font-sans font-semibold text-3xl text-orange-400">{stats.incompleteProfileCount}</p>
                </div>
              </div>

              <Link 
                to="/admin/clients"
                className="w-full md:w-auto px-6 py-3 rounded-2xl bg-[#D4AF37] text-[#0A1220] font-bold uppercase tracking-widest text-xs flex items-center justify-between gap-4 hover:bg-[#F3E5AB] transition-all shadow-lg shadow-[#D4AF37]/20"
              >
                <span>Gerenciar Clientes</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

        {/* Recent Orders, Low Stock & Birthdays */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl italic">Vendas Recentes</h3>
              <Link to="/admin/sales" className="text-secondary text-xs uppercase tracking-widest hover:underline">Ver Todas</Link>
            </div>
            
            {/* Carousel View */}
            <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory hide-scrollbar pb-4" ref={carouselRef}>
              {recentOrders.length === 0 ? (
                <p className="text-center text-surface/60 text-xs py-10 italic w-full">Nenhuma venda registrada</p>
              ) : (
                <>
                  {recentOrders.map((order) => (
                    <div key={order.id} className="min-w-[280px] w-[280px] h-[160px] bg-[#161B22] rounded-2xl p-4 flex flex-col justify-between shadow-lg snap-start border border-white/5">
                      {/* Header */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white truncate pr-2">{order.clients?.name || 'Consumidor Final'}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] uppercase tracking-widest font-bold whitespace-nowrap ${
                          order.status === 'pago' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {order.status === 'pago' ? 'PAGO' : 'AGUARDANDO...'}
                        </span>
                      </div>
                      
                      {/* Center - Product */}
                      <div className="flex items-center gap-3 my-auto">
                        {order.sale_items?.[0]?.products?.image_url ? (
                          <img src={order.sale_items[0].products.image_url} alt="Produto" className="w-12 h-12 rounded-full object-cover border border-[#D4AF37]/20" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
                            <span className="text-[10px] font-bold text-[#D4AF37]">VC</span>
                          </div>
                        )}
                        <div className="flex-1 flex flex-col justify-center overflow-hidden">
                          {order.sale_items?.[0] ? (
                            <span className="text-xs text-gray-300 truncate">
                              <span className="font-bold text-[#D4AF37]">{order.sale_items[0].quantity}x</span> {order.sale_items[0].products?.name || 'Produto Excluído'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 italic">Sem itens</span>
                          )}
                          {order.sale_items?.length > 1 && (
                            <span className="text-[10px] text-gray-500 mt-0.5">+ {order.sale_items.length - 1} outro(s) item(ns)</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500">{new Date(order.created_at || order.sale_date).toLocaleDateString('pt-BR')}</span>
                          <span className="text-[10px] text-gray-500">{new Date(order.created_at || order.sale_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className="font-bold text-[#FFD700] text-sm">
                          R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* "Ver Todas" Card at the end */}
                  <Link to="/admin/sales" className="min-w-[280px] w-[280px] h-[160px] bg-[#161B22]/50 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg snap-start border border-dashed border-[#D4AF37]/30 hover:bg-[#161B22] transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-3 group-hover:bg-[#D4AF37]/20 transition-colors">
                      <ChevronRight className="text-[#D4AF37]" />
                    </div>
                    <span className="text-[#D4AF37] font-bold text-sm uppercase tracking-widest">Ver Todas</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-headline text-xl italic mb-6">Estoque Baixo</h3>
              
              <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory hide-scrollbar pb-4" ref={stockCarouselRef}>
                {lowStockItems.length === 0 ? (
                  <p className="text-center text-surface/60 text-xs py-10 italic w-full">Estoque saudável</p>
                ) : (
                  <>
                    {lowStockItems.map((item, i) => {
                      // Simulação de ritmo de saída baseada no ID do produto para ser determinística
                      // Em um cenário real, isso seria calculado com base na média de vendas diárias
                      const pseudoRandomRate = (item.id.charCodeAt(0) % 3) + 1; // 1 a 3 itens por dia
                      const depletionDays = Math.max(0, Math.ceil(item.stock / pseudoRandomRate));
                      const isZeroStock = item.stock === 0;
                      
                      return (
                        <div 
                          key={i} 
                          className={`min-w-[280px] w-[280px] h-[160px] bg-[#161B22] rounded-2xl p-4 flex flex-col justify-between shadow-lg snap-start border relative ${
                            isZeroStock ? 'border-rose-500/50 animate-pulse' : 'border-white/5'
                          }`}
                        >
                          {/* Badge de Quantidade */}
                          <div className="absolute top-4 right-4">
                            <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest ${
                              isZeroStock ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {item.stock} un RESTANTE
                            </span>
                          </div>

                          <div className="flex gap-4 h-full pt-6 items-center">
                            {/* Imagem do Produto */}
                            <img 
                              src={item.image_url || 'https://picsum.photos/seed/product/100/100'} 
                              alt={item.name} 
                              className={`w-20 h-20 rounded-xl object-cover shadow-md border border-white/10 ${isZeroStock ? 'opacity-50 grayscale' : ''}`} 
                              referrerPolicy="no-referrer" 
                            />
                            
                            {/* Informações */}
                            <div className="flex flex-col justify-center flex-1">
                              <p className="text-sm font-bold text-white line-clamp-2 leading-tight mb-1">{item.name}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">{item.brand || 'Sem Categoria'}</p>
                              
                              {isZeroStock ? (
                                <p className="text-xs font-bold text-rose-500">ESGOTADO! Compre agora</p>
                              ) : (
                                <p className={`text-xs font-medium ${depletionDays < 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
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

              <Link 
                to="/admin/inventory" 
                className="flex items-center justify-center gap-2 w-max mx-auto px-6 py-2 rounded-full border border-[#D4AF37]/50 text-[#D4AF37] text-[10px] uppercase tracking-widest font-bold hover:bg-[#D4AF37]/10 transition-all mt-2 group"
              >
                Ver Estoque Completo
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className={`bg-[#0A1220] rounded-[24px] p-6 relative overflow-hidden transition-all duration-500 shadow-[0_0_15px_rgba(212,175,55,0.15)] border border-[#D4AF37]/20`}>
              <h3 className="font-headline text-xl italic text-white mb-6 text-left">Fidelidade & Mimos</h3>
              <div className="space-y-4 relative z-10">
                {birthdayClients.length === 0 && upcomingBirthdays.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <span className="material-symbols-outlined text-6xl text-white/5 absolute opacity-20">featured_seasonal_and_gifts</span>
                    <p className="text-gray-400 text-sm italic relative z-10">Nenhum aniversariante hoje.<br/>Que tal criar uma promoção relâmpago?</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    {birthdayClients.length === 0 && upcomingBirthdays.length > 0 ? (
                      <>
                        <p className="text-[#D4AF37] font-headline text-xl mb-1">Prepare os mimos!</p>
                        <p className="text-gray-300 text-sm mb-6">{upcomingBirthdays.length} {upcomingBirthdays.length === 1 ? 'cliente faz' : 'clientes fazem'} aniversário esta semana</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[#D4AF37] font-headline text-xl mb-1">{birthdayClients.length} {birthdayClients.length === 1 ? 'cliente faz' : 'clientes fazem'} aniversário hoje!</p>
                        {upcomingBirthdays.length > 0 && (
                          <p className="text-gray-300 text-sm mb-6">{upcomingBirthdays.length} {upcomingBirthdays.length === 1 ? 'aniversariante' : 'aniversariantes'} nos próximos 7 dias</p>
                        )}
                      </>
                    )}

                    {(() => {
                      const allBirthdays = [...birthdayClients, ...upcomingBirthdays];
                      if (allBirthdays.length === 1) {
                        const client = allBirthdays[0];
                        return (
                          <div className="flex flex-col items-center">
                            <div className="w-[50px] h-[50px] rounded-full border-[1.5px] border-[#D4AF37] bg-[#151E3F] flex items-center justify-center shadow-lg relative z-10 mb-2">
                              {client.photo_url || client.image_url ? (
                                <img src={client.photo_url || client.image_url} alt={client.name} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[#D4AF37] font-headline text-xl">{client.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest">{client.name}</p>
                          </div>
                        );
                      }

                      return (
                        <div className="flex justify-center -space-x-4 mb-2 hover:scale-105 transition-transform cursor-default">
                          {allBirthdays.slice(0, 3).map((client, i) => (
                            <div key={i} className="w-[50px] h-[50px] rounded-full border-[1.5px] border-[#D4AF37] bg-[#151E3F] flex items-center justify-center shadow-lg relative z-10" style={{ zIndex: 10 - i }}>
                              {client.photo_url || client.image_url ? (
                                <img src={client.photo_url || client.image_url} alt={client.name} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[#D4AF37] font-headline text-xl">{client.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                          ))}
                          {allBirthdays.length > 3 && (
                            <div className="w-[50px] h-[50px] rounded-full border-[1.5px] border-[#D4AF37] bg-[#151E3F] flex items-center justify-center shadow-lg relative z-10" style={{ zIndex: 0 }}>
                              <span className="text-[#D4AF37] font-bold text-sm">+{allBirthdays.length - 3}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                <Link 
                  to="/admin/mimos" 
                  state={{ upcomingBirthdays: upcomingBirthdays, todayBirthdays: birthdayClients }}
                  className="block text-center py-3.5 rounded-xl border border-[#D4AF37] text-[#D4AF37] text-xs uppercase tracking-widest font-sans font-bold hover:bg-[#D4AF37]/10 transition-colors mt-6 relative z-10"
                >
                  {birthdayClients.length > 0 || upcomingBirthdays.length > 0 ? 'PRESENTEAR CLIENTES' : 'GERAR CUPONS'}
                </Link>
              </div>
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

