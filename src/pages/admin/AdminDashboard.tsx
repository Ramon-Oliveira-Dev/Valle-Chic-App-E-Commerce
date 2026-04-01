import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, ChevronRight } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase';
import { api } from '../../services/api';
import { toast } from 'sonner';

import NotificationBell from '../../components/NotificationBell';
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
    birthdayCount: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [birthdayClients, setBirthdayClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
        birthdays,
        recentSales,
        toReceive,
        totalReceived
      ] = await Promise.all([
        api.products.getStats(),
        api.products.getLowStock(2, 3),
        api.clients.getAll(),
        api.clients.getBirthdays(currentMonth, 3),
        api.sales.getRecent(5),
        api.sales.getAccountsReceivable(),
        api.sales.getTotalReceived(),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('payment_status', 'Inadimplente')
      ]);

      setDbStatus('online');

      setStats({
        totalStock,
        stockValue,
        toReceive,
        totalReceived,
        activeClients: allClients?.length || 0,
        inadimplentesCount: (allClients as any[]).filter(c => c.payment_status === 'Inadimplente').length,
        birthdayCount: birthdays.length
      });
      setRecentOrders(recentSales || []);
      setLowStockItems(lowStock);
      setBirthdayClients(birthdays);

      // Check for today's birthdays and create notifications
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      
      const todayBirthdays = birthdays.filter(c => c.birth_day === day && c.birth_month === month);
      
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
      
      doc.save('relatorio-administrativo-vallechic.pdf');
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
      <main className="flex-1 min-w-0 p-0 pb-28 overflow-y-auto">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-6">
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
            <NotificationBell />
          </div>
        </header>

        <div className="px-4 md:px-8">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h2 className="font-headline text-2xl italic">Visão Geral</h2>
              <p className="text-surface/40 text-[9px] uppercase tracking-widest">Performance e métricas em tempo real</p>
            </div>
          </div>

          {/* Stats Grid - Condensed for better density */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 rounded-2xl border-l-4 border-l-secondary flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
              <div>
                <p className="text-surface/40 text-[8px] uppercase tracking-widest font-bold">Estoque Total</p>
                <p className="font-headline text-xl text-surface">{stats.totalStock.toLocaleString('pt-BR')}</p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-4 rounded-2xl border-l-4 border-l-blue-400 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center text-blue-400">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
              <div>
                <p className="text-surface/40 text-[8px] uppercase tracking-widest font-bold">Investimento</p>
                <p className="font-headline text-xl text-surface">R$ {stats.stockValue.toLocaleString('pt-BR')}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-400 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div>
                <p className="text-surface/40 text-[8px] uppercase tracking-widest font-bold">Total Recebido</p>
                <p className="font-headline text-xl text-surface">R$ {stats.totalReceived.toLocaleString('pt-BR')}</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-4 rounded-2xl border-l-4 border-l-purple-400 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center text-purple-400">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
              <div>
                <p className="text-surface/40 text-[8px] uppercase tracking-widest font-bold">A Receber</p>
                <p className="font-headline text-xl text-surface">R$ {stats.toReceive.toLocaleString('pt-BR')}</p>
              </div>
            </motion.div>
          </div>

          {/* Enhanced Clients Card - Full Width on Mobile, Integrated into Grid on Desktop */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 rounded-3xl border border-secondary/20 mb-8 overflow-hidden relative group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-8xl text-secondary">group</span>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div>
                <h3 className="font-headline text-2xl italic mb-1">Gestão de Clientes</h3>
                <p className="text-surface/40 text-[10px] uppercase tracking-widest">Base de dados e indicadores de fidelidade</p>
              </div>
              
              <div className="grid grid-cols-3 gap-8 w-full md:w-auto">
                <div className="text-center md:text-left">
                  <p className="text-surface/40 text-[8px] uppercase tracking-widest font-bold mb-1">Ativos</p>
                  <p className="font-headline text-3xl text-surface">{stats.activeClients}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-rose-400/60 text-[8px] uppercase tracking-widest font-bold mb-1">Inadimplentes</p>
                  <p className="font-headline text-3xl text-rose-400">{stats.inadimplentesCount}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-emerald-400/60 text-[8px] uppercase tracking-widest font-bold mb-1">Aniversariantes</p>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <p className="font-headline text-3xl text-emerald-400">{stats.birthdayCount}</p>
                    <span className="material-symbols-outlined text-emerald-400 text-sm animate-bounce">cake</span>
                  </div>
                </div>
              </div>

              <Link 
                to="/admin/clients"
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-secondary text-primary font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20"
              >
                Gerenciar Clientes
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-secondary/10 text-surface/60 text-[10px] uppercase tracking-widest">
                    <th className="pb-3 font-normal">Venda</th>
                    <th className="pb-3 font-normal">Cliente</th>
                    <th className="pb-3 font-normal">Data</th>
                    <th className="pb-3 font-normal">Status</th>
                    <th className="pb-3 font-normal text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-surface/60 italic">Nenhuma venda registrada</td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-secondary/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 font-mono text-surface/30 text-xs">#{order.id.slice(0, 4)}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-secondary/60" />
                            <span className="font-medium">{order.clients?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2 text-surface/60">
                            <Calendar size={14} />
                            <span>{new Date(order.sale_date).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold ${
                            order.status === 'pago' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 text-right font-bold text-secondary">R$ {order.total_amount.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {recentOrders.length === 0 ? (
                <p className="text-center text-surface/60 text-xs py-10 italic">Nenhuma venda registrada</p>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-mono text-surface/30 text-[10px]">#{order.id.slice(0, 4)}</p>
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-secondary/60" />
                          <p className="font-medium text-surface">{order.clients?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[8px] uppercase tracking-widest font-bold ${
                        order.status === 'pago' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-surface/60">
                        <Calendar size={12} />
                        <p className="text-[10px] uppercase tracking-widest">{new Date(order.sale_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <p className="font-bold text-secondary text-lg">R$ {order.total_amount.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-headline text-xl italic mb-6">Estoque Baixo</h3>
              <div className="space-y-4">
                {lowStockItems.length === 0 ? (
                  <p className="text-center text-surface/60 text-xs py-10 italic">Estoque saudável</p>
                ) : (
                  lowStockItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all group shadow-sm">
                      <img src={item.image_url || 'https://picsum.photos/seed/product/100/100'} alt={item.name} className="w-12 h-12 rounded-xl object-cover shadow-md" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <p className="text-sm font-medium group-hover:text-secondary transition-colors">{item.name}</p>
                        <p className="text-[9px] text-surface/40 uppercase tracking-[0.15em] font-bold">{item.brand}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${item.stock < 2 ? 'text-rose-500' : 'text-secondary'}`}>
                          {item.stock} un
                        </p>
                        <p className="text-[9px] text-surface/40 uppercase tracking-tighter">Restante</p>
                      </div>
                    </div>
                  ))
                )}
                <Link 
                  to="/admin/inventory" 
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-secondary/30 text-secondary text-[10px] uppercase tracking-widest font-bold hover:bg-secondary/10 transition-all mt-4 group"
                >
                  Ver Estoque Completo
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-headline text-xl italic mb-6">Aniversariantes do Mês</h3>
              <div className="space-y-4">
                {birthdayClients.length === 0 ? (
                  <p className="text-center text-surface/60 text-xs py-10 italic">Nenhum este mês</p>
                ) : (
                  birthdayClients.map((client, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined">cake</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{client.name}</p>
                        <p className="text-[10px] text-surface/60 uppercase tracking-widest">Dia {client.birth_day}</p>
                      </div>
                      <a 
                        href={`https://wa.me/55${client.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Parabéns e feliz Aniversário! 🎂✨\n\nA equipe Valle Chic passa por aqui para desejar um feliz aniversário! Que seu dia seja tão incrível quanto você.\n\nComo forma de agradecer por sua parceria, hoje você tem um mimo especial te esperando em nossa loja. Fale com a gente e descubra o que preparamos para você! 🎉💖`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-secondary hover:scale-110 transition-transform"
                      >
                        <span className="material-symbols-outlined text-sm">send</span>
                      </a>
                    </div>
                  ))
                )}
                <Link to="/admin/clients" className="block text-center py-3 rounded-xl border border-secondary/20 text-secondary text-[10px] uppercase tracking-widest font-bold hover:bg-secondary/10 transition-colors mt-4">
                  Ver Todos Clientes
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
