import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import NotificationModal from '../../components/NotificationModal';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PDFPreviewModal from '../../components/PDFPreviewModal';
import { toast } from 'sonner';
import { 
  Search, Filter, Calendar, ShoppingBag, Trash2, FileText, ArrowLeft,
  Menu, History, Check, UserMinus, CheckCircle, MessageCircle, QrCode, 
  Link as LinkIcon, ChevronRight, ChevronLeft, Plus
} from 'lucide-react';

interface Sale {
  id: string;
  client_id: string;
  total_amount: number;
  amount_paid: number;
  payment_method: string;
  installments?: number | null;
  sale_date: string;
  created_at: string;
  status: string;
  clients: {
    name: string;
    status: string;
    phone?: string;
  };
  sale_items?: any[];
  sale_installments?: {
    amount: number;
    due_date: string;
    status: string;
  }[];
}

type InstallmentPlanItem = {
  amount: number;
  due_date: string;
};

export default function AdminSalesHistory() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Modais de Cobrança
  const [billingModalSale, setBillingModalSale] = useState<Sale | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [billingView, setBillingView] = useState<'main' | 'pix' | 'infinitepay'>('main');
  const [cobrancaSelecionada, setCobrancaSelecionada] = useState(false);
  const [cobrancaData, setCobrancaData] = useState('');
  const [pixKeys, setPixKeys] = useState([
    { id: 1, type: 'CPF', key: '123.456.789-00' },
    { id: 2, type: 'E-mail', key: 'pagamentos@vallechic.com' },
    { id: 3, type: 'Aleatória', key: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' }
  ]);
  const [newPixKey, setNewPixKey] = useState('');
  const [newPixType, setNewPixType] = useState('CPF');
  const [isAddingPix, setIsAddingPix] = useState(false);

  // Aprovação de venda parcelada
  const [approvalSale, setApprovalSale] = useState<Sale | null>(null);
  const [approvalInstallmentsCount, setApprovalInstallmentsCount] = useState(1);
  const [approvalDueDates, setApprovalDueDates] = useState<string[]>([]);
  const [approvalSaving, setApprovalSaving] = useState(false);
  
  // Modal de Aviso/Confirmação
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  const fetchSales = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sales')
        .select(`
          *,
          clients (name, status, phone),
          sale_items (
            quantity,
            unit_price,
            products (name, image_url)
          ),
          sale_installments:installments (
            amount,
            due_date,
            status
          )
        `);

      if (searchTerm) {
        if (searchTerm.startsWith('#')) {
          const idSearch = searchTerm.slice(1);
          query = query.ilike('id', `%${idSearch}%`);
        } else {
          query = query.or(`id.ilike.%${searchTerm}%`);
        }
      }

      if (selectedMonth !== 'all') {
        const year = new Date().getFullYear();
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
      toast.error('Erro ao carregar o histórico de vendas.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePaymentLink = async (sale: Sale) => {
    try {
      setIsGeneratingLink(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      const paymentUrl = `https://infinitepay.io/l/simulacao_${sale.id}`;

      const { error } = await supabase
        .from('sales')
        .update({ status: 'link_enviado' })
        .eq('id', sale.id);

      if (error) throw error;

      setSales(sales.map(s => s.id === sale.id ? { ...s, status: 'link_enviado' } : s));
      await navigator.clipboard.writeText(paymentUrl);
      
      setCobrancaData(paymentUrl);
      setCobrancaSelecionada(true);
      setBillingView('main');
      
      toast.success('Link gerado e copiado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar link de pagamento.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

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
      
      doc.save(`vendas-Valle-Chic-${new Date().getTime()}.pdf`);
      toast.success('Relatório de vendas gerado!');
    } catch (error) {
      toast.error('Erro ao gerar PDF.');
    }
  };

  const handleDeleteSale = (id: string) => {
    setDeleteId(id);
    setModalConfig({
      isOpen: true,
      title: 'Excluir Venda?',
      message: 'Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e o estoque será restaurado.',
      type: 'warning',
      onConfirm: () => confirmDelete(id)
    });
  };

  const confirmDelete = async (idToDelete: string) => {
    if (!idToDelete) return;
    try {
      setLoading(true);
      const saleToDelete = sales.find(s => s.id === idToDelete);
      const wasConfirmed = saleToDelete?.status === 'pago' || saleToDelete?.status === 'pendente';
      
      if (wasConfirmed) {
        const { data: items } = await supabase.from('sale_items').select('product_id, quantity').eq('sale_id', idToDelete);
        if (items && items.length > 0) {
          for (const item of items) {
            const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
            if (product) {
              await supabase.from('products').update({ stock: (product.stock || 0) + item.quantity }).eq('id', item.product_id);
            }
          }
        }
      }

      await supabase.from('sales').delete().eq('id', idToDelete);
      setSales(sales.filter(s => s.id !== idToDelete));
      
      setModalConfig({
        isOpen: true, title: 'Venda Excluída', message: 'Venda removida com sucesso.', type: 'success'
      });
    } catch (error) {
      toast.error('Erro ao excluir venda.');
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  const getDefaultDueDates = (count: number, baseDate = new Date()) => {
    const today = new Date(baseDate);
    return Array.from({ length: count }, (_, index) => {
      const dueDate = new Date(today);
      dueDate.setMonth(today.getMonth() + index + 1);
      return dueDate.toISOString().split('T')[0];
    });
  };

  const isCrediarioSale = (sale: Sale) => sale.payment_method === 'crediario' || sale.payment_method === 'fiado';
  const isCreditInstallmentSale = (sale: Sale) => sale.payment_method === 'cartao' && Number(sale.installments) > 1;
  const needsInstallmentApproval = (sale: Sale) => isCrediarioSale(sale) || isCreditInstallmentSale(sale);
  const shouldShowInstallments = (sale: Sale) =>
    Boolean(sale.sale_installments?.length) || isCrediarioSale(sale) || Number(sale.installments) > 1;

  const getInstallmentStatusClass = (status: string) => {
    if (status === 'pago') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (status === 'cancelada') return 'bg-surface/10 text-surface/40 border-surface/20';
    if (status === 'vencido') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  const formatInstallmentStatus = (status: string) => {
    if (status === 'pago') return 'Pago';
    if (status === 'cancelada') return 'Cancelada';
    if (status === 'vencido') return 'Vencido';
    return 'Pendente';
  };

  const openInstallmentApproval = (sale: Sale) => {
    const count = Math.max(1, Number(sale.installments) || 1);
    setApprovalSale(sale);
    setApprovalInstallmentsCount(count);
    setApprovalDueDates(getDefaultDueDates(count, new Date(`${sale.sale_date}T00:00:00`)));
  };

  const closeInstallmentApproval = () => {
    setApprovalSale(null);
    setApprovalInstallmentsCount(1);
    setApprovalDueDates([]);
    setApprovalSaving(false);
  };

  const processConfirmedSale = async (sale: Sale, installmentPlan?: InstallmentPlanItem[]) => {
    try {
      setLoading(true);
      const { data: items } = await supabase.from('sale_items').select('product_id, quantity, products(name, stock, published)').eq('sale_id', sale.id);
      
      if (items && items.length > 0) {
        for (const item of items) {
          const product = item.products as any;
          const currentStock = product?.stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(`Saldo insuficiente para: ${product?.name}.`);
          }
        }
        for (const item of items) {
          const product = item.products as any;
          const newStock = (product?.stock || 0) - item.quantity;
          await supabase.from('products').update({ stock: newStock, published: newStock > 0 ? product?.published : false }).eq('id', item.product_id);
        }
      }

      const hasInstallmentPlan = Boolean(installmentPlan?.length);
      const newStatus = hasInstallmentPlan || isCrediarioSale(sale) ? 'pendente' : 'pago';
      const amountPaid = newStatus === 'pago' ? sale.total_amount : 0;
      
      await supabase
        .from('sales')
        .update({
          status: newStatus,
          amount_paid: amountPaid,
          installments: hasInstallmentPlan ? installmentPlan!.length : (sale.installments || 1)
        })
        .eq('id', sale.id);

      const { data: client } = await supabase.from('clients').select('purchases').eq('id', sale.client_id).single();
      if (client) {
        await supabase.from('clients').update({ purchases: (client.purchases || 0) + 1 }).eq('id', sale.client_id);
      }

      if (hasInstallmentPlan) {
        const installmentsData = installmentPlan!.map(item => ({
          sale_id: sale.id,
          client_id: sale.client_id,
          amount: item.amount,
          due_date: item.due_date,
          status: 'pendente'
        }));

        await supabase.from('installments').insert(installmentsData);
      }

      if (isCrediarioSale(sale)) {
        await supabase.from('clients').update({ payment_status: 'Inadimplente' }).eq('id', sale.client_id);
      }

      setSales(sales.map(s => s.id === sale.id ? {
        ...s,
        status: newStatus,
        amount_paid: amountPaid,
        installments: hasInstallmentPlan ? installmentPlan!.length : s.installments,
        sale_installments: hasInstallmentPlan
          ? installmentPlan!.map(item => ({ amount: item.amount, due_date: item.due_date, status: 'pendente' }))
          : s.sale_installments
      } : s));
      setModalConfig({ isOpen: true, title: 'Sucesso', message: 'Venda confirmada.', type: 'success' });
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'Erro', message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmInstallmentApproval = async () => {
    if (!approvalSale) return;
    if (approvalDueDates.length !== approvalInstallmentsCount || approvalDueDates.some(date => !date)) {
      toast.error('Confira as datas de vencimento das parcelas.');
      return;
    }

    const installmentAmount = approvalSale.total_amount / approvalInstallmentsCount;
    const installmentPlan = approvalDueDates.map(dueDate => ({
      amount: installmentAmount,
      due_date: dueDate
    }));

    setApprovalSaving(true);
    await processConfirmedSale(approvalSale, installmentPlan);
    closeInstallmentApproval();
  };

  const handleConfirmSale = async (sale: Sale) => {
    if (needsInstallmentApproval(sale)) {
      openInstallmentApproval(sale);
      return;
    }

    // SE O CLIENTE FOR PENDENTE: Envia os dados na "mochila" diretamente para a tela de Cadastro Novo!
    if (sale.clients?.status === 'Pendente') {
      toast.info('Redirecionando para completar o cadastro...');
      if (sale.client_id) {
        navigate(`/admin/clients/edit/${sale.client_id}`);
      } else {
        navigate('/admin/clients/new', {
          state: {
            nomePreenchido: sale.clients?.name,
            telefonePreenchido: sale.clients?.phone
          }
        });
      }
      return;
    }

    setModalConfig({
      isOpen: true,
      title: 'Confirmar Venda?',
      message: 'Confirma o processamento desta venda? O estoque será descontado agora.',
      type: 'warning',
      onConfirm: () => processConfirmedSale(sale)
    });
  };

  const handleCancelSale = async (sale: Sale) => {
    setModalConfig({
      isOpen: true,
      title: 'Cancelar Venda?',
      message: 'Tem certeza que deseja cancelar esta venda?',
      type: 'warning',
      onConfirm: async () => {
        try {
          setLoading(true);
          const wasConfirmed = sale.status === 'pago' || sale.status === 'pendente';
          
          if (wasConfirmed) {
            const { data: items } = await supabase.from('sale_items').select('product_id, quantity').eq('sale_id', sale.id);
            if (items && items.length > 0) {
              for (const item of items) {
                const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
                if (product) {
                  await supabase.from('products').update({ stock: (product.stock || 0) + item.quantity }).eq('id', item.product_id);
                }
              }
            }

            const { data: client } = await supabase.from('clients').select('purchases').eq('id', sale.client_id).single();
            if (client && client.purchases > 0) {
              await supabase.from('clients').update({ purchases: client.purchases - 1 }).eq('id', sale.client_id);
            }

            if (isCrediarioSale(sale) || isCreditInstallmentSale(sale)) {
              await supabase.from('installments').update({ status: 'cancelada' }).eq('sale_id', sale.id);
            }
          }

          await supabase.from('sales').update({ status: 'cancelada' }).eq('id', sale.id);
          setSales(sales.map(s => s.id === sale.id ? { ...s, status: 'cancelada' } : s));
          
          setModalConfig({ isOpen: true, title: 'Cancelada', message: 'Venda cancelada com sucesso.', type: 'success' });
        } catch (error) {
          toast.error('Erro ao cancelar venda.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 ">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-10">
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
            <button onClick={() => setIsPreviewOpen(true)} className="w-10 h-10 rounded-full bg-primary/40 backdrop-blur-sm border border-secondary/20 flex items-center justify-center text-surface/40 hover:text-secondary transition-colors" title="Gerar Relatório PDF">
              <FileText className="w-5 h-5" />
            </button>
            <NotificationSino />
          </div>
        </header>

        <div className="px-5 md:px-10 max-w-6xl mx-auto pt-24">
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

              <div className="flex flex-wrap gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <div className="relative flex-1 min-w-[140px]">
                  <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary/40 pointer-events-none" />
                  <select 
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-transparent text-surface border border-secondary/10 pl-10 pr-10 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-secondary/30 transition-all appearance-none cursor-pointer focus:outline-none focus:border-secondary/40"
                  >
                    <option value="all">Todos Status</option>
                    <option value="pago">Pagos</option>
                    <option value="pendente">Pendentes</option>
                    <option value="aguardando_confirmacao">Aguardando</option>
                    <option value="solicitado">Solicitado</option>
                    <option value="link_enviado">Link Enviado</option>
                    <option value="cancelada">Canceladas</option>
                  </select>
                </div>
                <div className="relative flex-1 min-w-[140px]">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary/40 pointer-events-none" />
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-transparent text-surface border border-secondary/10 pl-10 pr-10 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-secondary/30 transition-all appearance-none cursor-pointer focus:outline-none focus:border-secondary/40"
                  >
                    <option value="all">Todos os Meses</option>
                    <option value="1">Janeiro</option>
                    <option value="2">Fevereiro</option>
                    <option value="3">Março</option>
                    <option value="4">Abril</option>
                    <option value="5">Maio</option>
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
                  <div className="glass-card p-16 text-center rounded-3xl border border-secondary/10 flex flex-col items-center justify-center">
                    {searchTerm ? (
                      <>
                        <UserMinus className="w-12 h-12 text-secondary/20 mx-auto mb-4" />
                        <p className="text-surface/40 font-bold uppercase tracking-widest text-[10px] mb-6">Cliente não encontrado</p>
                        <Link to="/admin/clients/new" className="bg-secondary text-primary px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-secondary/90 transition-colors inline-flex items-center gap-2">
                          + Cadastrar Novo Cliente
                        </Link>
                      </>
                    ) : (
                      <>
                        <History className="w-12 h-12 text-secondary/20 mx-auto mb-4" />
                        <p className="text-surface/40 font-bold uppercase tracking-widest text-[10px]">Nenhuma venda registrada</p>
                      </>
                    )}
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
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex flex-col gap-4 w-full">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-lg text-surface group-hover:text-secondary transition-colors">
                              {sale.clients?.name || 'Cliente Excluído'}
                            </p>
                            {sale.client_id && sale.clients?.status !== 'Pendente' ? (
                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400" title="Cliente Cadastrado">
                                <CheckCircle className="w-3 h-3" />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/10 text-rose-400" title="Cadastro Incompleto ou Não Vinculado">
                                <UserMinus className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="font-mono text-[9px] text-secondary/60 font-bold tracking-tighter">#{sale.id.slice(0, 8).toUpperCase()}</span>
                            <span className="w-1 h-1 rounded-full bg-secondary/20"></span>
                            <span className="text-[9px] text-surface/30 font-bold uppercase tracking-widest">
                              {new Date(sale.created_at || sale.sale_date).toLocaleDateString('pt-BR')} • {new Date(sale.created_at || sale.sale_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-secondary/20"></span>
                            <span className="text-[9px] text-secondary font-bold uppercase tracking-widest">{sale.payment_method}</span>
                          </div>

                          {sale.sale_items && sale.sale_items.length > 0 && (
                            <div className="mt-2 space-y-2 border-t border-secondary/10 pt-4">
                              {sale.sale_items.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3">
                                  {item.products?.image_url ? (
                                    <img src={item.products.image_url} alt={item.products.name} className="w-8 h-8 rounded-full object-cover border border-secondary/20 shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20 shrink-0">
                                      <span className="text-[10px] font-bold text-secondary">VC</span>
                                    </div>
                                  )}
                                  <span className="text-sm text-surface/80 truncate">
                                    <span className="font-bold text-secondary">{item.quantity}x</span> {item.products?.name || 'Produto Excluído'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {shouldShowInstallments(sale) && (
                            <div className="mt-2 border-t border-secondary/10 pt-4">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-secondary text-base">event_note</span>
                                  <p className="text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold">
                                    Parcelamento
                                  </p>
                                </div>
                                <span className="px-2 py-1 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[9px] font-bold uppercase tracking-widest">
                                  {(sale.sale_installments?.length || sale.installments || 1)}x
                                </span>
                              </div>

                              {sale.sale_installments && sale.sale_installments.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {sale.sale_installments.map((installment, idx) => (
                                    <div key={`${sale.id}-installment-${idx}`} className="rounded-2xl bg-primary/20 border border-white/5 p-3 flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-surface">
                                          {idx + 1}ª parcela · R$ {installment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-[9px] text-surface/40 uppercase tracking-widest mt-1">
                                          Vence em {new Date(`${installment.due_date}T00:00:00`).toLocaleDateString('pt-BR')}
                                        </p>
                                      </div>
                                      <span className={`shrink-0 px-2 py-1 rounded-lg border text-[8px] font-bold uppercase tracking-widest ${getInstallmentStatusClass(installment.status)}`}>
                                        {formatInstallmentStatus(installment.status)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/10 p-3">
                                  <p className="text-[10px] text-amber-300/80 uppercase tracking-widest font-bold">
                                    Datas e status serão definidos ao aprovar as parcelas.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end justify-between gap-4 border-t md:border-t-0 border-secondary/5 pt-5 md:pt-0 w-full md:w-auto">
                          <div className="text-right w-full md:w-auto">
                            <p className="text-[9px] text-surface/30 uppercase tracking-[0.2em] font-bold mb-1">Total Recebido</p>
                            <p className="text-xl text-surface font-bold">R$ {sale.total_amount.toLocaleString('pt-BR')}</p>
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-end gap-2 w-full">
                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border ${
                              sale.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              sale.status === 'aguardando_confirmacao' || sale.status === 'solicitado' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              sale.status === 'link_enviado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              sale.status === 'cancelada' ? 'bg-surface/10 text-surface/40 border-surface/20' :
                              'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {sale.status === 'aguardando_confirmacao' ? 'Aguardando' : sale.status === 'link_enviado' ? 'Link Enviado' : sale.status}
                            </span>
                            
                            {(sale.status === 'aguardando_confirmacao' || sale.status === 'solicitado') && (
                              <button
                                onClick={() => handleConfirmSale(sale)}
                                className="px-4 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all font-bold text-[10px] uppercase tracking-widest border border-emerald-500/30 whitespace-nowrap"
                                title={sale.clients?.status === 'Pendente' ? "Completar Cadastro do Cliente" : "Confirmar Venda/Pagamento"}
                              >
                                {needsInstallmentApproval(sale) ? 'Aprovar Parcelas' : 'Confirmar Pagamento'}
                              </button>
                            )}

                            {/* O BOTÃO CADASTRAR CLIENTE (AGORA UM LINK DIRETO COM MOCHILA/STATE) */}
                            {(sale.status === 'pendente' || sale.status === 'aguardando_confirmacao' || sale.status === 'solicitado') && (
                              (!sale.client_id || sale.clients?.status === 'Pendente') ? (
                                <Link
                                  to={sale.client_id ? `/admin/clients/edit/${sale.client_id}` : '/admin/clients/new'}
                                  state={sale.client_id ? undefined : { 
                                    nomePreenchido: sale.clients?.name,
                                    telefonePreenchido: sale.clients?.phone 
                                  }}
                                  className="px-4 py-1.5 rounded-xl border border-secondary text-secondary hover:bg-secondary/10 transition-all font-bold text-[10px] uppercase tracking-widest whitespace-nowrap"
                                >
                                  + Cadastrar Cliente
                                </Link>
                              ) : (
                                <button
                                  onClick={() => setBillingModalSale(sale)}
                                  className="px-4 py-1.5 rounded-xl bg-secondary text-primary hover:bg-secondary/90 transition-all font-bold text-[10px] uppercase tracking-widest whitespace-nowrap"
                                >
                                  Cobrar Cliente
                                </button>
                              )
                            )}

                            {sale.status !== 'cancelada' && (
                              <button onClick={() => handleCancelSale(sale)} className="px-4 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all font-bold text-[10px] uppercase tracking-widest border border-rose-500/20 whitespace-nowrap" title="Cancelar Venda">
                                Cancelar
                              </button>
                            )}
                            <button onClick={() => handleDeleteSale(sale.id)} className="w-8 h-8 rounded-xl bg-surface/5 text-surface/40 hover:bg-rose-500/10 hover:text-rose-400 transition-all flex items-center justify-center border border-transparent hover:border-rose-500/20 shrink-0" title="Excluir Venda Permanentemente">
                              <Trash2 className="w-4 h-4" />
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
          </div>
        </div>
      </PDFPreviewModal>

      <AnimatePresence>
        {approvalSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-[#1A1F2E] border border-secondary/20 rounded-3xl p-6 w-full max-w-2xl shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-secondary font-bold mb-2">
                    Conferência de Parcelamento
                  </p>
                  <h3 className="text-2xl font-headline italic text-surface">
                    {approvalSale.clients?.name || 'Cliente'}
                  </h3>
                  <p className="text-xs text-surface/50 uppercase tracking-widest mt-1">
                    {approvalSale.payment_method === 'cartao' ? 'Cartão de Crédito' : 'Crediário Valle Chic'}
                  </p>
                </div>
                <button
                  onClick={closeInstallmentApproval}
                  className="w-10 h-10 rounded-full bg-white/5 text-surface/50 hover:text-secondary hover:bg-secondary/10 transition-colors flex items-center justify-center"
                  disabled={approvalSaving}
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl bg-primary/40 border border-white/5 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-surface/40 font-bold mb-1">Total</p>
                  <p className="text-xl font-bold text-secondary">
                    R$ {approvalSale.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/40 border border-white/5 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-surface/40 font-bold mb-1">Parcelas</p>
                  <select
                    value={approvalInstallmentsCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setApprovalInstallmentsCount(count);
                      setApprovalDueDates(getDefaultDueDates(count));
                    }}
                    className="w-full bg-transparent text-xl font-bold text-secondary outline-none cursor-pointer"
                    disabled={approvalSaving}
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                      <option key={n} value={n} className="bg-[#1A1F2E] text-surface">
                        {n}x
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-2xl bg-primary/40 border border-white/5 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-surface/40 font-bold mb-1">Valor por parcela</p>
                  <p className="text-xl font-bold text-secondary">
                    R$ {(approvalSale.total_amount / approvalInstallmentsCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-surface/50 font-bold">Vencimentos</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-secondary/80 font-bold">
                    Soma: R$ {approvalSale.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {approvalDueDates.map((date, index) => (
                  <div key={index} className="grid grid-cols-[3rem_1fr_1.2fr] gap-3 items-center rounded-2xl bg-primary/30 border border-white/5 p-3">
                    <span className="text-xs font-bold text-secondary text-center">{index + 1}ª</span>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-surface/35 font-bold mb-1">Valor</p>
                      <p className="text-sm font-bold text-surface">
                        R$ {(approvalSale.total_amount / approvalInstallmentsCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-surface/35 font-bold mb-1">Vencimento</p>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          const nextDates = [...approvalDueDates];
                          nextDates[index] = e.target.value;
                          setApprovalDueDates(nextDates);
                        }}
                        className="w-full bg-primary/60 border border-secondary/10 rounded-xl px-3 py-2 text-xs text-surface outline-none focus:border-secondary/50"
                        disabled={approvalSaving}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={closeInstallmentApproval}
                  disabled={approvalSaving}
                  className="flex-1 py-4 rounded-xl border border-surface/10 text-surface/60 hover:bg-surface/5 font-bold uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmInstallmentApproval}
                  disabled={approvalSaving}
                  className="flex-1 py-4 rounded-xl bg-secondary text-primary hover:bg-secondary/90 font-bold uppercase tracking-widest text-xs shadow-lg shadow-secondary/20 disabled:opacity-50"
                >
                  {approvalSaving ? 'Confirmando...' : 'Confirmar Parcelamento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <NotificationModal 
        isOpen={modalConfig.isOpen}
        onClose={() => { setModalConfig({ ...modalConfig, isOpen: false }); setDeleteId(null); }}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />

      <AnimatePresence>
        {billingModalSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#1A1F2E] border border-secondary/20 rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-black/50">
              {billingView === 'main' && (
                <>
                  <h3 className="text-xl font-headline italic text-surface mb-2">Opções de Cobrança</h3>
                  <p className="text-surface/60 text-sm mb-6">Escolha como deseja cobrar o cliente <strong className="text-secondary">{billingModalSale.clients?.name}</strong> no valor de <strong className="text-secondary">R$ {billingModalSale.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.</p>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setBillingView('pix')} className="w-full flex items-center gap-3 p-4 rounded-xl border border-secondary/20 hover:bg-secondary/10 transition-colors text-left group">
                      <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform shrink-0"><QrCode className="w-5 h-5" /></div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-surface truncate">Chave PIX</p><p className="text-xs text-surface/50 truncate">Copiar chave PIX da loja</p></div>
                      <ChevronRight className="w-5 h-5 text-surface/30 group-hover:text-secondary transition-colors" />
                    </button>
                    <button onClick={() => handleGeneratePaymentLink(billingModalSale)} disabled={isGeneratingLink} className="w-full flex items-center gap-3 p-4 rounded-xl border border-secondary/20 hover:bg-secondary/10 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shrink-0"><LinkIcon className="w-5 h-5" /></div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-surface truncate">{isGeneratingLink ? 'Gerando Link...' : 'Link de Pagamento'}</p><p className="text-xs text-surface/50 truncate">Gerar link da InfinitePay</p></div>
                      {!isGeneratingLink && <ChevronRight className="w-5 h-5 text-surface/30 group-hover:text-secondary transition-colors" />}
                    </button>
                  </div>
                  {cobrancaSelecionada && (
                    <button onClick={() => {
                      const phone = billingModalSale.clients?.phone?.replace(/\D/g, '');
                      if (phone) {
                        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${billingModalSale.clients?.name}, segue a cobrança: ${cobrancaData}`)}`, '_blank');
                      } else toast.error('Cliente não possui telefone.');
                    }} className="mt-6 w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-[#D4AF37] text-[#0A1220] hover:bg-[#F3E5AB] font-bold uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20">
                      <MessageCircle className="w-5 h-5" /> Enviar via WhatsApp
                    </button>
                  )}
                  <button onClick={() => { setBillingModalSale(null); setCobrancaSelecionada(false); setCobrancaData(''); setBillingView('main'); }} className="mt-6 w-full py-3 rounded-xl border border-surface/10 text-surface/60 hover:bg-surface/5 font-bold uppercase tracking-widest text-xs">
                    Cancelar
                  </button>
                </>
              )}
              {billingView === 'pix' && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => { setBillingView('main'); setIsAddingPix(false); }} className="p-2 rounded-full hover:bg-white/5 text-surface/60 hover:text-surface"><ChevronLeft className="w-5 h-5" /></button>
                    <h3 className="text-xl font-headline italic text-surface">Chaves PIX</h3>
                  </div>
                  {!isAddingPix ? (
                    <>
                      <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {pixKeys.map(pix => (
                          <div key={pix.id} className="flex items-center gap-2 group">
                            <button onClick={() => { navigator.clipboard.writeText(pix.key); setCobrancaData(pix.key); setCobrancaSelecionada(true); setBillingView('main'); toast.success('Copiada!'); }} className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-secondary/20 hover:bg-secondary/10 text-left">
                              <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 shrink-0"><QrCode className="w-4 h-4" /></div>
                              <div className="flex-1 min-w-0"><p className="text-xs text-surface/50 uppercase font-bold">{pix.type}</p><p className="font-mono text-sm text-surface truncate">{pix.key}</p></div>
                            </button>
                            <button onClick={() => setPixKeys(pixKeys.filter(p => p.id !== pix.id))} className="p-3 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100" title="Remover"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setIsAddingPix(true)} className="w-full py-3 rounded-xl border border-dashed border-secondary/30 text-secondary hover:bg-secondary/5 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Adicionar Nova Chave
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-surface/60 uppercase mb-2">Tipo</label>
                        <select value={newPixType} onChange={(e) => setNewPixType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-surface">
                          <option value="CPF">CPF</option><option value="E-mail">E-mail</option><option value="Telefone">Telefone</option><option value="Aleatória">Aleatória</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-surface/60 uppercase mb-2">Chave</label>
                        <input type="text" value={newPixKey} onChange={(e) => setNewPixKey(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-surface" />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsAddingPix(false)} className="flex-1 py-3 rounded-xl border border-surface/10 text-surface/60 hover:bg-surface/5 font-bold uppercase text-xs">Cancelar</button>
                        <button onClick={() => { if (newPixKey.trim()) { setPixKeys([...pixKeys, { id: Date.now(), type: newPixType, key: newPixKey.trim() }]); setNewPixKey(''); setIsAddingPix(false); } }} disabled={!newPixKey.trim()} className="flex-1 py-3 rounded-xl bg-secondary text-primary hover:bg-secondary/90 font-bold uppercase text-xs disabled:opacity-50">Salvar</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
