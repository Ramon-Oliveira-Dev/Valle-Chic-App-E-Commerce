import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import NotificationModal from '../../components/NotificationModal';
import NotificationSino from '../../components/NotificationSino';
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
  ShoppingBag,
  UserCheck,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

      // 1. Buscar vendas para processar Funil e Contador
      const clientIds = data?.map(c => c.id) || [];
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('client_id, total_amount, amount_paid, status, sale_date')
        .in('client_id', clientIds)
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      const clientsWithStats = data?.map(client => {
        const clientSales = salesData?.filter(s => s.client_id === client.id) || [];
        
        // Lógica Financeiro (Crediário)
        const totalOwed = clientSales.reduce((acc, curr) => acc + (curr.total_amount - (curr.amount_paid || 0)), 0);
        
        // Lógica Contador (Apenas concluídas)
        const completedPurchases = clientSales.filter(s => s.status === 'concluido').length;
        
        // Lógica Funil (Status do último pedido)
        const latestOrder = clientSales.length > 0 ? clientSales[0] : null;

        return { 
          ...client, 
          totalOwed, 
          completedPurchases,
          latestOrder 
        };
      }) || [];

      setClients(clientsWithStats);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  // Funções Auxiliares de UI
  const getPedidoStatusUI = (status: string) => {
    switch (status) {
      case 'solicitado': 
        return { label: 'Solicitado', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Package className="w-3 h-3" /> };
      case 'em_andamento': 
        return { label: 'Andamento', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <Clock className="w-3 h-3" /> };
      case 'concluido': 
        return { label: 'Concluído', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> };
      default: 
        return { label: 'Sem Pedido', classes: 'bg-white/5 text-surface/20 border-white/5', icon: null };
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleDeleteClient = (id: string, name: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Remover Cliente',
      message: `Tem certeza que deseja remover a cliente ${name}?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('clients').delete().eq('id', id);
          if (error) throw error;
          fetchClients();
          toast.success('Cliente removida.');
        } catch (error) {
          toast.error('Erro ao remover cliente.');
        }
      }
    });
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 pb-28">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-10">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <h2 className="font-headline text-2xl italic">Admin <span className="text-secondary italic ml-1">VC</span></h2>
          </div>
          <NotificationSino />
        </header>

        <div className="px-5 md:px-10 max-w-7xl mx-auto pt-24">
          {/* Header Superior */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="font-headline text-4xl italic mb-1 uppercase text-surface">Gestão de Clientes <span className="text-secondary italic">VIP</span></h2>
              <p className="text-surface/40 text-[10px] uppercase tracking-[0.3em] font-black">Fidelização & Crediário Valle Chic</p>
            </div>
            <Link 
              to="/admin/clients/new" 
              className="bg-secondary text-primary px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-secondary/10 hover:scale-105 transition-all flex items-center justify-center gap-2.5"
            >
              <UserPlus className="w-4 h-4" />
              Novo Cliente
            </Link>
          </div>

          <div className="space-y-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/30" />
              <input 
                type="text" 
                placeholder="Buscar por nome..." 
                className="w-full bg-[#11141B] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-surface placeholder:text-surface/20 outline-none focus:border-secondary/30 transition-all text-sm" 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* View Desktop */}
            <div className="hidden md:block glass-card rounded-[32px] overflow-hidden border border-white/5 bg-[#0B111D]/80 backdrop-blur-2xl">
              {loading ? (
                <div className="py-24 text-center animate-pulse text-surface/20 uppercase tracking-widest text-xs">Sincronizando Base de Dados...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5">
                        <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-surface/30 font-black">Cliente</th>
                        <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-surface/30 font-black">Status</th>
                        <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-surface/30 font-black text-center">Financeiro</th>
                        <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-surface/30 font-black">Pedido</th>
                        <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-surface/30 font-black text-center">Efetivadas</th>
                        <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-surface/30 font-black text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {clients.map((client) => {
                        const statusPedido = getPedidoStatusUI(client.latestOrder?.status);
                        return (
                          <tr key={client.id} className="hover:bg-white/[0.01] transition-colors group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-primary/60 flex items-center justify-center p-0.5">
                                    {client.image_url ? (
                                      <img src={client.image_url} alt="" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                      <User className="w-6 h-6 text-surface/10" />
                                    )}
                                  </div>
                                  {client.is_vip && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center border-2 border-[#0B111D]">
                                      <Star className="w-2.5 h-2.5 text-primary fill-primary" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-surface group-hover:text-secondary transition-colors">{client.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] text-surface/20 font-mono">ID: {client.id.slice(0, 8).toUpperCase()}</span>
                                    {client.birthday && (
                                      <span className="flex items-center gap-1 text-[8px] text-secondary/60 font-bold uppercase">
                                        <Cake className="w-2.5 h-2.5" /> {client.birthday}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${client.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                {client.status || 'Ativo'}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              {client.totalOwed > 0 ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-rose-500/20 mb-1">Crediário</span>
                                  <span className="text-[11px] font-bold text-rose-400">R$ {client.totalOwed.toLocaleString('pt-BR')}</span>
                                </div>
                              ) : (
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50">Em Dia</span>
                              )}
                            </td>
                            {/* COLUNA PEDIDO (FUNIL) */}
                            <td className="px-8 py-5">
                              <div className="flex flex-col gap-1">
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border w-fit ${statusPedido.classes}`}>
                                  {statusPedido.icon}
                                  <span className="text-[9px] font-black uppercase tracking-wider">{statusPedido.label}</span>
                                </div>
                                {client.latestOrder && (
                                  <span className="text-[9px] text-surface/20 font-bold uppercase tracking-widest ml-1">
                                    {format(new Date(client.latestOrder.sale_date), "dd MMM", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="text-xl font-headline italic text-surface leading-none">{client.completedPurchases}</span>
                                <span className="text-[8px] uppercase font-black tracking-widest text-surface/10 mt-1">Vendas</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link to={`/admin/clients/edit/${client.id}`} className="p-2.5 text-surface/20 hover:text-secondary hover:bg-white/5 rounded-xl transition-all"><Edit3 className="w-4 h-4" /></Link>
                                <button onClick={() => handleDeleteClient(client.id, client.name)} className="p-2.5 text-surface/20 hover:text-rose-400 hover:bg-white/5 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* View Mobile (Cards) */}
            <div className="md:hidden space-y-4">
              {loading ? (
                <div className="py-12 text-center text-surface/10 animate-pulse uppercase tracking-widest text-[10px]">Atualizando...</div>
              ) : clients.map((client) => {
                const statusPedido = getPedidoStatusUI(client.latestOrder?.status);
                return (
                  <div key={client.id} className="glass-card rounded-[32px] p-5 border border-white/5 relative bg-[#0B111D]/60 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-5 pb-5 border-b border-white/5">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 bg-primary/40 flex items-center justify-center p-0.5">
                          {client.image_url ? <img src={client.image_url} alt="" className="w-full h-full object-cover rounded-full" /> : <User className="w-8 h-8 text-surface/10" />}
                        </div>
                        {client.is_vip && <div className="absolute -top-1 -right-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center border-2 border-[#0B111D]"><Star className="w-3.5 h-3.5 text-primary fill-primary" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg text-surface truncate pr-16">{client.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${client.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20' : 'bg-rose-500/10 text-rose-400 border border-rose-400/20'}`}>{client.status || 'Ativo'}</span>
                          {client.birthday && <span className="flex items-center gap-1 text-[9px] text-secondary font-black uppercase"><Cake className="w-3 h-3" /> {client.birthday}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                        <p className="text-[8px] text-surface/30 uppercase font-black tracking-widest mb-1">Último Pedido</p>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border w-fit ${statusPedido.classes}`}>
                           <span className="text-[8px] font-black uppercase">{statusPedido.label}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                        <p className="text-[8px] text-surface/30 uppercase font-black tracking-widest mb-1">Efetivadas</p>
                        <p className="text-sm font-bold text-surface">{client.completedPurchases} <span className="text-[9px] text-surface/30 font-black ml-1">compras</span></p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/admin/clients/edit/${client.id}`} className="flex-1 bg-white/5 hover:bg-secondary/10 hover:text-secondary py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-white/5"><Edit3 className="w-4 h-4" /> Editar</Link>
                      <button onClick={() => handleDeleteClient(client.id, client.name)} className="flex-1 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-white/5"><Trash2 className="w-4 h-4" /> Excluir</button>
                    </div>

                    {client.totalOwed > 0 && (
                      <div className="mt-3 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20 flex justify-between items-center">
                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> Crediário em Aberto</span>
                        <span className="font-bold text-rose-400 text-sm">R$ {client.totalOwed.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-surface/20 uppercase font-black tracking-widest">
              <p>Mostrando {clients.length} de {totalCount} clientes VIP</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center hover:bg-white/5 disabled:opacity-20 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl border transition-all font-bold ${currentPage === i + 1 ? 'border-secondary bg-secondary text-primary' : 'border-white/5 text-surface/40 hover:bg-white/5'}`}>{i + 1}</button>
                  ))}
                </div>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center hover:bg-white/5 disabled:opacity-20 transition-all"><ChevronRight className="w-4 h-4" /></button>
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