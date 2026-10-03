import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import { api } from '../../services/api';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import NotificationModal from '../../components/NotificationModal';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Search, AlertTriangle, CheckCircle, TrendingUp, DollarSign, 
  Calendar, MessageSquare, Phone, Info, Clock, AlertCircle 
} from 'lucide-react';

interface Installment {
  id: string;
  sale_id: string;
  client_id: string;
  amount: number;
  due_date: string;
  status: 'pendente' | 'pago';
  paid_at?: string;
  clients?: {
    name: string;
    phone: string;
  };
  sales?: {
    total_amount: number;
    sale_date: string;
  };
}

export default function AdminDebts() {
  const navigate = useNavigate();
  const { isDesktopSidebarCollapsed } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [filter, setFilter] = useState<'all' | 'pendente' | 'pago'>('all');
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const installmentsList = await api.debts.getAll();
      setInstallments(installmentsList);
    } catch (error: any) {
      console.error('Error fetching debts:', error);
      setInstallments([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (id: string, clientId: string) => {
    try {
      await api.debts.markAsPaid(id, clientId);

      // Update local state first for immediate UI feedback
      const updatedInstallments = installments.map(inst => 
        inst.id === id ? { ...inst, status: 'pago' as const, paid_at: new Date().toISOString() } : inst
      );
      setInstallments(updatedInstallments);

      setModalConfig({
        isOpen: true,
        title: 'Pagamento Confirmado',
        message: 'A parcela foi marcada como paga com sucesso.',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Atualizar',
        message: 'Não foi possível registrar o pagamento.',
        type: 'error'
      });
    }
  };

  const sendWhatsAppReminder = (inst: Installment) => {
    if (!inst.clients?.phone) {
      toast.error('Cliente sem telefone cadastrado.');
      return;
    }

    const message = `Olá, ${inst.clients.name}! Passando para lembrar do vencimento da sua parcela da Valle Chic no valor de R$ ${inst.amount.toLocaleString('pt-BR')} para o dia ${new Date(inst.due_date).toLocaleDateString('pt-BR')}.`;
    const encodedMessage = encodeURIComponent(message);
    const phone = inst.clients.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const filteredInstallments = installments.filter(inst => {
    const matchesFilter = filter === 'all' ? true : inst.status === filter;
    
    const clientName = inst.clients?.name?.toLowerCase() || '';
    const clientPhone = inst.clients?.phone || '';
    const cleanSearch = searchTerm.toLowerCase().trim();
    const matchesSearch = clientName.includes(cleanSearch) || clientPhone.includes(cleanSearch);
    
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className={`flex-1 min-w-0 p-0 pb-28 ${isDesktopSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px]'} transition-all duration-300`}>
        <header className={`fixed top-0 left-0 right-0 ${isDesktopSidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[240px]'} z-30 flex items-center justify-between px-6 py-4 bar-fume mb-10 transition-all duration-300`}>
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <MenuButton onClick={() => setIsSidebarOpen(true)} />
            </div>
            <button 
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-primary/40 backdrop-blur-sm border border-secondary/20 flex items-center justify-center text-surface/60 hover:text-secondary transition-colors cursor-pointer"
              title="Voltar"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSino />
          </div>
        </header>

        <div className="px-6 lg:px-10 max-w-[1600px] mx-auto pt-24">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-headline text-3xl italic tracking-tight text-white">Caderneta <span className="text-secondary">VC</span></h2>
                <span className="px-3 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-black uppercase tracking-wider">
                  {installments.length} {installments.length === 1 ? 'parcela' : 'parcelas'}
                </span>
              </div>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
                Gestão de fiados, crediários e recebíveis em tempo real
              </p>
            </div>
          </div>

          {/* Cards de Métricas de Faturamento do Crediário */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#10141D]/90 backdrop-blur-2xl p-5 rounded-[24px] border border-rose-500/20 relative overflow-hidden group shadow-lg shadow-rose-950/5">
              <div className="absolute -right-12 -top-12 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
              <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
                <p className="text-rose-400 text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Total Pendente
                </p>
                <span className="text-[8px] font-mono text-surface/30 uppercase">A Receber</span>
              </div>
              <p className="font-headline text-3xl italic font-black text-rose-400 relative z-10">
                R$ {installments
                  .filter(i => i.status === 'pendente')
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="w-full h-1 bg-rose-500/10 rounded-full overflow-hidden mt-3.5">
                <div className="h-full bg-rose-500 rounded-full w-2/3" />
              </div>
            </div>

            <div className="bg-[#10141D]/90 backdrop-blur-2xl p-5 rounded-[24px] border border-emerald-500/20 relative overflow-hidden group shadow-lg shadow-emerald-950/5">
              <div className="absolute -right-12 -top-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
              <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
                <p className="text-emerald-400 text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Total Recebido
                </p>
                <span className="text-[8px] font-mono text-surface/30 uppercase">Baixado</span>
              </div>
              <p className="font-headline text-3xl italic font-black text-emerald-400 relative z-10">
                R$ {installments
                  .filter(i => i.status === 'pago')
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="w-full h-1 bg-emerald-500/10 rounded-full overflow-hidden mt-3.5">
                <div className="h-full bg-emerald-500 rounded-full w-full" />
              </div>
            </div>

            <div className="bg-[#10141D]/90 backdrop-blur-2xl p-5 rounded-[24px] border border-secondary/20 relative overflow-hidden group shadow-lg shadow-black/80">
              <div className="absolute -right-12 -top-12 w-32 h-32 bg-secondary/5 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
              <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
                <p className="text-secondary text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Volume Geral
                </p>
                <span className="text-[8px] font-mono text-surface/30 uppercase">Acumulado</span>
              </div>
              <p className="font-headline text-3xl italic font-black text-white group-hover:text-secondary transition-colors relative z-10">
                R$ {installments
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="w-full h-1 bg-secondary/10 rounded-full overflow-hidden mt-3.5">
                <div className="h-full bg-secondary rounded-full w-4/5" />
              </div>
            </div>
          </div>

          {/* Barra de Filtro e Busca Rápida */}
          <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex gap-1.5 bg-primary/30 p-1.5 rounded-2xl border border-white/5 w-fit shrink-0">
              <button 
                onClick={() => setFilter('all')}
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${filter === 'all' ? 'bg-secondary text-primary shadow-lg shadow-secondary/20' : 'text-surface/40 hover:text-white'}`}
              >
                Todos ({installments.length})
              </button>
              <button 
                onClick={() => setFilter('pendente')}
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${filter === 'pendente' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-surface/40 hover:text-white'}`}
              >
                Pendentes ({installments.filter(i => i.status === 'pendente').length})
              </button>
              <button 
                onClick={() => setFilter('pago')}
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${filter === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-surface/40 hover:text-white'}`}
              >
                Pagos ({installments.filter(i => i.status === 'pago').length})
              </button>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
              <input 
                type="text" 
                placeholder="Buscar por nome do cliente ou telefone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#101420]/80 backdrop-blur-md border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-surface/20 focus:outline-none focus:border-secondary/40 transition-colors"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
            </div>
          ) : filteredInstallments.length === 0 ? (
            <div className="glass-card rounded-[24px] border border-white/5 p-16 text-center max-w-lg mx-auto flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-secondary/20 mb-4 animate-pulse">payments</span>
              <p className="text-surface/30 font-black uppercase tracking-widest text-[9px] mb-2">Nenhum resultado encontrado</p>
              <p className="text-surface/50 text-xs italic">Verifique os filtros de busca ou crie uma nova venda parcelada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInstallments.map((inst) => {
                const isOverdue = inst.status === 'pendente' && new Date(inst.due_date) < new Date();
                const clientInitials = inst.clients?.name?.slice(0, 2).toUpperCase() || 'VC';
                
                return (
                  <motion.div 
                    key={inst.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-[#10141D]/90 backdrop-blur-2xl rounded-[24px] p-5 border ${isOverdue ? 'border-rose-500/25 hover:border-rose-500/40 shadow-lg shadow-rose-950/5' : 'border-white/5 hover:border-secondary/20'} transition-all duration-300 relative overflow-hidden group flex flex-col justify-between`}
                  >
                    {isOverdue && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-500 animate-pulse" />
                    )}

                    <div>
                      {/* Badge superior */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                          inst.status === 'pago' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                            : isOverdue 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                        }`}>
                          {inst.status === 'pago' ? 'LIQUIDADO 🟢' : isOverdue ? 'VENCIDO 🔴' : 'AGUARDANDO 🟡'}
                        </span>
                        
                        <div className="flex items-center gap-1 text-[9px] font-mono text-surface/30">
                          <Clock className="w-3 h-3 text-secondary/50" />
                          <span>Vence em {new Date(inst.due_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      {/* Informações da Cliente e Valor */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-headline italic font-black text-sm shrink-0 border ${
                            inst.status === 'pago' 
                              ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' 
                              : isOverdue 
                                ? 'bg-rose-500/5 text-rose-400 border-rose-500/20' 
                                : 'bg-secondary/5 text-secondary border-secondary/20'
                          }`}>
                            {clientInitials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-headline text-lg italic text-white truncate leading-tight">{inst.clients?.name || 'Cliente Avulso'}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-surface/40 font-bold mt-1">
                              <Phone className="w-3 h-3 text-secondary/40 shrink-0" />
                              <span>{inst.clients?.phone || 'Telefone não registrado'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-surface/30 font-black uppercase tracking-widest block">Parcela</span>
                          <span className="text-2xl font-headline italic font-black text-white group-hover:text-secondary transition-colors">
                            R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Detalhes Adicionais da Compra Original */}
                      <div className="p-3 bg-[#161D2F]/50 border border-white/5 rounded-xl text-[10px] space-y-1.5 mb-4 text-surface/60">
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[8px] text-secondary/70 border-b border-white/5 pb-1 mb-1.5">
                          <Info className="w-3 h-3" />
                          Informações do Pedido
                        </div>
                        {inst.sales ? (
                          <>
                            <div className="flex justify-between">
                              <span>Total da Venda original:</span>
                              <strong className="text-white">R$ {inst.sales.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Registrado em:</span>
                              <strong className="text-white">{new Date(inst.sales.sale_date).toLocaleDateString('pt-BR')}</strong>
                            </div>
                          </>
                        ) : (
                          <div className="text-surface/30 italic text-center py-1">Sem mais detalhes vinculados</div>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                      {inst.status === 'pendente' ? (
                        <>
                          <button 
                            onClick={() => markAsPaid(inst.id, inst.client_id)}
                            className="flex-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-primary py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border border-emerald-500/20 cursor-pointer shadow-md shadow-emerald-950/10"
                          >
                            <span className="material-symbols-outlined text-base">check_circle</span>
                            Confirmar Recebimento
                          </button>
                          
                          <button 
                            onClick={() => sendWhatsAppReminder(inst)}
                            className="w-11 h-11 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 cursor-pointer shrink-0"
                            title="Lembrete de Cobrança WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center gap-2 text-emerald-400 text-[9px] font-black uppercase tracking-widest py-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 shadow-inner">
                          <span className="material-symbols-outlined text-base">verified</span>
                          Liquidado em {new Date(inst.paid_at!).toLocaleDateString('pt-BR')} às {new Date(inst.paid_at!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />

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
