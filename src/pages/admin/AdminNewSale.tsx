import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  History, 
  ChevronDown, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Image as ImageIcon,
  Menu,
  Search, 
  X,
  ArrowLeft
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import NotificationModal from '../../components/NotificationModal';
import NotificationBell from '../../components/NotificationBell';
import MenuButton from '../../components/MenuButton';
import { maskCurrency, parseCurrency } from '../../lib/utils';

interface Product {
  id: string;
  name: string;
  sale_price: number;
  stock: number;
  image_url?: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

export default function AdminNewSale() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [recentClientsCount, setRecentClientsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<{ product: Product; quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [amountPaid, setAmountPaid] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [installmentDueDates, setInstallmentDueDates] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Initialize due dates when installments count changes
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= installmentsCount; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(today.getMonth() + i);
      dates.push(dueDate.toISOString().split('T')[0]);
    }
    setInstallmentDueDates(dates);
  }, [installmentsCount]);

  const fetchData = async () => {
    try {
      const [productsRes, clientsRes] = await Promise.all([
        supabase.from('products').select('*').gt('stock', 0),
        supabase.from('clients').select('*').order('name')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setProducts(productsRes.data || []);
      setClients(clientsRes.data || []);

      // Fetch recent clients from sales
      const { data: recentSales } = await supabase
        .from('sales')
        .select('client_id, clients(*)')
        .order('sale_date', { ascending: false })
        .limit(20);
      
      if (recentSales) {
        const uniqueClients: Client[] = [];
        const seenIds = new Set();
        recentSales.forEach(s => {
          if (s.clients && !seenIds.has((s.clients as any).id)) {
            uniqueClients.push(s.clients as any);
            seenIds.add((s.clients as any).id);
          }
        });
        setRecentClients(uniqueClients.slice(0, 5));
        setRecentClientsCount(seenIds.size);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro de Carregamento',
        message: 'Não foi possível carregar os dados de produtos e clientes.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const addProductToSale = (product: Product) => {
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        setModalConfig({
          isOpen: true,
          title: 'Estoque Insuficiente',
          message: `Apenas ${product.stock} unidades disponíveis para "${product.name}".`,
          type: 'warning'
        });
        return;
      }
      setSelectedProducts(selectedProducts.map(p => 
        p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, { product, quantity: 1 }]);
    }
  };

  const removeProductFromSale = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.product.id === productId) {
        const newQty = p.quantity + delta;
        if (newQty <= 0) return p;
        if (newQty > p.product.stock) {
          setModalConfig({
            isOpen: true,
            title: 'Estoque Insuficiente',
            message: `Apenas ${p.product.stock} unidades disponíveis para "${p.product.name}".`,
            type: 'warning'
          });
          return p;
        }
        return { ...p, quantity: newQty };
      }
      return p;
    }));
  };

  const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.product.sale_price * p.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      setModalConfig({
        isOpen: true,
        title: 'Atenção',
        message: 'Por favor, selecione um cliente para a venda.',
        type: 'warning'
      });
      return;
    }
    if (selectedProducts.length === 0) {
      setModalConfig({
        isOpen: true,
        title: 'Carrinho Vazio',
        message: 'Adicione pelo menos um produto para registrar a venda.',
        type: 'warning'
      });
      return;
    }

    setSaving(true);

    try {
      // 1. Create Sale Record
      const { data: sale, error: saleError } = await supabase.from('sales').insert([{
        client_id: selectedClient,
        total_amount: totalAmount,
        amount_paid: parseCurrency(amountPaid),
        payment_method: paymentMethod,
        sale_date: saleDate,
        status: parseCurrency(amountPaid) >= totalAmount ? 'pago' : 'pendente'
      }]).select().single();

      if (saleError) throw saleError;

      // 2. Create Sale Items and Update Stock
      for (const item of selectedProducts) {
        // Add sale item
        const { error: itemError } = await supabase.from('sale_items').insert([{
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.sale_price
        }]);
        if (itemError) throw itemError;

        // Update stock
        const newStock = item.product.stock - item.quantity;
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock: newStock,
            published: newStock > 0 // Auto unpublish if stock is 0
          })
          .eq('id', item.product.id);
        if (stockError) throw stockError;

        // If stock is 0, create a notification
        if (newStock === 0) {
          await supabase.from('notifications').insert([{
            type: 'stock',
            title: 'Produto Esgotado',
            message: `O produto ${item.product.name} acabou e foi removido do catálogo automaticamente.`,
            priority: 'high',
            is_read: false
          }]);
        }

        // Record Inventory Movement (Exit)
        await supabase.from('inventory_movements').insert([{
          product_id: item.product.id,
          type: 'exit',
          quantity: item.quantity,
          date: new Date(saleDate).toISOString(),
          description: `Venda realizada (Venda #${sale.id.substring(0, 8)})`
        }]);
      }

      // 3. Create Installments if there's a balance or it's crediario
      const balance = totalAmount - parseCurrency(amountPaid);
      if (balance > 0) {
        // Update client status to Inadimplente
        const { error: clientUpdateError } = await supabase
          .from('clients')
          .update({ payment_status: 'Inadimplente' })
          .eq('id', selectedClient);
        
        if (clientUpdateError) {
          console.error('Error updating client status:', clientUpdateError);
        }

        const installmentAmount = balance / installmentsCount;
        const installmentsData = installmentDueDates.map(date => ({
          sale_id: sale.id,
          client_id: selectedClient,
          amount: installmentAmount,
          due_date: date,
          status: 'pendente'
        }));

        const { error: instError } = await supabase.from('installments').insert(installmentsData);
        if (instError) {
          console.error('Error creating installments:', instError);
          // We don't throw here to not revert the sale, but we should notify
          toast.error('Venda salva, mas erro ao criar parcelas. Verifique a tabela "installments".');
        }
      }

      setModalConfig({
        isOpen: true,
        title: 'Venda Realizada!',
        message: 'A venda foi registrada com sucesso e o estoque atualizado.',
        type: 'success'
      });
      
      setTimeout(() => navigate('/admin/dashboard'), 2000);
    } catch (error: any) {
      console.error('Error saving sale:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Registrar Venda',
        message: error.message || 'Ocorreu um erro inesperado ao salvar a venda.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen global-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 overflow-y-auto">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-4">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <h2 className="font-headline text-2xl italic">Nova Venda <span className="text-secondary">VC</span></h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        <div className="px-5 md:px-10 max-w-6xl mx-auto">
          <div className="mb-4 flex justify-end">
            <Link 
              to="/admin/sales"
              className="group relative overflow-hidden px-4 py-2 rounded-xl border border-secondary/10 text-surface/40 font-bold uppercase tracking-[0.2em] text-[8px] hover:text-secondary hover:border-secondary/40 transition-all duration-300 flex items-center gap-2 bg-white/5 backdrop-blur-sm"
            >
              <History className="w-3 h-3 relative z-10 group-hover:rotate-[-15deg] transition-transform" />
              <span className="relative z-10">Histórico de Vendas</span>
            </Link>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Client & Products Selection */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Client Selection - Optimized Layout */}
              <section className="glass-card rounded-3xl p-8 border border-secondary/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-secondary/5 rounded-full blur-3xl group-hover:bg-secondary/10 transition-colors" />
                
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center shadow-inner border border-secondary/10">
                      <User className="text-secondary w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-secondary text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Identificação</h3>
                      <p className="text-surface/60 text-[10px] font-bold uppercase tracking-widest">Selecione o cliente para vincular a venda</p>
                    </div>
                  </div>
                  
                  {recentClientsCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] uppercase tracking-widest font-bold text-emerald-400">
                        {recentClientsCount} Recentes
                      </span>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="relative group/search">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-secondary/40 group-focus-within/search:text-secondary transition-colors">
                      <Search className="w-5 h-5" />
                    </div>
                    <input 
                      type="text"
                      placeholder="Buscar cliente por nome ou ID..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="w-full bg-primary/20 backdrop-blur-md border border-secondary/10 rounded-2xl py-4 pl-14 pr-12 text-surface font-sans font-bold text-lg focus:outline-none focus:border-secondary/40 focus:ring-4 focus:ring-secondary/5 transition-all shadow-sm placeholder:text-surface/20"
                    />
                    {searchTerm && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedClient('');
                        }}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-surface/20 hover:text-secondary transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Suggestions */}
                  <AnimatePresence>
                    {showSuggestions && (searchTerm.length > 0 || clients.length > 0) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-[60] left-0 right-0 mt-2 bg-primary/95 backdrop-blur-xl border border-secondary/20 rounded-2xl shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar-dark"
                      >
                        {clients
                          .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.includes(searchTerm))
                          .map(client => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => {
                                setSelectedClient(client.id);
                                setSearchTerm(client.name);
                                setShowSuggestions(false);
                              }}
                              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/10 transition-colors text-left border-b border-secondary/5 last:border-0"
                            >
                              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold border border-secondary/10 shrink-0">
                                {client.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-surface font-bold truncate">{client.name}</p>
                                <p className="text-[10px] text-surface/40 uppercase tracking-widest">ID: {client.id.slice(0, 8)}...</p>
                              </div>
                              {selectedClient === client.id && (
                                <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
                              )}
                            </button>
                          ))}
                        
                        {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.includes(searchTerm)).length === 0 && (
                          <div className="p-8 text-center">
                            <p className="text-surface/40 text-xs italic mb-4">Nenhum cliente encontrado.</p>
                            <Link 
                              to="/admin/clients" 
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-primary font-bold uppercase tracking-widest text-[10px] hover:bg-secondary/90 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              Cadastrar Novo
                            </Link>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Recent Clients Bar */}
                  {recentClients.length > 0 && !selectedClient && (
                    <div className="mt-6">
                      <p className="text-[8px] uppercase tracking-[0.2em] text-surface/40 font-bold mb-3">Clientes Recentes</p>
                      <div className="flex flex-wrap gap-3">
                        {recentClients.map(client => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setSelectedClient(client.id);
                              setSearchTerm(client.name);
                            }}
                            className="flex items-center gap-2 p-1.5 pr-4 rounded-full bg-primary/40 border border-secondary/10 hover:border-secondary/40 hover:bg-secondary/5 transition-all group"
                          >
                            <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-[10px] font-bold border border-secondary/10 group-hover:bg-secondary group-hover:text-primary transition-all">
                              {client.name.charAt(0)}
                            </div>
                            <span className="text-[10px] font-bold text-surface/60 group-hover:text-surface transition-colors">{client.name.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Product Selection */}
              <section className="glass-card rounded-3xl p-6 border border-secondary/10">
                <div className="flex items-center gap-3 mb-6 border-b border-secondary/5 pb-3">
                  <ShoppingBag className="w-4 h-4 text-secondary" />
                  <h3 className="text-surface text-[10px] font-bold uppercase tracking-[0.2em]">Produtos em Estoque</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar-dark">
                  {products.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProductToSale(product)}
                      className="flex flex-col items-center p-3 rounded-xl border border-secondary/10 hover:border-secondary/40 hover:bg-secondary/5 transition-all text-center group"
                    >
                      <div className="w-full aspect-square rounded-lg bg-primary/40 mb-2 overflow-hidden border border-secondary/5">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-surface/20">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-tighter line-clamp-1 mb-1">{product.name}</span>
                      <span className="text-xs text-secondary font-bold">R$ {product.sale_price.toLocaleString('pt-BR')}</span>
                      <span className="text-[8px] text-surface/60 mt-1 uppercase tracking-widest">{product.stock} un.</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Checkout Summary */}
            <div className="space-y-6">
              <section className="glass-card rounded-3xl p-6 sticky top-24 border border-secondary/10 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 border-b border-secondary/5 pb-3">
                  <History className="w-4 h-4 text-secondary" />
                  <h3 className="text-surface text-[10px] font-bold uppercase tracking-[0.2em]">Resumo da Venda</h3>
                </div>
                
                {/* Selected Products List */}
                <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar-dark">
                  <AnimatePresence>
                    {selectedProducts.length === 0 ? (
                      <div className="py-10 text-center">
                        <ShoppingBag className="w-8 h-8 text-secondary/10 mx-auto mb-2" />
                        <p className="text-surface/30 text-[10px] font-bold uppercase tracking-widest">Carrinho Vazio</p>
                      </div>
                    ) : (
                      selectedProducts.map(item => (
                        <motion.div 
                          key={item.product.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-primary/20 border border-secondary/5 group/item"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-tighter truncate text-surface/80 group-hover/item:text-secondary transition-colors">{item.product.name}</p>
                            <p className="text-xs text-secondary font-bold">R$ {(item.product.sale_price * item.quantity).toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button" 
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="w-7 h-7 rounded-xl border border-secondary/10 flex items-center justify-center text-surface/40 hover:text-secondary hover:border-secondary/30 transition-all bg-primary/40"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                            <button 
                              type="button" 
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="w-7 h-7 rounded-xl border border-secondary/10 flex items-center justify-center text-surface/40 hover:text-secondary hover:border-secondary/30 transition-all bg-primary/40"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => removeProductFromSale(item.product.id)}
                              className="ml-1 p-2 text-rose-500/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Totals & Payment */}
                <div className="space-y-4 pt-4 border-t border-secondary/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-widest text-surface/60">Total</span>
                    <span className="text-xl font-headline italic text-surface font-bold">R$ {totalAmount.toLocaleString('pt-BR')}</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Método de Pagamento</label>
                    <select 
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-primary/40 border border-secondary/20 rounded-lg py-2 px-3 text-sm text-surface focus:outline-none focus:border-secondary"
                    >
                      <option value="pix">PIX</option>
                      <option value="cartao">Cartão de Crédito</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="crediario">Crediário / Fiado</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Valor Recebido (R$)</label>
                    <input 
                      type="text" 
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(maskCurrency(e.target.value))}
                      className="w-full bg-primary/40 border border-secondary/20 rounded-lg py-2 px-3 text-sm text-surface focus:outline-none focus:border-secondary"
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Data da Venda</label>
                    <input 
                      type="date" 
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full bg-primary/40 border border-secondary/20 rounded-lg py-2 px-3 text-sm text-surface focus:outline-none focus:border-secondary"
                    />
                  </div>

                  {(paymentMethod === 'crediario' || (totalAmount - (parseCurrency(amountPaid) || 0) > 0)) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-4 border-t border-secondary/10"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Número de Parcelas</label>
                        <select 
                          value={installmentsCount}
                          onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                          className="w-full bg-primary/40 border border-secondary/20 rounded-lg py-2 px-3 text-sm text-surface focus:outline-none focus:border-secondary"
                        >
                          {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                            <option key={n} value={n}>{n}x</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Vencimentos</label>
                        {installmentDueDates.map((date, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] text-surface/60 w-6">{idx + 1}ª</span>
                            <input 
                              type="date" 
                              value={date}
                              onChange={(e) => {
                                const newDates = [...installmentDueDates];
                                newDates[idx] = e.target.value;
                                setInstallmentDueDates(newDates);
                              }}
                              className="flex-1 bg-primary/40 border border-secondary/20 rounded-lg py-1 px-2 text-xs text-surface focus:outline-none focus:border-secondary"
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <button 
                    type="submit" 
                    disabled={saving || selectedProducts.length === 0}
                    className="w-full py-4 rounded-xl bg-secondary text-primary hover:bg-secondary/90 transition-colors text-sm font-bold uppercase tracking-widest shadow-lg shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {saving ? 'Processando...' : 'Finalizar Venda'}
                  </button>
                </div>
              </section>
            </div>
          </form>
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
