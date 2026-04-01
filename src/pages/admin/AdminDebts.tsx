import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import NotificationModal from '../../components/NotificationModal';
import NotificationBell from '../../components/NotificationBell';
import MenuButton from '../../components/MenuButton';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [filter, setFilter] = useState<'all' | 'pendente' | 'pago'>('all');
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
      const { data, error } = await supabase
        .from('installments')
        .select(`
          *,
          clients (name, phone),
          sales (total_amount, sale_date)
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setInstallments(data || []);
    } catch (error: any) {
      console.error('Error fetching debts:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Carregar Dívidas',
        message: `Não foi possível carregar as parcelas. Erro: ${error.message || 'Verifique a conexão com o banco de dados.'}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from('installments')
        .update({ status: 'pago', paid_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setInstallments(installments.map(inst => 
        inst.id === id ? { ...inst, status: 'pago', paid_at: new Date().toISOString() } : inst
      ));

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

  const filteredInstallments = installments.filter(inst => 
    filter === 'all' ? true : inst.status === filter
  );

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 overflow-y-auto">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-10">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <h2 className="font-headline text-2xl italic">Controle de <span className="text-secondary">Dívidas</span></h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        <div className="px-5 md:px-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="glass-card p-6 rounded-2xl border border-secondary/10 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all" />
              <p className="text-surface/40 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Total Pendente</p>
              <p className="font-headline text-3xl text-amber-400">
                R$ {installments
                  .filter(i => i.status === 'pendente')
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="glass-card p-6 rounded-2xl border border-secondary/10 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-400/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all" />
              <p className="text-surface/40 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Total Recebido</p>
              <p className="font-headline text-3xl text-emerald-400">
                R$ {installments
                  .filter(i => i.status === 'pago')
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="glass-card p-6 rounded-2xl border border-secondary/10 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-all" />
              <p className="text-surface/40 text-[9px] uppercase tracking-[0.2em] font-bold mb-2">Total Geral</p>
              <p className="font-headline text-3xl text-secondary">
                R$ {installments
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-2 bg-primary/40 p-1 rounded-full border border-secondary/10 w-fit">
              <button 
                onClick={() => setFilter('all')}
                className={`px-6 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-secondary text-primary shadow-lg shadow-secondary/20' : 'text-surface/40 hover:text-surface'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilter('pendente')}
                className={`px-6 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${filter === 'pendente' ? 'bg-secondary text-primary shadow-lg shadow-secondary/20' : 'text-surface/40 hover:text-surface'}`}
              >
                Pendentes
              </button>
              <button 
                onClick={() => setFilter('pago')}
                className={`px-6 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${filter === 'pago' ? 'bg-secondary text-primary shadow-lg shadow-secondary/20' : 'text-surface/40 hover:text-surface'}`}
              >
                Pagos
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
            </div>
          ) : filteredInstallments.length === 0 ? (
            <div className="glass-card rounded-2xl p-20 text-center">
              <span className="material-symbols-outlined text-6xl text-surface/20 mb-4">payments</span>
              <p className="text-surface/60 italic">Nenhuma parcela encontrada para este filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInstallments.map((inst) => (
                <motion.div 
                  key={inst.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-6 border border-secondary/10 relative overflow-hidden group hover:border-secondary/30 transition-all"
                >
                  {inst.status === 'pendente' && new Date(inst.due_date) < new Date() && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500 animate-pulse" />
                  )}
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-headline text-xl italic text-surface mb-1">{inst.clients?.name}</h4>
                      <p className="text-[10px] text-surface/40 uppercase tracking-[0.2em] font-bold">{inst.clients?.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-secondary font-bold text-2xl">R$ {inst.amount.toLocaleString('pt-BR')}</p>
                      <p className={`text-[10px] uppercase tracking-widest font-bold ${inst.status === 'pendente' && new Date(inst.due_date) < new Date() ? 'text-rose-400' : 'text-surface/40'}`}>
                        Vencimento: {new Date(inst.due_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-6 border-t border-secondary/10">
                    {inst.status === 'pendente' ? (
                      <>
                        <button 
                          onClick={() => markAsPaid(inst.id)}
                          className="flex-1 bg-emerald-500/10 text-emerald-500 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-primary transition-all flex items-center justify-center gap-2 border border-emerald-500/20"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Confirmar Pagamento
                        </button>
                        <button 
                          onClick={() => sendWhatsAppReminder(inst)}
                          className="w-12 h-12 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all border border-[#25D366]/20"
                          title="Lembrete WhatsApp"
                        >
                          <span className="material-symbols-outlined text-xl">chat</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest py-3 bg-emerald-400/5 rounded-xl border border-emerald-400/10">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        Pago em {new Date(inst.paid_at!).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
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
