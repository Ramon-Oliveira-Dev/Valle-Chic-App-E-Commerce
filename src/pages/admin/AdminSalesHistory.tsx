import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import NotificationModal from '../../components/NotificationModal';
import NotificationBell from '../../components/NotificationBell';
import MenuButton from '../../components/MenuButton';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PDFPreviewModal from '../../components/PDFPreviewModal';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Calendar, 
  ShoppingBag, 
  Trash2, 
  FileText, 
  ArrowLeft,
  Menu,
  History
} from 'lucide-react';

interface Sale {
  id: string;
  total_amount: number;
  amount_paid: number;
  payment_method: string;
  sale_date: string;
  status: string;
  clients: {
    name: string;
  };
}

export default function AdminSalesHistory() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });

  useEffect(() => {
    fetchSales();
  }, [selectedMonth, selectedStatus, searchTerm]);

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(191, 155, 48);
      doc.text('Relatório de Vendas Valle Chic', 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      const monthLabel = selectedMonth === 'all' ? 'Todo o período' : `Mês ${selectedMonth}`;
      const statusLabel = selectedStatus === 'all' ? 'Todos os status' : selectedStatus.toUpperCase();
      doc.text(`Período: ${monthLabel} | Status: ${statusLabel}`, 14, 30);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 36);
      
      const tableData = sales.map(sale => [
        `#${sale.id.slice(0, 4)}`,
        sale.clients?.name || 'Cliente Excluído',
        new Date(sale.sale_date).toLocaleDateString('pt-BR'),
        sale.payment_method.toUpperCase(),
        sale.status.toUpperCase(),
        `R$ ${sale.total_amount.toLocaleString('pt-BR')}`
      ]);
      
      autoTable(doc, {
        startY: 45,
        head: [['ID', 'Cliente', 'Data', 'Pagamento', 'Status', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [191, 155, 48] }
      });
      
      doc.save(`vendas-vallechic-${new Date().getTime()}.pdf`);
      toast.success('Relatório de vendas gerado!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF.');
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sales')
        .select(`
          *,
          clients (name)
        `);

      if (searchTerm) {
        // Search by client name or ID
        if (searchTerm.startsWith('#')) {
          const idSearch = searchTerm.slice(1);
          query = query.ilike('id', `%${idSearch}%`);
        } else {
          // Note: ilike on joined tables might need a different approach depending on Supabase version
          // For now, we'll filter by ID or handle name filtering if possible
          query = query.or(`id.ilike.%${searchTerm}%`);
        }
      }

      if (selectedMonth !== 'all') {
        const year = 2026;
        const startDate = new Date(year, parseInt(selectedMonth) - 1, 1).toISOString();
        const endDate = new Date(year, parseInt(selectedMonth), 0, 23, 59, 59).toISOString();
        query = query.gte('sale_date', startDate).lte('sale_date', endDate);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query.order('sale_date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      console.error('Error fetching sales:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Carregar',
        message: 'Não foi possível carregar o histórico de vendas.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleDeleteSale = (id: string) => {
    setDeleteId(id);
    setModalConfig({
      isOpen: true,
      title: 'Excluir Venda?',
      message: 'Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e o estoque será restaurado.',
      type: 'warning',
      onConfirm: confirmDelete
    });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      setLoading(true);
      
      // 1. Fetch sale items to restore stock
      const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', deleteId);
      
      if (itemsError) throw itemsError;

      // 2. Restore stock for each product
      if (items && items.length > 0) {
        for (const item of items) {
          // Get current stock
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          
          if (product) {
            await supabase
              .from('products')
              .update({ stock: (product.stock || 0) + item.quantity })
              .eq('id', item.product_id);
          }
        }
      }

      // 3. Delete the sale
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setSales(sales.filter(s => s.id !== deleteId));
      setModalConfig({
        isOpen: true,
        title: 'Venda Excluída',
        message: 'A venda foi removida do histórico e o estoque foi restaurado com sucesso.',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Excluir',
        message: error.message || 'Ocorreu um erro ao tentar excluir a venda.',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setIsConfirmModalOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 overflow-y-auto">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-10">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <div className="flex items-center gap-4">
              <Link to="/admin/sales/new" className="text-surface/40 hover:text-secondary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h2 className="font-headline text-2xl italic">Histórico <span className="text-secondary">VC</span></h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsPreviewOpen(true)}
              className="w-10 h-10 rounded-full bg-primary/40 backdrop-blur-sm border border-secondary/20 flex items-center justify-center text-surface/40 hover:text-secondary transition-colors" 
              title="Gerar Relatório PDF"
            >
              <FileText className="w-5 h-5" />
            </button>
            <NotificationBell />
          </div>
        </header>

        <div className="px-5 md:px-10 max-w-6xl mx-auto">
          <div className="mb-8 space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Todas as Vendas</h2>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Gerencie e visualize o histórico completo de transações</p>
            </div>

            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
                <input 
                  type="text" 
                  placeholder="Buscar por ID ou nome do cliente..." 
                  className="w-full bg-primary/20 backdrop-blur-md border border-secondary/10 rounded-2xl py-3.5 pl-12 pr-4 text-surface placeholder:text-surface/20 focus:outline-none focus:border-secondary/40 transition-all text-sm" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary/40 pointer-events-none" />
                  <select 
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-transparent text-surface border border-secondary/10 pl-10 pr-10 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-secondary/30 transition-all appearance-none cursor-pointer focus:outline-none focus:border-secondary/40"
                  >
                    <option value="all">Todos Status</option>
                    <option value="pago">Pagos</option>
                    <option value="pendente">Pendentes</option>
                  </select>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary/40 pointer-events-none" />
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-surface border border-secondary/10 pl-10 pr-10 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-secondary/30 transition-all appearance-none cursor-pointer focus:outline-none focus:border-secondary/40"
                  >
                    <option value="all">Todos os Meses</option>
                    <option value="1">Janeiro 2026</option>
                    <option value="2">Fevereiro 2026</option>
                    <option value="3">Março 2026</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {sales.length === 0 ? (
                  <div className="glass-card p-16 text-center rounded-3xl border border-secondary/10">
                    <History className="w-12 h-12 text-secondary/20 mx-auto mb-4" />
                    <p className="text-surface/40 font-bold uppercase tracking-widest text-[10px]">Nenhuma venda registrada</p>
                  </div>
                ) : (
                  sales.map((sale) => (
                    <motion.div
                      key={sale.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="glass-card p-5 rounded-3xl border border-secondary/5 hover:border-secondary/20 transition-all group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-secondary/5 flex items-center justify-center text-secondary border border-secondary/10 group-hover:bg-secondary/10 transition-colors">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-lg text-surface group-hover:text-secondary transition-colors">{sale.clients?.name || 'Cliente Excluído'}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                              <span className="font-mono text-[10px] text-secondary/60 font-bold tracking-tighter">#{sale.id.slice(0, 8).toUpperCase()}</span>
                              <span className="w-1 h-1 rounded-full bg-secondary/20"></span>
                              <span className="text-[10px] text-surface/30 font-bold uppercase tracking-widest">{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</span>
                              <span className="w-1 h-1 rounded-full bg-secondary/20"></span>
                              <span className="text-[10px] text-secondary font-bold uppercase tracking-widest">{sale.payment_method}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 border-secondary/5 pt-5 md:pt-0">
                          <div className="text-right">
                            <p className="text-[9px] text-surface/30 uppercase tracking-[0.2em] font-bold mb-1">Total Recebido</p>
                            <p className="text-xl text-surface font-bold">R$ {sale.total_amount.toLocaleString('pt-BR')}</p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${
                              sale.status === 'pago' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {sale.status}
                            </span>
                            
                            <button
                              onClick={() => handleDeleteSale(sale.id)}
                              className="w-11 h-11 rounded-2xl bg-rose-500/5 text-rose-400/40 hover:bg-rose-500/10 hover:text-rose-400 transition-all flex items-center justify-center border border-transparent hover:border-rose-500/20"
                              title="Excluir Venda"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />

      <PDFPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={() => { generatePDF(); setIsPreviewOpen(false); }}
        title="Pré-visualização do Histórico de Vendas"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total de Vendas</p>
              <p className="text-2xl font-bold text-slate-900">{sales.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Valor Total Bruto</p>
              <p className="text-2xl font-bold text-secondary">R$ {sales.reduce((acc, s) => acc + s.total_amount, 0).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-[10px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-3 border-b border-slate-100 text-slate-600 font-bold">CLIENTE</th>
                  <th className="p-3 border-b border-slate-100 text-slate-600 font-bold">DATA</th>
                  <th className="p-3 border-b border-slate-100 text-slate-600 font-bold">PAGAMENTO</th>
                  <th className="p-3 border-b border-slate-100 text-slate-600 font-bold text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.slice(0, 10).map(sale => (
                  <tr key={sale.id}>
                    <td className="p-3 text-slate-700 font-medium">{sale.clients?.name || 'Cliente Excluído'}</td>
                    <td className="p-3 text-slate-500">{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 text-slate-500 uppercase">{sale.payment_method}</td>
                    <td className="p-3 text-right font-bold text-slate-900">R$ {sale.total_amount.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sales.length > 10 && (
              <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                <p className="text-[8px] text-slate-400 italic">Exibindo as 10 vendas mais recentes de um total de {sales.length}.</p>
              </div>
            )}
          </div>
        </div>
      </PDFPreviewModal>

      <NotificationModal 
        isOpen={modalConfig.isOpen}
        onClose={() => {
          setModalConfig({ ...modalConfig, isOpen: false });
          setDeleteId(null);
        }}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
}
