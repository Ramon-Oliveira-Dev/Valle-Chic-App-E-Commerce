import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import NotificationModal from '../../components/NotificationModal';
import NotificationBell from '../../components/NotificationBell';
import MenuButton from '../../components/MenuButton';
import { 
  User, 
  Star, 
  MessageCircle, 
  Trash2, 
  Edit3, 
  Search, 
  Cake,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ShoppingBag
} from 'lucide-react';

export default function AdminClients() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
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
  const itemsPerPage = 10;

  useEffect(() => {
    fetchClients();
  }, [currentPage, searchTerm]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order('name')
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;

      // Fetch balances and purchase counts for these clients
      const clientIds = data?.map(c => c.id) || [];
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('client_id, total_amount, amount_paid')
        .in('client_id', clientIds);

      if (salesError) console.error('Error fetching sales for balances:', salesError);

      const clientsWithStats = data?.map(client => {
        const clientSales = salesData?.filter(s => s.client_id === client.id) || [];
        const totalOwed = clientSales.reduce((acc, curr) => acc + (curr.total_amount - (curr.amount_paid || 0)), 0);
        const purchaseCount = clientSales.length;
        return { ...client, totalOwed, purchases: purchaseCount };
      }) || [];

      setClients(clientsWithStats);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro de Carregamento',
        message: 'Não foi possível carregar a lista de clientes.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleDeleteClient = (id: string, name: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Remover Cliente',
      message: `Tem certeza que deseja remover a cliente ${name}? Esta ação não pode ser desfeita.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('clients').delete().eq('id', id);
          if (error) throw error;
          setClients(prev => prev.filter(c => c.id !== id));
          setTotalCount(prev => prev - 1);
          
          setModalConfig({
            isOpen: true,
            title: 'Cliente Removida',
            message: `A cliente "${name}" foi removida com sucesso.`,
            type: 'success'
          });
        } catch (error: any) {
          console.error('Error removing client:', error);
          setModalConfig({
            isOpen: true,
            title: 'Erro ao Remover',
            message: error.message || 'Ocorreu um erro ao tentar remover a cliente.',
            type: 'error'
          });
        }
      }
    });
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 overflow-y-auto">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-10">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <div>
              <h2 className="font-headline text-2xl italic">Admin <span className="text-secondary">VC</span></h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        <div className="px-5 md:px-10 max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="font-headline text-3xl italic">Gestão de Clientes <span className="text-secondary">VIP</span></h2>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Visualize e gerencie sua base de clientes exclusiva</p>
            </div>
            <Link 
              to="/admin/clients/new" 
              className="group relative overflow-hidden bg-gradient-to-br from-secondary to-secondary/80 text-primary px-8 py-3.5 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all hover:shadow-lg hover:shadow-secondary/30 active:scale-95 flex items-center justify-center gap-2.5"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12"></div>
              <UserPlus className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Novo Cliente</span>
            </Link>
          </div>

          <div className="space-y-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
              <input 
                type="text" 
                placeholder="Buscar cliente por nome..." 
                className="w-full bg-primary/20 backdrop-blur-md border border-secondary/10 rounded-2xl py-3.5 pl-12 pr-4 text-surface placeholder:text-surface/20 focus:outline-none focus:border-secondary/40 transition-all text-sm" 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block glass-card rounded-3xl overflow-hidden border border-secondary/10">
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary"></div>
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-20 text-surface/40">
                  <User className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-headline text-xl italic">Nenhum cliente encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-primary/40 border-b border-secondary/10">
                        <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Cliente</th>
                        <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Status</th>
                        <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold">Financeiro</th>
                        <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-center">Compras</th>
                        <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-surface/40 font-bold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/5">
                      {clients.map((client) => (
                        <tr key={client.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/40 border border-secondary/30 p-0.5 shrink-0 shadow-inner">
                                  {client.image_url ? (
                                    <img src={client.image_url} alt={client.name} className="w-full h-full object-cover rounded-full" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-secondary/40 bg-primary/20">
                                      <User className="w-6 h-6" />
                                    </div>
                                  )}
                                </div>
                                {client.is_vip && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center shadow-lg border border-primary">
                                    <Star className="w-3 h-3 text-primary fill-primary" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-surface group-hover:text-secondary transition-colors">{client.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] text-surface/30 uppercase tracking-widest font-mono">ID: {client.id.slice(0, 8)}</span>
                                  {client.birth_day && (
                                    <span className="flex items-center gap-1 text-[8px] text-secondary/60 font-bold uppercase">
                                      <Cake className="w-2.5 h-2.5" />
                                      {client.birth_day}/{client.birth_month}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${client.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {client.status || 'Ativo'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${client.payment_status === 'Adimplente' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {client.payment_status || 'Adimplente'}
                              </span>
                              {client.payment_status === 'Inadimplente' && client.totalOwed > 0 && (
                                <span className="text-[11px] text-rose-400 font-bold">
                                  R$ {client.totalOwed.toLocaleString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="font-bold text-surface/60">{client.purchases || 0}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={`/admin/clients/edit/${client.id}`} className="p-2.5 text-surface/40 hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all">
                                <Edit3 className="w-4 h-4" />
                              </Link>
                              <button 
                                onClick={() => handleDeleteClient(client.id, client.name)}
                                className="p-2.5 text-surface/40 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-12 text-surface/40">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="font-headline text-lg italic">Nenhum cliente encontrado</p>
                </div>
              ) : (
                clients.map((client) => (
                  <div key={client.id} className="glass-card rounded-3xl p-5 border border-secondary/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 flex gap-2">
                       <Link to={`/admin/clients/edit/${client.id}`} className="p-2.5 text-surface/40 hover:text-secondary bg-white/5 rounded-xl backdrop-blur-sm">
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      <button 
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        className="p-2.5 text-surface/40 hover:text-rose-400 bg-white/5 rounded-xl backdrop-blur-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-5">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/40 border border-secondary/30 p-0.5 shrink-0 shadow-inner">
                          {client.image_url ? (
                            <img src={client.image_url} alt={client.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-secondary/40 bg-primary/20">
                              <User className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        {client.is_vip && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center shadow-lg border-2 border-primary">
                            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 pr-16">
                        <h3 className="font-bold text-lg text-surface truncate">{client.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest ${client.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {client.status || 'Ativo'}
                          </span>
                          {client.birth_day && (
                            <span className="flex items-center gap-1 text-[9px] text-secondary/80 font-bold uppercase">
                              <Cake className="w-3 h-3" />
                              {client.birth_day}/{client.birth_month}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-0 py-4 border-y border-secondary/5 mb-4">
                      <div className="pr-4 border-r border-secondary/5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CreditCard className="w-3 h-3 text-secondary/40" />
                          <p className="text-[8px] text-surface/30 uppercase tracking-widest font-bold">Financeiro</p>
                        </div>
                        <div className="flex flex-col">
                          <p className={`text-xs font-bold ${client.payment_status === 'Adimplente' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {client.payment_status || 'Adimplente'}
                          </p>
                          {client.payment_status === 'Inadimplente' && client.totalOwed > 0 && (
                            <p className="text-[11px] text-rose-400 font-bold mt-0.5">
                              R$ {client.totalOwed.toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="pl-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ShoppingBag className="w-3 h-3 text-secondary/40" />
                          <p className="text-[8px] text-surface/30 uppercase tracking-widest font-bold">Compras</p>
                        </div>
                        <p className="text-sm font-bold text-surface">{client.purchases || 0} <span className="text-[10px] text-surface/30 font-normal">pedidos</span></p>
                      </div>
                    </div>

                    {client.payment_status === 'Inadimplente' && (
                      <div className="flex gap-2">
                        <a 
                          href={`https://wa.me/${client.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${client.name}, tudo bem? Gostaria de conversar sobre seu saldo em aberto na Valle Chic.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Cobrar via WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-surface/40">
              <p className="font-medium">Mostrando <span className="text-secondary">{clients.length}</span> de <span className="text-secondary">{totalCount}</span> clientes VIP</p>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-xl border border-secondary/10 flex items-center justify-center hover:bg-secondary/10 hover:text-secondary transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-xl border transition-all font-bold text-[10px] ${currentPage === i + 1 ? 'border-secondary bg-secondary text-primary shadow-lg shadow-secondary/20' : 'border-secondary/10 text-surface/40 hover:border-secondary/40 hover:text-secondary'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-xl border border-secondary/10 flex items-center justify-center hover:bg-secondary/10 hover:text-secondary transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />

      <NotificationModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
}
