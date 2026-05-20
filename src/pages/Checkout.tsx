import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import BottomNavigation from '../components/BottomNavigation';
import OrderSuccessDialog from '../components/OrderSuccessDialog';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function Checkout() {
  const { items, updateQuantity, removeItem, getTotalPrice, getTotalItems, clearCart } = useCartStore();
  const navigate = useNavigate();
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('retirada'); 

  // Pagamento
  const [paymentOption, setPaymentOption] = useState('pix'); 
  const [cardType, setCardType] = useState('credito'); 
  const [installments, setInstallments] = useState('1');
  const [installmentDueDates, setInstallmentDueDates] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const subtotal = getTotalPrice();
  const shippingCost = deliveryOption === 'motoboy' ? 15 : 0;
  const total = subtotal + shippingCost;
  const isCrediario = paymentOption === 'fiado';
  const isCreditCard = paymentOption === 'cartao' && cardType === 'credito';
  const showPaymentPlan = isCrediario || paymentOption === 'cartao';
  const showInstallments = isCrediario || isCreditCard;
  const installmentCount = showInstallments ? parseInt(installments) : 1;
  const installmentAmount = total / installmentCount;

  const getDefaultDueDates = (count: number) => {
    const today = new Date();
    return Array.from({ length: count }, (_, index) => {
      const dueDate = new Date(today);
      dueDate.setMonth(today.getMonth() + index + 1);
      return dueDate.toISOString().split('T')[0];
    });
  };

  useEffect(() => {
    if (!showInstallments) {
      setInstallmentDueDates([]);
      return;
    }

    setInstallmentDueDates(getDefaultDueDates(installmentCount));
  }, [showInstallments, installmentCount]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim() || !birthDay || !birthMonth) {
      toast.error('Preencha os dados obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    const formattedBirthday = `${birthDay.padStart(2, '0')}/${birthMonth}`;

    try {
      let clientId = null;
      const { data: existingClients } = await supabase.from('clients').select('id').eq('phone', customerPhone).limit(1);

      if (existingClients && existingClients.length > 0) {
        clientId = existingClients[0].id;
        await supabase.from('clients').update({ birthday: formattedBirthday }).eq('id', clientId);
      } else {
        const { data: newClient, error: clientErr } = await supabase.from('clients').insert({
          name: customerName, phone: customerPhone, birthday: formattedBirthday, status: 'Pendente'
        }).select('id').single();
        if (clientErr) throw clientErr;
        clientId = newClient.id;
      }

      const { data: newSale, error: saleErr } = await supabase.from('sales').insert({
        client_id: clientId,
        total_amount: total,
        status: 'solicitado',
        payment_method: isCrediario ? 'crediario' : paymentOption,
        installments: installmentCount,
        sale_date: new Date().toISOString().split('T')[0]
      }).select('id').single();
      if (saleErr) throw saleErr;

      const saleItems = items.map(item => ({ sale_id: newSale.id, product_id: item.id, quantity: item.quantity, unit_price: item.price }));
      await supabase.from('sale_items').insert(saleItems);

      // Notificação Realtime
      await supabase.from('notifications').insert([{
        type: 'venda',
        title: isCrediario ? 'Novo Crediário Valle Chic 💳' : 'Novo Pedido 🛍️',
        message: isCrediario
          ? `${customerName} solicitou R$ ${total.toFixed(2)} no Crediário (${installmentCount}x)`
          : `${customerName} solicitou R$ ${total.toFixed(2)} via ${paymentOption.toUpperCase()}`,
        priority: 'high',
        is_read: false
      }]);

      // Mensagem WhatsApp
      let wpMsg = `*NOVO PEDIDO - Valle Chic*\n\n`;
      wpMsg += `*Status:* 🟦 SOLICITADO\n`;
      wpMsg += `*Cliente:* ${customerName}\n`;
      wpMsg += `*Pagamento:* ${isCrediario ? '💳 CREDIÁRIO VALLE CHIC' : paymentOption === 'cartao' ? `CARTÃO ${cardType.toUpperCase()}` : paymentOption.toUpperCase()}\n`;
      
      if (showInstallments) {
        wpMsg += `*Parcelas:* ${installmentCount}x de R$ ${installmentAmount.toFixed(2).replace('.', ',')}\n`;
        installmentDueDates.forEach((date, index) => {
          wpMsg += `*Vencimento ${index + 1}:* ${new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')}\n`;
        });
      }
      
      wpMsg += `*Entrega:* ${deliveryOption === 'retirada' ? 'Retirada' : 'Motoboy'}\n\n`;
      wpMsg += `*ITENS:*\n`;
      items.forEach(i => wpMsg += `- ${i.quantity}x ${i.name} (R$ ${i.price.toFixed(2)})\n`);
      wpMsg += `\n*TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*`;
      
      window.open(`https://wa.me/5532991647440?text=${encodeURIComponent(wpMsg)}`, '_blank');

      clearCart();
      setShowSuccessDialog(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-sans flex flex-col pb-24">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 py-6 bar-fume border-b border-white/5">
        <Link to="/catalog" className="text-secondary mr-4"><span className="material-symbols-outlined">arrow_back</span></Link>
        <h1 className="font-headline italic text-2xl">Finalizar Pedido</h1>
      </header>

      <main className="flex-grow px-4 space-y-6 max-w-3xl mx-auto w-full pt-28">
        {/* Itens do pedido */}
        <section className="space-y-4">
          {items.length === 0 ? (
            <div className="glass-card rounded-[32px] p-8 text-center border border-white/5 bg-[#0B111D]/40">
              <p className="text-surface/50 text-sm">Sua sacola está vazia.</p>
              <Link to="/catalog" className="inline-flex mt-4 px-5 py-3 rounded-xl bg-secondary text-primary text-[10px] font-black uppercase tracking-widest">
                Ver catálogo
              </Link>
            </div>
          ) : items.map(item => (
            <div key={item.id} className="glass-card rounded-[32px] p-4 sm:p-5 border border-white/5 bg-[#0B111D]/40 flex gap-4 relative overflow-hidden">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[24px] bg-white overflow-hidden shrink-0">
                <img src={item.image || 'https://picsum.photos/seed/product/300/300'} alt={item.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <h2 className="text-lg sm:text-2xl font-black text-surface leading-tight truncate">{item.name}</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.color ? (
                    <span className="px-3 py-2 rounded-xl bg-secondary/20 text-surface/80 text-[10px] font-black uppercase tracking-widest">
                      {item.color}
                    </span>
                  ) : null}
                  {(item.model || item.brand) ? (
                    <span className="px-3 py-2 rounded-xl bg-secondary/20 text-surface/80 text-[10px] font-black uppercase tracking-widest">
                      {item.model || item.brand}
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-full bg-white/10 overflow-hidden">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-10 h-10 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <span className="w-8 text-center text-sm font-black text-surface">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-10 h-10 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-secondary whitespace-nowrap">
                    R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
              <button onClick={() => removeItem(item.id)} className="absolute top-4 right-4 text-surface/40 hover:text-rose-400 transition-colors">
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>
          ))}
        </section>

        <div className="glass-card rounded-[32px] p-6 border border-white/5 space-y-8 bg-[#0B111D]/40 backdrop-blur-md">
          
          {/* Identificação */}
          <section className="space-y-4">
            <div className="flex items-center gap-3"><div className="w-1.5 h-6 bg-secondary rounded-full shadow-[0_0_15px_rgba(255,215,0,0.4)]" /><h2 className="font-headline italic text-2xl">Seus Dados</h2></div>
            <div className="space-y-4">
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-primary/60 rounded-2xl px-5 py-4 text-sm outline-none border border-white/5" placeholder="Nome Completo *" />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-primary/60 rounded-2xl px-5 py-4 text-sm outline-none border border-white/5" placeholder="WhatsApp *" />
              <div className="grid grid-cols-3 gap-3">
                <input type="number" placeholder="Dia" value={birthDay} onChange={e => setBirthDay(e.target.value.slice(0,2))} className="bg-primary/60 rounded-2xl px-5 py-4 text-sm text-center outline-none border border-white/5" />
                <select value={birthMonth} onChange={e => setBirthMonth(e.target.value)} className="col-span-2 bg-primary/60 rounded-2xl px-5 py-4 text-sm outline-none border border-white/5 appearance-none">
                  <option value="" disabled>Mês Aniversário *</option>
                  {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                    <option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Forma de Entrega */}
          <section className="space-y-4">
            <div className="flex items-center gap-3"><div className="w-1.5 h-6 bg-secondary rounded-full shadow-[0_0_15px_rgba(255,215,0,0.4)]" /><h2 className="font-headline italic text-2xl">Forma de Entrega</h2></div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setDeliveryOption('retirada')}
                className={`flex items-center gap-4 rounded-[24px] border p-5 text-left transition-all ${deliveryOption === 'retirada' ? 'border-secondary bg-secondary/5 shadow-[0_0_18px_rgba(255,215,0,0.12)]' : 'border-white/5 bg-white/5'}`}
              >
                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${deliveryOption === 'retirada' ? 'bg-secondary text-primary' : 'bg-white/10 text-surface/50'}`}>
                  <span className="material-symbols-outlined text-3xl">storefront</span>
                </span>
                <span>
                  <span className="block text-sm font-black uppercase tracking-widest text-surface">Retirada</span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mt-1">Cortesia</span>
                </span>
              </button>

              <button
                onClick={() => setDeliveryOption('motoboy')}
                className={`flex items-center gap-4 rounded-[24px] border p-5 text-left transition-all ${deliveryOption === 'motoboy' ? 'border-secondary bg-secondary/5 shadow-[0_0_18px_rgba(255,215,0,0.12)]' : 'border-white/5 bg-white/5'}`}
              >
                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${deliveryOption === 'motoboy' ? 'bg-secondary text-primary' : 'bg-white/10 text-surface/50'}`}>
                  <span className="material-symbols-outlined text-3xl">local_shipping</span>
                </span>
                <span>
                  <span className="block text-sm font-black uppercase tracking-widest text-surface">Motoboy</span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mt-1">Taxa a combinar</span>
                </span>
              </button>
            </div>
          </section>

          {/* Pagamento */}
          <section className="space-y-4">
            <div className="pt-6 border-t border-white/5 space-y-5">
              <h2 className="font-headline italic text-3xl">Finalização</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-surface/60">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-surface/60">
                  <span>Taxa de Entrega</span>
                  <span className="text-secondary">{deliveryOption === 'retirada' ? 'Grátis' : `R$ ${shippingCost.toFixed(2).replace('.', ',')}`}</span>
                </div>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between items-end px-1">
                <span className="font-headline italic text-2xl text-surface/70">Valor Total</span>
                <span className="text-4xl sm:text-5xl font-black text-secondary">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-surface/50 font-black">Forma de Pagamento</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'pix', label: 'Pix' },
                { id: 'cartao', label: 'Cartão' },
                { id: 'dinheiro', label: 'Dinheiro' },
                { id: 'fiado', label: 'Crediário' }
              ].map(opt => (
                <button 
                  key={opt.id} 
                  onClick={() => {
                    setPaymentOption(opt.id);
                    if (opt.id !== 'cartao' && opt.id !== 'fiado') setInstallments('1');
                  }} 
                  className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${paymentOption === opt.id ? 'border-secondary bg-secondary/10 text-secondary shadow-lg' : 'border-white/5 bg-primary/40 text-surface/40'}`}
                >
                  {opt.label}
                </button>
              ))}
              </div>
            </div>

            {/* Seletor de Parcelas */}
            {showPaymentPlan && (
              <div className="bg-white/5 rounded-2xl p-5 space-y-4 border border-secondary/20 animate-in fade-in zoom-in-95">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">
                   {paymentOption === 'fiado' ? 'Plano Crediário Valle Chic' : 'Parcelamento no Cartão'}
                </label>
                
                {paymentOption === 'cartao' && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => { setCardType('debito'); setInstallments('1'); }} className={`py-2 rounded-lg text-[9px] font-bold border ${cardType === 'debito' ? 'border-secondary text-secondary' : 'border-white/5'}`}>DÉBITO</button>
                    <button onClick={() => setCardType('credito')} className={`py-2 rounded-lg text-[9px] font-bold border ${cardType === 'credito' ? 'border-secondary text-secondary' : 'border-white/5'}`}>CRÉDITO</button>
                  </div>
                )}

                {showInstallments ? (
                  <div className="space-y-4">
                    <select 
                      value={installments} 
                      onChange={e => setInstallments(e.target.value)} 
                      className="w-full bg-primary/40 border border-white/5 rounded-xl py-4 px-4 text-xs font-bold outline-none text-secondary appearance-none"
                    >
                      {[1,2,3,4,5,6].map(n => (
                        <option key={n} value={n} className="bg-[#0B111D] text-surface">
                          {n}x de R$ {(total/n).toFixed(2).replace('.', ',')}
                        </option>
                      ))}
                    </select>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface/45 ml-1">Datas de vencimento</p>
                      {installmentDueDates.map((date, index) => (
                        <div key={index} className="grid grid-cols-[4rem_1fr] gap-2 items-center">
                          <span className="text-xs font-bold text-secondary text-center">{index + 1}ª</span>
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => {
                              const nextDates = [...installmentDueDates];
                              nextDates[index] = e.target.value;
                              setInstallmentDueDates(nextDates);
                            }}
                            className="w-full bg-primary/40 border border-white/5 rounded-xl py-3 px-4 text-xs font-bold outline-none text-surface"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-primary/40 border border-white/5 rounded-xl py-4 px-4 text-xs font-bold text-secondary">
                    Débito à vista - R$ {total.toFixed(2).replace('.', ',')}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="pt-2 space-y-4">
            <button 
              onClick={handleCheckout} 
              disabled={isSubmitting || items.length === 0}
              className="w-full bg-secondary text-primary font-black py-6 rounded-[24px] uppercase tracking-[0.3em] text-[11px] shadow-lg active:scale-95 transition-all"
            >
              {isSubmitting ? 'Finalizando...' : 'Concluir Pedido'}
            </button>
            <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-surface/35 font-black">
              <span className="material-symbols-outlined text-base">lock</span>
              <span>Ambiente protegido · WhatsApp checkout</span>
            </div>
          </section>
        </div>
      </main>
      <OrderSuccessDialog isOpen={showSuccessDialog} onClose={() => setShowSuccessDialog(false)} />
      <BottomNavigation />
    </div>
  );
}
