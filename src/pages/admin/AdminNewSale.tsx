import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  History, 
  ChevronDown, 
  ShoppingBag, 
  ShoppingCart,
  Plus, 
  Minus, 
  Trash2, 
  Image as ImageIcon,
  Menu,
  Search, 
  X,
  ArrowLeft,
  Star,
  Check,
  Layers,
  Wallet,
  Package,
  Gem,
  Flame,
  Footprints,
  Filter,
  UserCheck
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'motion/react';
import NotificationModal from '../../components/NotificationModal';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import ProductImage from '../../components/ProductImage';
import { maskCurrency, parseCurrency, formatCurrency } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDropdown } from '../../components/CustomDropdown';

interface Product {
  id: string;
  name: string;
  sale_price: number;
  stock: number;
  image_url?: string;
  colors?: string[] | string | null;
  color?: string | null;
  published?: boolean;
  category?: string | null;
  sku?: string | null;
  model?: string | null;
  brand?: string | null;
  description?: string | null;
}

const getCategoryIcon = (category: string) => {
  const lower = (category || '').toLowerCase();
  if (lower === 'todos') return Layers;
  if (lower.includes('bolsa')) return ShoppingBag;
  if (lower.includes('carteira')) return Wallet;
  if (lower.includes('kit')) return Package;
  if (lower.includes('promo')) return Flame;
  if (lower.includes('acess') || lower.includes('bijut') || lower.includes('joia')) return Gem;
  if (lower.includes('calçado') || lower.includes('sapato') || lower.includes('chinelo')) return Footprints;
  return Filter;
};

const getProductColors = (product: Product): string[] => {
  if (Array.isArray(product.colors)) {
    return product.colors.filter(Boolean);
  }
  if (typeof product.colors === 'string' && product.colors.trim()) {
    return product.colors.split(',').map(c => c.trim()).filter(Boolean);
  }
  if (product.color) {
    return [product.color.trim()];
  }
  return ['Única'];
};

interface Client {
  id: string;
  name: string;
  phone: string;
  photo_url?: string;
  image_url?: string;
  status?: string;
  payment_status?: string;
  is_vip?: boolean;
}

export default function AdminNewSale() {
  const { isDesktopSidebarCollapsed } = useTheme();
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [productSelectedColors, setProductSelectedColors] = useState<Record<string, string>>({});

  // Product Detail Modal States
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [modalColor, setModalColor] = useState<string>('');
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [isCartModalOpen, setIsCartModalOpen] = useState<boolean>(false);

  const availableCategories = useMemo(() => {
    const dynamicCats = Array.from(
      new Set(
        products
          .map(p => p.category?.trim())
          .filter((c): c is string => Boolean(c))
      )
    );
    const defaultList = ['Todos', 'Bolsas', 'Carteiras', 'Kits', 'Promoções', 'Acessórios'];
    return Array.from(new Set(['Todos', ...dynamicCats, ...defaultList.filter(c => c !== 'Todos')]));
  }, [products]);

  const handleNextCategory = () => {
    const currentIndex = availableCategories.indexOf(selectedCategory);
    const nextIndex = (currentIndex + 1) % availableCategories.length;
    setSelectedCategory(availableCategories[nextIndex]);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const term = productSearchTerm.trim().toLowerCase();
      const matchesSearch = !term || 
        product.name.toLowerCase().includes(term) ||
        (product.sku && product.sku.toLowerCase().includes(term)) ||
        (product.model && product.model.toLowerCase().includes(term)) ||
        (product.brand && product.brand.toLowerCase().includes(term)) ||
        (product.category && product.category.toLowerCase().includes(term));

      const matchesCategory = selectedCategory === 'Todos' || 
        (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [products, productSearchTerm, selectedCategory]);
  
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<{ product: Product; quantity: number; color: string }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [amountPaid, setAmountPaid] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [installmentDueDates, setInstallmentDueDates] = useState<string[]>([]);

  const totalCartItems = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
  }, [selectedProducts]);

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
      setLoading(true);
      let loadedProducts: any[] = [];
      let loadedClients: any[] = [];

      if (isSupabaseConfigured) {
        try {
          const [productsRes, clientsRes] = await Promise.all([
            supabase.from('products').select('*').gt('stock', 0),
            supabase.from('clients').select('*').order('created_at', { ascending: false })
          ]);

          if (!productsRes.error && productsRes.data) loadedProducts = productsRes.data;
          if (!clientsRes.error && clientsRes.data) loadedClients = clientsRes.data;
        } catch {
          // fallback below
        }
      }

      if (loadedProducts.length === 0) {
        const fallProducts = await api.products.getAll();
        loadedProducts = fallProducts.filter(p => (p.stock || 0) > 0);
      }

      if (loadedClients.length === 0) {
        loadedClients = await api.clients.getAll();
      }

      setProducts(loadedProducts);
      setClients(loadedClients);
      setRecentClients(loadedClients.slice(0, 3));
      setFilteredClients(loadedClients.slice(0, 3));

    } catch {
      const fallProducts = await api.products.getAll();
      const fallClients = await api.clients.getAll();
      setProducts(fallProducts);
      setClients(fallClients);
      setRecentClients(fallClients.slice(0, 3));
      setFilteredClients(fallClients.slice(0, 3));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      setFilteredClients(recentClients);
      return;
    }

    const filtered = clients.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.phone && c.phone.includes(term))
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients, recentClients]);

  const getActiveColor = (product: Product) => {
    const colors = getProductColors(product);
    return productSelectedColors[product.id] || colors[0] || 'Única';
  };

  const handleSelectColor = (productId: string, color: string) => {
    setProductSelectedColors(prev => ({
      ...prev,
      [productId]: color
    }));
  };

  const getProductCartCount = (productId: string) => {
    return selectedProducts
      .filter(p => p.product.id === productId)
      .reduce((sum, p) => sum + p.quantity, 0);
  };

  const getProductColorCartCount = (productId: string, color: string) => {
    return selectedProducts
      .filter(p => p.product.id === productId && p.color === color)
      .reduce((sum, p) => sum + p.quantity, 0);
  };

  const openProductModal = (product: Product, initialColor?: string) => {
    setDetailProduct(product);
    const colors = getProductColors(product);
    const chosenColor = initialColor || productSelectedColors[product.id] || colors[0] || 'Única';
    setModalColor(chosenColor);
    
    // Check if this product/color is already in the cart
    const inCart = selectedProducts.find(p => p.product.id === product.id && p.color === chosenColor);
    setModalQuantity(inCart ? inCart.quantity : 1);
  };

  const handleModalColorChange = (color: string) => {
    setModalColor(color);
    if (!detailProduct) return;
    const inCart = selectedProducts.find(p => p.product.id === detailProduct.id && p.color === color);
    setModalQuantity(inCart ? inCart.quantity : 1);
  };

  const handleConfirmModalAdd = (finishSaleDirectly: boolean = false) => {
    if (!detailProduct) return;

    if (!selectedClient) {
      setModalConfig({
        isOpen: true,
        title: 'Selecione a Cliente',
        message: 'Por favor, selecione uma cliente antes de adicionar produtos à venda.',
        type: 'warning'
      });
      return;
    }

    // Calculate total across other colors of this product
    const otherColorsQty = selectedProducts
      .filter(item => item.product.id === detailProduct.id && item.color !== modalColor)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (modalQuantity + otherColorsQty > detailProduct.stock) {
      setModalConfig({
        isOpen: true,
        title: 'Estoque Insuficiente',
        message: `Apenas ${detailProduct.stock} unidades disponíveis no total para "${detailProduct.name}".`,
        type: 'warning'
      });
      return;
    }

    const existingIndex = selectedProducts.findIndex(
      p => p.product.id === detailProduct.id && p.color === modalColor
    );

    if (existingIndex >= 0) {
      const updated = [...selectedProducts];
      updated[existingIndex].quantity = modalQuantity;
      setSelectedProducts(updated);
    } else {
      setSelectedProducts([
        ...selectedProducts,
        { product: detailProduct, quantity: modalQuantity, color: modalColor }
      ]);
    }

    // Sync active color in card
    handleSelectColor(detailProduct.id, modalColor);

    const productName = detailProduct.name;
    const qty = modalQuantity;
    const col = modalColor;
    const subtotal = (detailProduct.sale_price * modalQuantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    setDetailProduct(null);

    if (finishSaleDirectly) {
      toast.success(`${productName} adicionado! Abrindo finalização...`, {
        description: `${qty}x ${col} • R$ ${subtotal}`
      });
      setIsCartModalOpen(true);
    } else {
      toast.success(`${productName} adicionado ao carrinho!`, {
        description: `${qty}x ${col} • R$ ${subtotal}`
      });
    }
  };

  const addProductToSale = (product: Product, color?: string) => {
    openProductModal(product, color);
  };

  const removeProductFromSale = (productId: string, color: string) => {
    setSelectedProducts(prev => prev.filter(p => !(p.product.id === productId && p.color === color)));
    toast.info('Item desmarcado/removido do carrinho.');
  };

  const updateQuantity = (productId: string, color: string, delta: number) => {
    setSelectedProducts(prev => {
      const item = prev.find(p => p.product.id === productId && p.color === color);
      if (!item) return prev;

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        toast.info(`"${item.product.name}" (${item.color}) desmarcado do carrinho.`);
        return prev.filter(p => !(p.product.id === productId && p.color === color));
      }

      // Calculate total across other colors
      const otherColorsQty = prev
        .filter(p => p.product.id === productId && p.color !== color)
        .reduce((sum, p) => sum + p.quantity, 0);

      if (newQty + otherColorsQty > item.product.stock) {
        setModalConfig({
          isOpen: true,
          title: 'Estoque Insuficiente',
          message: `Apenas ${item.product.stock} unidades disponíveis no estoque para "${item.product.name}".`,
          type: 'warning'
        });
        return prev;
      }

      return prev.map(p => (p.product.id === productId && p.color === color) ? { ...p, quantity: newQty } : p);
    });
  };

  const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.product.sale_price * p.quantity), 0);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
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
      const paidVal = parseCurrency(amountPaid);
      const saleStatus = paidVal >= totalAmount ? 'pago' : 'pendente';
      const balance = totalAmount - paidVal;
      const clientObj = clients.find(c => c.id === selectedClient);
      let finalSaleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 1. Attempt to save to Supabase if configured
      if (isSupabaseConfigured) {
        try {
          const { data: sale, error: saleError } = await supabase.from('sales').insert({
            client_id: selectedClient,
            total_amount: totalAmount,
            amount_paid: paidVal,
            payment_method: paymentMethod,
            sale_date: saleDate,
            status: saleStatus
          }).select('id').single();

          if (!saleError && sale?.id) {
            finalSaleId = sale.id;

            // 2. Create Sale Items in Supabase
            const saleItemsData = selectedProducts.map(item => ({
              sale_id: finalSaleId,
              product_id: item.product.id,
              quantity: item.quantity,
              unit_price: item.product.sale_price
            }));
            await supabase.from('sale_items').insert(saleItemsData);

            // Deduct stock in Supabase
            for (const item of selectedProducts) {
              const newStock = Math.max(0, item.product.stock - item.quantity);
              await supabase.from('products').update({ 
                stock: newStock,
                published: newStock > 0 ? item.product.published : false
              }).eq('id', item.product.id);
            }

            // Create installments in Supabase if balance > 0
            if (balance > 0) {
              try {
                await supabase
                  .from('clients')
                  .update({ payment_status: 'Inadimplente' })
                  .eq('id', selectedClient);
              } catch {}

              const installmentAmount = balance / installmentsCount;
              const installmentsData = installmentDueDates.map(date => ({
                sale_id: finalSaleId,
                client_id: selectedClient,
                amount: installmentAmount,
                due_date: date,
                status: 'pendente'
              }));
              await supabase.from('installments').insert(installmentsData);
            }
          }
        } catch (supaErr) {
          console.warn('Supabase offline or failed, persisting sale locally:', supaErr);
        }
      }

      // 2. Always persist to localStorage (Double Backup / Offline Guarantee)
      try {
        const localSales = JSON.parse(localStorage.getItem('vc_sales') || '[]');
        const newLocalSale = {
          id: finalSaleId,
          client_id: selectedClient,
          total_amount: totalAmount,
          amount_paid: paidVal,
          payment_method: paymentMethod,
          sale_date: saleDate,
          created_at: new Date().toISOString(),
          status: saleStatus,
          clients: clientObj ? { name: clientObj.name, status: clientObj.status, phone: clientObj.phone } : null,
          sale_items: selectedProducts.map(item => ({
            sale_id: finalSaleId,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.sale_price,
            products: item.product
          })),
          sale_installments: balance > 0 ? installmentDueDates.map(date => ({
            amount: balance / installmentsCount,
            due_date: date,
            status: 'pendente'
          })) : []
        };
        localStorage.setItem('vc_sales', JSON.stringify([newLocalSale, ...localSales.filter((s: any) => s.id !== finalSaleId)]));

        // Deduct stock in localStorage
        const localProducts = JSON.parse(localStorage.getItem('vc_products') || '[]');
        if (localProducts.length > 0) {
          const updatedProds = localProducts.map((p: any) => {
            const found = selectedProducts.find(sp => sp.product.id === p.id);
            if (found) {
              const newStock = Math.max(0, (p.stock || 0) - found.quantity);
              return { ...p, stock: newStock, published: newStock > 0 ? p.published : false };
            }
            return p;
          });
          localStorage.setItem('vc_products', JSON.stringify(updatedProds));
        }

        // Save installments in localStorage
        if (balance > 0) {
          const localInst = JSON.parse(localStorage.getItem('vc_installments') || '[]');
          const newInst = installmentDueDates.map(date => ({
            id: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            sale_id: finalSaleId,
            client_id: selectedClient,
            amount: balance / installmentsCount,
            due_date: date,
            status: 'pendente'
          }));
          localStorage.setItem('vc_installments', JSON.stringify([...newInst, ...localInst]));
        }
      } catch (localErr) {
        console.error('LocalStorage write error:', localErr);
      }

      setIsCartModalOpen(false);
      setSelectedProducts([]);
      setAmountPaid('');

      setModalConfig({
        isOpen: true,
        title: 'Venda Realizada!',
        message: 'A venda foi registrada com sucesso e os dados foram salvos com segurança.',
        type: 'success'
      });
      
      setTimeout(() => navigate('/admin/sales'), 1800);
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
    <div className="min-h-screen global-bg text-surface font-body flex flex-col selection:bg-secondary selection:text-primary">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className={`flex-1 min-w-0 p-0 pb-28 ${isDesktopSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px]'} transition-all duration-300`}>
        {/* Top Navbar Header */}
        <header className={`fixed top-0 left-0 right-0 ${isDesktopSidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[240px]'} z-30 flex items-center justify-between px-4 sm:px-6 py-4 bar-fume transition-all duration-300 border-b border-white/5`}>
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <MenuButton onClick={() => setIsSidebarOpen(true)} />
            </div>
            <button 
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-surface/70 hover:text-secondary transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Header Cart Button with Counter (Único botão de carrinho da tela) */}
            <button
              type="button"
              onClick={() => setIsCartModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-secondary text-primary font-bold uppercase tracking-wider text-xs transition-all flex items-center gap-2 relative cursor-pointer active:scale-95 shadow-md hover:bg-white hover:text-primary"
              title="Abrir Carrinho e Finalizar Venda"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden xs:inline">Carrinho</span>
              {totalCartItems > 0 && (
                <span className="min-w-4.5 h-4.5 px-1 bg-primary text-secondary rounded-full text-[9px] font-black flex items-center justify-center shadow-sm">
                  {totalCartItems}
                </span>
              )}
            </button>
            <NotificationSino />
          </div>
        </header>

        {/* Main Content Area Padronizada com as outras telas */}
        <div className="px-4 sm:px-6 lg:px-10 max-w-[1600px] mx-auto pt-24 w-full">
          
          {/* Header da Página e Ações do Topo */}
          <div className="mb-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-headline text-2xl sm:text-3xl italic tracking-tight">Nova Venda <span className="text-secondary">VC</span></h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-bold">
                    {filteredProducts.length} de {products.length} itens
                  </span>
                  {selectedClient && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {clients.find(c => c.id === selectedClient)?.name}
                    </span>
                  )}
                </div>
                <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
                  Catálogo completo, seleção de peças e emissão rápida de vendas
                </p>
              </div>
            </div>
            
            {/* Action Controls: Botões de Pesquisa de Cliente e Histórico Lado a Lado com Proporções Otimizadas */}
            <div className="flex items-center gap-2 sm:gap-3 w-full">
              {/* 1. Botão Selecionar / Trocar Cliente (Maior Comprimento para acomodar o texto completo) */}
              {!selectedClient ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setShowSuggestions(true);
                  }}
                  className="flex-1 min-w-0 h-11 sm:h-13 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl border border-secondary/35 bg-primary/40 backdrop-blur-md hover:border-secondary hover:bg-secondary/10 text-surface/90 hover:text-secondary font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-between gap-1.5 sm:gap-3 shadow-md cursor-pointer group active:scale-98"
                  title="Selecionar Cliente para a Venda"
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                    </div>
                    <span className="font-bold text-white group-hover:text-secondary text-xs sm:text-sm whitespace-nowrap">
                      Selecionar Cliente
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary/60 group-hover:text-secondary group-hover:translate-y-0.5 transition-transform shrink-0" />
                </button>
              ) : (
                <div className="flex-1 min-w-0 h-11 sm:h-13 flex items-center justify-between bg-primary/40 backdrop-blur-md border border-secondary/40 rounded-xl sm:rounded-2xl px-2.5 sm:px-3.5 shadow-md">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setShowSuggestions(true);
                    }}
                    className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 text-left cursor-pointer hover:opacity-85 transition-opacity"
                    title="Clique para trocar o cliente"
                  >
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md border border-[#D4AF37] overflow-hidden bg-[#151E3F]">
                        {(clients.find(c => c.id === selectedClient)?.photo_url || clients.find(c => c.id === selectedClient)?.image_url) ? (
                          <img 
                            src={clients.find(c => c.id === selectedClient)?.photo_url || clients.find(c => c.id === selectedClient)?.image_url} 
                            alt={clients.find(c => c.id === selectedClient)?.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[#D4AF37] font-headline text-xs sm:text-sm font-bold">
                            {clients.find(c => c.id === selectedClient)?.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {clients.find(c => c.id === selectedClient)?.is_vip && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-secondary rounded-full flex items-center justify-center shadow border border-primary">
                          <Star className="w-1.5 h-1.5 text-primary fill-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 pr-0.5">
                      <span className="text-white font-headline text-xs sm:text-sm font-bold truncate">
                        {clients.find(c => c.id === selectedClient)?.name}
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-secondary font-bold uppercase tracking-wider truncate flex items-center gap-0.5">
                        Trocar <span className="opacity-60">↻</span>
                      </span>
                    </div>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedClient('');
                      setSearchTerm('');
                      toast.info('Cliente removido da venda.');
                    }}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/5 hover:bg-rose-500/20 text-surface/40 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-0.5"
                    title="Remover cliente"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 2. Botão Histórico de Vendas (Comprimento Compacto para equilibrar com o botão de cliente) */}
              <Link 
                to="/admin/sales" 
                className="shrink-0 h-11 sm:h-13 px-3 sm:px-4 rounded-xl sm:rounded-2xl border border-secondary/30 text-surface hover:text-secondary hover:border-secondary/60 hover:bg-secondary/10 font-bold uppercase tracking-wider text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 bg-primary/40 backdrop-blur-md shadow-md active:scale-98 group"
                title="Ver Histórico Completo de Vendas"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 group-hover:rotate-[-12deg] transition-transform">
                  <History className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                </div>
                <span className="whitespace-nowrap font-bold">Histórico</span>
              </Link>
            </div>
          </div>

          {/* Catalog Section - Full Width Standard Layout */}
          <div className="space-y-4">
            {/* Filters Bar: Barra de Pesquisa e Botão de Filtro LADO A LADO SEMPRE */}
            <div className="glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-secondary/15 flex flex-row items-center justify-between gap-2 sm:gap-3 shadow-lg">
              {/* Barra de Pesquisa */}
              <div className="relative flex-1 min-w-0 group/search">
                <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-secondary/50 group-focus-within/search:text-secondary pointer-events-none transition-colors" />
                <input 
                  type="text"
                  placeholder="Buscar por nome, SKU, modelo..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="w-full bg-primary/60 border border-white/10 rounded-xl h-10 sm:h-11 pl-8.5 sm:pl-10 pr-7 sm:pr-9 text-xs sm:text-sm text-surface placeholder:text-surface/30 focus:outline-none focus:border-secondary transition-all shadow-inner"
                />
                {productSearchTerm && (
                  <button 
                    type="button"
                    onClick={() => setProductSearchTerm('')}
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-surface/40 hover:text-secondary cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Botão Único de Filtro que Alterna entre os Tipos de Produtos e Muda o Ícone (Lado a Lado) */}
              <button
                type="button"
                onClick={handleNextCategory}
                className="h-10 sm:h-11 px-2.5 sm:px-4.5 rounded-xl border border-secondary/40 bg-secondary/15 hover:bg-secondary hover:text-primary text-secondary transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 shadow-sm active:scale-95 cursor-pointer font-bold text-[10px] sm:text-xs uppercase tracking-wider group"
                title="Clique para alternar a categoria de produtos filtrada"
              >
                {React.createElement(getCategoryIcon(selectedCategory), {
                  className: "w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-secondary group-hover:text-primary transition-transform group-hover:rotate-12"
                })}
                <span className="whitespace-nowrap font-black">{selectedCategory}</span>
                <span className="text-[9px] sm:text-xs opacity-60">↻</span>
              </button>
            </div>

            {/* Products Grid Standard */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-16 text-center glass-card rounded-2xl border border-white/5">
                  <ShoppingBag className="w-12 h-12 text-secondary/20 mx-auto mb-3" />
                  <p className="text-surface/60 text-sm font-bold uppercase tracking-wider mb-1">
                    Nenhum produto encontrado
                  </p>
                  <p className="text-surface/40 text-xs">
                    Tente buscar por outro termo ou alternar o filtro de categoria.
                  </p>
                </div>
              ) : (
                filteredProducts.map(product => {
                  const colors = getProductColors(product);
                  const activeColor = getActiveColor(product);
                  const totalInCart = getProductCartCount(product.id);
                  const activeColorInCart = getProductColorCartCount(product.id, activeColor);

                  return (
                    <div
                      key={product.id}
                      className={`flex flex-col p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 relative group bg-[#0D1322]/90 backdrop-blur-md ${
                        totalInCart > 0 
                          ? 'border-secondary/60 shadow-[0_0_20px_rgba(244,192,37,0.15)] ring-1 ring-secondary/30' 
                          : 'border-secondary/15 hover:border-secondary/40 hover:bg-[#111A2E] shadow-md'
                      }`}
                    >
                      {/* Badge de quantidade no carrinho */}
                      {totalInCart > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 z-10 bg-secondary text-primary text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg border border-primary flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          <span>{totalInCart}</span>
                        </div>
                      )}

                      {/* Imagem e Dados da Peça */}
                      <div 
                        onClick={() => openProductModal(product, activeColor)}
                        className="cursor-pointer space-y-2 mb-2"
                        title="Clique para ver detalhes e fotos da peça"
                      >
                        {/* Imagem do Produto */}
                        <div className="w-full h-36 sm:h-44 rounded-xl bg-primary/60 overflow-hidden border border-secondary/15 shrink-0 relative shadow-md">
                          {product.image_url ? (
                            <ProductImage 
                              src={product.image_url} 
                              alt={product.name} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-surface/20 gap-1">
                              <ImageIcon className="w-8 h-8" />
                              <span className="text-[8px] uppercase font-bold">Sem Foto</span>
                            </div>
                          )}
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[8px] font-bold text-secondary border border-secondary/30">
                            {product.category || 'Geral'}
                          </span>
                          <span className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs text-[8px] text-center font-bold text-surface/90 py-0.5">
                            {product.stock} un. em estoque
                          </span>
                        </div>

                        {/* Dados Textuais */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            {product.brand && (
                              <span className="text-[8px] font-bold uppercase tracking-wider text-surface/50">
                                {product.brand}
                              </span>
                            )}
                            {product.sku && (
                              <span className="text-[8px] font-mono text-surface/40">
                                • {product.sku}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold uppercase tracking-tight text-white line-clamp-2 leading-tight group-hover:text-secondary transition-colors" title={product.name}>
                            {product.name}
                          </h4>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-sm sm:text-base font-bold text-secondary font-headline italic">
                              R$ {product.sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${product.stock <= 2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {product.stock} un.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Color Selector */}
                      <div className="mt-auto pt-2 border-t border-white/5 space-y-1.5">
                        {colors.length > 1 && (
                          <div className="flex items-center justify-between text-[8px] uppercase tracking-wider text-surface/50 font-bold">
                            <span>Cor:</span>
                            {activeColor && <span className="text-secondary font-black truncate max-w-[90px]">{activeColor}</span>}
                          </div>
                        )}
                        
                        {colors.length > 1 && (
                          <div className="flex flex-wrap gap-1">
                            {colors.slice(0, 3).map((color, idx) => {
                              const isSelected = activeColor === color;
                              const qtyThisColor = getProductColorCartCount(product.id, color);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSelectColor(product.id, color)}
                                  className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                                    isSelected
                                      ? 'bg-secondary text-primary font-black shadow-sm border border-secondary'
                                      : 'bg-white/5 text-surface/70 hover:bg-white/10 hover:text-white border border-white/10'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary' : 'bg-secondary'}`}></span>
                                  <span className="truncate max-w-[50px]">{color}</span>
                                  {qtyThisColor > 0 && (
                                    <span className={`text-[7px] px-0.5 rounded-full ${isSelected ? 'bg-primary text-secondary' : 'bg-secondary text-primary'}`}>
                                      {qtyThisColor}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                            {colors.length > 3 && (
                              <button
                                type="button"
                                onClick={() => openProductModal(product, activeColor)}
                                className="px-1 py-0.5 rounded-md text-[8px] text-surface/50 hover:text-secondary bg-white/5 font-bold cursor-pointer"
                              >
                                +{colors.length - 3}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Botão de Adição Rápida e Desmarcar do Carrinho */}
                        <div className="pt-1 flex items-center gap-1">
                          {activeColorInCart > 0 ? (
                            <div className="flex items-center justify-between w-full bg-secondary/15 border border-secondary/40 rounded-xl p-1 gap-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, activeColor, -1)}
                                className="w-6 h-6 rounded-lg bg-primary/60 text-secondary hover:bg-secondary hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
                                title={activeColorInCart === 1 ? "Desmarcar do carrinho" : "Diminuir quantidade"}
                              >
                                {activeColorInCart === 1 ? <Trash2 className="w-3 h-3 text-rose-400" /> : <Minus className="w-3 h-3" />}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => openProductModal(product, activeColor)}
                                className="flex items-center gap-1 text-center px-1 hover:opacity-80 cursor-pointer min-w-0 flex-1 justify-center"
                                title="Ver detalhes da peça"
                              >
                                <ShoppingCart className="w-3 h-3 text-secondary shrink-0" />
                                <span className="text-xs font-black text-white">{activeColorInCart}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => addProductToSale(product, activeColor)}
                                disabled={totalInCart >= product.stock}
                                className="w-6 h-6 rounded-lg bg-secondary text-primary hover:bg-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                                title="Adicionar mais um"
                              >
                                <Plus className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => removeProductFromSale(product.id, activeColor)}
                                className="w-6 h-6 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Desmarcar item do carrinho"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openProductModal(product, activeColor)}
                              disabled={totalInCart >= product.stock}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-secondary text-primary font-black text-[10px] sm:text-xs uppercase tracking-wider hover:bg-white hover:text-primary transition-all duration-200 active:scale-97 shadow-md shadow-secondary/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                              <span>Adicionar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Client Selection Modal Popup (Z-Index Elevado Z-[130] para abrir sobre qualquer modal) */}
      <AnimatePresence>
        {showSuggestions && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0B111D] border border-secondary/35 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh] glass-card"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-headline text-base italic text-white font-bold leading-tight">
                      {selectedClient ? 'Trocar Cliente' : 'Selecionar Cliente'}
                    </h3>
                    <p className="text-[9px] uppercase tracking-widest text-surface/50 font-semibold">Escolha a cliente desta venda</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-surface/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Search Bar */}
              <div className="p-3 border-b border-white/5 bg-primary/20">
                <div className="relative group/search">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/50 group-focus-within/search:text-secondary pointer-events-none" />
                  <input 
                    type="text"
                    placeholder="Buscar por nome ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full bg-[#0D1322] border border-secondary/25 rounded-xl h-9.5 pl-9.5 pr-8 text-xs sm:text-sm text-surface placeholder:text-surface/30 focus:outline-none focus:border-secondary transition-all"
                  />
                  {searchTerm && (
                    <button 
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface/40 hover:text-secondary cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Client List */}
              <div className="p-3 overflow-y-auto custom-scrollbar-dark max-h-[50vh] space-y-1.5">
                {filteredClients.length > 0 ? (
                  filteredClients.map(client => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setSelectedClient(client.id);
                        setSearchTerm(client.name);
                        setShowSuggestions(false);
                        toast.success(`Cliente "${client.name}" selecionado!`);
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                        selectedClient === client.id
                          ? 'bg-secondary/15 border-secondary shadow-md'
                          : 'bg-white/3 border-white/5 hover:bg-white/8 hover:border-secondary/30'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shadow border border-[#D4AF37] overflow-hidden bg-[#151E3F]">
                          {(client.photo_url || client.image_url) ? (
                            <img 
                              src={client.photo_url || client.image_url} 
                              alt={client.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-[#D4AF37] font-headline text-sm font-bold">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {client.is_vip && (
                          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-secondary rounded-full flex items-center justify-center shadow border border-primary">
                            <Star className="w-2 h-2 text-primary fill-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white font-headline text-xs sm:text-sm truncate font-bold">{client.name}</p>
                          {client.phone && (
                            <p className="text-[10px] text-surface/50 truncate">• {client.phone}</p>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className={`inline-flex px-1.5 py-0.2 rounded text-[7px] font-bold uppercase tracking-widest ${(client.status || 'Ativo') === 'Pendente' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {client.status || 'Ativo'}
                          </span>
                          {client.is_vip && (
                            <span className="text-[7px] text-secondary font-bold uppercase tracking-wider">Cliente VIP</span>
                          )}
                        </div>
                      </div>
                      {selectedClient === client.id && (
                        <Check className="w-4 h-4 text-secondary shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-5 bg-white/2 border border-white/5 rounded-xl text-center">
                    <p className="text-surface/50 text-xs font-bold mb-3">Nenhum cliente cadastrado com este nome</p>
                    <Link 
                      to="/admin/clients/new" 
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-secondary/30 text-secondary font-bold uppercase tracking-widest text-[10px] hover:bg-secondary/10 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Cadastrar Novo Cliente
                    </Link>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-white/10 bg-[#070D18] flex items-center justify-between">
                <Link 
                  to="/admin/clients/new" 
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-secondary hover:bg-secondary/10 text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface/70 text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNavigation />

      {/* Product Details & Selection Full-Screen Popup Modal */}
      <AnimatePresence>
        {detailProduct && (
          <div className="fixed inset-0 z-[110] bg-[#070D18] flex flex-col overflow-hidden text-surface font-body animate-in fade-in duration-200">
            {/* Header Tela Cheia */}
            <header className="h-14 sm:h-16 px-4 sm:px-6 bg-[#0B111D] border-b border-white/10 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDetailProduct(null)}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-surface/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Voltar ao catálogo"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-headline text-base sm:text-lg italic text-white font-bold leading-tight">
                    Detalhes do Produto
                  </h3>
                  <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-surface/50 font-semibold">
                    Seleção de cores e quantidade para a venda
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-surface/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Corpo Tela Cheia */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-dark p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4">
              {/* Card Principal com Foto e Info */}
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start bg-primary/30 p-4 sm:p-5 rounded-2xl border border-white/5 shadow-md">
                {/* Foto com Zoom e Tags */}
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-black/40 overflow-hidden border border-secondary/25 shrink-0 relative shadow-lg group">
                  {detailProduct.image_url ? (
                    <ProductImage 
                      src={detailProduct.image_url} 
                      alt={detailProduct.name} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-surface/30 gap-1">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-[9px] uppercase font-bold">Sem Foto</span>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[8px] font-bold text-secondary border border-secondary/30">
                    {detailProduct.category || 'Geral'}
                  </span>
                  <span className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs text-[8px] text-center font-bold text-surface/90 py-0.5">
                    {detailProduct.stock} un. disponíveis
                  </span>
                </div>

                {/* Info Textual */}
                <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left w-full">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    {detailProduct.brand && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-surface/70 text-[9px] font-bold uppercase tracking-wider border border-white/10">
                        {detailProduct.brand}
                      </span>
                    )}
                    {detailProduct.model && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-surface/70 text-[9px] font-bold uppercase tracking-wider border border-white/10">
                        {detailProduct.model}
                      </span>
                    )}
                  </div>

                  <h4 className="font-headline text-lg sm:text-2xl text-white italic font-bold leading-tight">
                    {detailProduct.name}
                  </h4>

                  {detailProduct.sku && (
                    <p className="text-[9px] text-surface/40 uppercase tracking-widest font-mono">
                      SKU: {detailProduct.sku}
                    </p>
                  )}

                  <div className="pt-1 flex items-baseline justify-center sm:justify-start gap-2">
                    <span className="text-2xl sm:text-3xl font-headline italic font-black text-secondary">
                      R$ {detailProduct.sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-surface/40 uppercase font-semibold">/ unidade</span>
                  </div>
                </div>
              </div>

              {/* Descrição se houver */}
              {detailProduct.description && (
                <div className="bg-primary/20 p-3.5 rounded-2xl border border-white/5">
                  <p className="text-[9px] uppercase tracking-widest text-surface/40 font-bold mb-1">Descrição da Peça</p>
                  <p className="text-xs text-surface/80 leading-relaxed font-sans">{detailProduct.description}</p>
                </div>
              )}

              {/* Seleção de Cores */}
              <div className="bg-primary/20 p-4 rounded-2xl border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-surface/70 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    Cores Disponíveis:
                  </label>
                  <span className="text-xs font-black text-secondary uppercase tracking-wider">{modalColor}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {getProductColors(detailProduct).map((c, i) => {
                    const isSelected = modalColor === c;
                    const inCartQty = getProductColorCartCount(detailProduct.id, c);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleModalColorChange(c)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-secondary text-primary font-black shadow-md border-secondary'
                            : 'bg-white/5 border-white/10 text-surface/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSelected ? 'bg-primary' : 'bg-secondary'}`}></span>
                          <span className="text-xs font-bold uppercase tracking-wider truncate">{c}</span>
                        </div>
                        {inCartQty > 0 && (
                          <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-primary text-secondary' : 'bg-secondary text-primary'}`}>
                            {inCartQty}x
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ajuste de Quantidade e Subtotal */}
              <div className="bg-primary/40 border border-secondary/25 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-surface/60 font-bold">Quantidade:</span>
                  <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                      disabled={modalQuantity <= 1}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-surface flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
                      title="Diminuir"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    
                    <span className="w-10 text-center font-headline text-xl italic font-black text-white">
                      {modalQuantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const otherColorsQty = selectedProducts
                          .filter(item => item.product.id === detailProduct.id && item.color !== modalColor)
                          .reduce((sum, item) => sum + item.quantity, 0);

                        if (modalQuantity + otherColorsQty < detailProduct.stock) {
                          setModalQuantity(q => q + 1);
                        } else {
                          toast.warning(`Limite de estoque atingido (${detailProduct.stock} un.).`);
                        }
                      }}
                      disabled={modalQuantity >= detailProduct.stock}
                      className="w-8 h-8 rounded-lg bg-secondary text-primary hover:bg-white flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer shadow-sm"
                      title="Aumentar"
                    >
                      <Plus className="w-4 h-4 font-black" />
                    </button>
                  </div>
                </div>

                {/* Subtotal Preview */}
                <div className="text-center sm:text-right">
                  <p className="text-[9px] uppercase tracking-widest text-surface/40 font-bold">Subtotal Desta Peça</p>
                  <p className="text-2xl font-headline italic font-black text-secondary leading-tight">
                    R$ {(detailProduct.sale_price * modalQuantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Rodapé Fixo Tela Cheia */}
            <footer className="p-3 sm:p-4 bg-[#0B111D] border-t border-white/10 shrink-0 shadow-2xl">
              <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailProduct(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-surface/70 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  {/* Opção de Desmarcar / Remover do Carrinho se já estiver adicionado */}
                  {selectedProducts.some(p => p.product.id === detailProduct.id && p.color === modalColor) && (
                    <button
                      type="button"
                      onClick={() => {
                        removeProductFromSale(detailProduct.id, modalColor);
                        setDetailProduct(null);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                      title="Desmarcar este produto do carrinho"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Desmarcar do Carrinho</span>
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmModalAdd(false)}
                    className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2.5 rounded-xl bg-secondary/15 hover:bg-secondary hover:text-primary text-secondary border border-secondary/40 font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{selectedProducts.some(p => p.product.id === detailProduct.id && p.color === modalColor) ? 'Atualizar Carrinho' : 'Adicionar ao Carrinho'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmModalAdd(true)}
                    className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl bg-secondary text-primary font-black text-[10px] sm:text-xs uppercase tracking-wider hover:bg-white hover:text-primary transition-all duration-200 active:scale-95 shadow-md shadow-secondary/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Finalizar Venda</span>
                  </button>
                </div>
              </div>
            </footer>
          </div>
        )}
      </AnimatePresence>

      {/* Full-Screen Cart & Checkout Popup Modal */}
      <AnimatePresence>
        {isCartModalOpen && (
          <div className="fixed inset-0 z-[110] bg-[#070D18] flex flex-col overflow-hidden text-surface font-body animate-in fade-in duration-200">
            {/* Top Header Tela Cheia */}
            <header className="h-14 sm:h-16 px-4 sm:px-6 bg-[#0B111D] border-b border-white/10 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCartModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-surface/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Voltar ao catálogo"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline text-base sm:text-xl italic font-bold text-white leading-tight">
                      Carrinho & Finalização <span className="text-secondary">VC</span>
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20 text-[9px] font-bold">
                      {totalCartItems} {totalCartItems === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-surface/50 font-semibold">
                    Revise os itens e conclua a venda
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCartModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-surface/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Main Content Tela Cheia */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-dark p-3 sm:p-6 max-w-5xl mx-auto w-full">
              {/* Banner do Cliente */}
              <div className="mb-4 bg-primary/30 border border-secondary/20 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md border border-[#D4AF37] overflow-hidden bg-[#151E3F] shrink-0">
                    {selectedClient && (clients.find(c => c.id === selectedClient)?.photo_url || clients.find(c => c.id === selectedClient)?.image_url) ? (
                      <img 
                        src={clients.find(c => c.id === selectedClient)?.photo_url || clients.find(c => c.id === selectedClient)?.image_url} 
                        alt={clients.find(c => c.id === selectedClient)?.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : selectedClient ? (
                      <span className="text-[#D4AF37] font-headline text-sm font-bold">
                        {clients.find(c => c.id === selectedClient)?.name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User className="w-5 h-5 text-secondary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest text-surface/50 font-bold">Cliente da Venda</p>
                    <h4 className="text-white font-headline text-sm sm:text-base font-bold truncate">
                      {selectedClient ? clients.find(c => c.id === selectedClient)?.name : 'Nenhum cliente selecionado'}
                    </h4>
                    {selectedClient && clients.find(c => c.id === selectedClient)?.phone && (
                      <p className="text-[10px] text-surface/50">{clients.find(c => c.id === selectedClient)?.phone}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSuggestions(true);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-secondary/30 text-secondary hover:bg-secondary hover:text-primary font-bold uppercase text-[9px] sm:text-[10px] tracking-wider transition-all shrink-0 cursor-pointer"
                >
                  {selectedClient ? 'Trocar Cliente' : 'Selecionar Cliente'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Coluna Esquerda: Itens do Carrinho */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="glass-card rounded-2xl p-3.5 sm:p-4 border border-secondary/15 shadow-md">
                    <div className="flex items-center justify-between border-b border-secondary/10 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-secondary" />
                        <h3 className="text-surface text-[11px] font-bold uppercase tracking-[0.2em]">Itens no Carrinho</h3>
                      </div>
                      <span className="text-xs text-secondary font-bold">
                        {selectedProducts.length} {selectedProducts.length === 1 ? 'peça selecionada' : 'peças selecionadas'}
                      </span>
                    </div>

                    {selectedProducts.length === 0 ? (
                      <div className="py-12 text-center">
                        <ShoppingBag className="w-10 h-10 text-secondary/20 mx-auto mb-2" />
                        <p className="text-surface/40 text-xs font-bold uppercase tracking-widest">Seu carrinho está vazio</p>
                        <p className="text-surface/30 text-[10px] mt-1 mb-4">Escolha produtos no catálogo para montar esta venda.</p>
                        <button
                          type="button"
                          onClick={() => setIsCartModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-secondary text-primary font-bold text-xs uppercase tracking-wider hover:bg-white transition-all cursor-pointer shadow-md"
                        >
                          Ver Produtos em Estoque
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[45vh] lg:max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar-dark">
                        {selectedProducts.map(item => (
                          <div 
                            key={`${item.product.id}-${item.color}`}
                            className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/30 border border-white/5 hover:border-secondary/20 transition-all"
                          >
                            <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden border border-white/10 shrink-0 relative">
                              {item.product.image_url ? (
                                <ProductImage 
                                  src={item.product.image_url} 
                                  alt={item.product.name} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-surface/20">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white uppercase tracking-tight truncate leading-tight">
                                {item.product.name}
                              </h4>
                              <p className="text-[9px] text-secondary font-semibold">
                                Cor: <span className="uppercase font-bold">{item.color}</span>
                              </p>
                              <p className="text-xs font-headline italic font-bold text-secondary">
                                R$ {(item.product.sale_price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-[8px] text-surface/40 font-normal font-sans ml-1">
                                  (R$ {item.product.sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} un.)
                                </span>
                              </p>
                            </div>

                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/5">
                              <button 
                                type="button" 
                                onClick={() => updateQuantity(item.product.id, item.color, -1)}
                                className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-surface/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                title="Diminuir"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-xs font-bold w-5 text-center text-white">{item.quantity}</span>
                              <button 
                                type="button" 
                                onClick={() => updateQuantity(item.product.id, item.color, 1)}
                                className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-surface/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                title="Aumentar"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => removeProductFromSale(item.product.id, item.color)}
                                className="ml-1 p-1 text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
                                title="Remover"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna Direita: Totais e Pagamento */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="glass-card rounded-2xl p-3.5 sm:p-4 border border-secondary/15 shadow-md space-y-3">
                    <div className="border-b border-secondary/10 pb-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-surface/60 font-bold">Total da Venda</span>
                      <span className="text-2xl font-headline italic font-black text-secondary">
                        R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-[0.2em] text-surface/60 font-bold">Método de Pagamento</label>
                      <CustomDropdown
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        options={[
                          { value: 'pix', label: 'PIX' },
                          { value: 'cartao', label: 'Cartão de Crédito' },
                          { value: 'dinheiro', label: 'Dinheiro' },
                          { value: 'crediario', label: 'Crediário / Fiado' }
                        ]}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-[0.2em] text-surface/60 font-bold">Valor Recebido (R$)</label>
                      <input 
                        type="text" 
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(maskCurrency(e.target.value))}
                        className="w-full bg-primary/40 border border-secondary/20 rounded-xl h-9 px-3 text-xs text-surface focus:outline-none focus:border-secondary"
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-[0.2em] text-surface/60 font-bold">Data da Venda</label>
                      <input 
                        type="date" 
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="w-full bg-primary/40 border border-secondary/20 rounded-xl h-9 px-3 text-xs text-surface focus:outline-none focus:border-secondary"
                      />
                    </div>

                    {(paymentMethod === 'crediario' || (totalAmount - (parseCurrency(amountPaid) || 0) > 0)) && (
                      <div className="space-y-2.5 pt-2 border-t border-secondary/10">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-[0.2em] text-surface/60 font-bold">Número de Parcelas</label>
                          <CustomDropdown
                            value={installmentsCount}
                            onChange={(val) => setInstallmentsCount(Number(val))}
                            options={[1, 2, 3, 4, 5, 6, 10, 12].map(n => ({ value: n, label: `${n}x` }))}
                          />
                        </div>

                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar-dark">
                          <label className="text-[9px] uppercase tracking-[0.2em] text-surface/60 font-bold">Vencimentos</label>
                          {installmentDueDates.map((date, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[9px] text-surface/60 w-5 font-bold">{idx + 1}ª</span>
                              <input 
                                type="date" 
                                value={date}
                                onChange={(e) => {
                                  const newDates = [...installmentDueDates];
                                  newDates[idx] = e.target.value;
                                  setInstallmentDueDates(newDates);
                                }}
                                className="flex-1 bg-primary/40 border border-secondary/20 rounded-lg h-8 px-2 text-[11px] text-surface focus:outline-none focus:border-secondary"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col gap-2">
                      <button 
                        type="button" 
                        onClick={handleSubmit}
                        disabled={saving || selectedProducts.length === 0}
                        className="w-full py-3 rounded-xl bg-secondary text-primary hover:bg-white hover:text-primary transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98 flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>{saving ? 'Processando Venda...' : 'Finalizar Venda Agora'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCartModalOpen(false)}
                        className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-surface/70 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Continuar Escolhendo Produtos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

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

