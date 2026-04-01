import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import BottomNavigation from '../components/BottomNavigation';
import { toast } from 'sonner';

export default function Checkout() {
  const { items, updateQuantity, removeItem, getTotalPrice, getTotalItems } = useCartStore();
  const totalItems = getTotalItems();
  
  const [customerName, setCustomerName] = useState('');
  const [deliveryOption, setDeliveryOption] = useState('retirada'); // 'retirada', 'motoboy'
  const [paymentOption, setPaymentOption] = useState('cartao'); // 'pix', 'dinheiro', 'cartao'
  const [cardType, setCardType] = useState('credito'); // 'debito', 'credito'
  const [installments, setInstallments] = useState('1');

  const subtotal = getTotalPrice();
  
  let shippingCost = 0;
  if (deliveryOption === 'motoboy') shippingCost = 15; // Taxa a combinar, let's say 15 for now or 0 and show "A combinar"
  
  const total = subtotal + shippingCost;

  const handleCheckout = () => {
    if (items.length === 0) return;
    
    // Validation
    if (!customerName.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    
    let message = `*NOVO PEDIDO - VALLECHIC*\n\n`;
    message += `*Cliente:* ${customerName || 'Não informado'}\n`;
    message += `*Entrega:* ${deliveryOption === 'retirada' ? 'Retirada na loja' : 'Motoboy'}\n`;
    message += `*Pagamento:* ${paymentOption.toUpperCase()}${paymentOption === 'cartao' ? ` (${cardType.toUpperCase()} - ${installments}x)` : ''}\n\n`;
    
    message += `*ITENS:*\n`;
    items.forEach(item => {
      message += `- ${item.quantity}x ${item.name} (R$ ${item.price.toFixed(2).replace('.', ',')})\n`;
    });
    
    message += `\n*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    message += `*Taxa de Entrega:* ${deliveryOption === 'retirada' ? 'Grátis' : 'A Combinar'}\n`;
    message += `*TOTAL:* R$ ${total.toFixed(2).replace('.', ',')}\n`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/5532991647440?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="global-bg text-surface font-sans min-h-screen flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center px-6 py-6 bar-fume">
        <Link to="/catalog" className="text-secondary mr-4">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="font-headline italic text-2xl text-surface">Sua sacola</h1>
      </header>

      <main className="flex-grow px-4 sm:px-6 space-y-6 max-w-3xl mx-auto w-full">
        
        {/* Items List */}
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-surface/50 text-center py-8">Sua sacola está vazia.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="glass-card rounded-3xl p-4 flex relative">
                <button 
                  onClick={() => removeItem(item.id)}
                  className="absolute top-4 right-4 text-surface/40 hover:text-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
                
                <div className="w-24 h-24 bg-surface rounded-2xl overflow-hidden shrink-0 mr-4">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex flex-col justify-between flex-grow py-1">
                  <div>
                    <h3 className="font-bold text-base leading-tight pr-6 text-surface">{item.name}</h3>
                    <div className="flex gap-2 mt-2">
                      <span className="bg-secondary/20 text-[9px] font-bold uppercase px-2 py-1 rounded-md text-surface/80">Café</span>
                      <span className="bg-secondary/20 text-[9px] font-bold uppercase px-2 py-1 rounded-md text-surface/80">U</span>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between mt-4">
                    <div className="flex items-center bg-primary/60 rounded-full px-1 py-1">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-surface">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                    <span className="font-bold text-secondary text-lg">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Identificação & Entrega */}
        <div className="glass-card rounded-3xl p-6 space-y-8">
          
          {/* Identificação */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 bg-secondary rounded-full"></div>
              <h2 className="font-headline italic text-xl text-surface">Identificação</h2>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-surface/60 ml-1">Seu Nome</label>
              <input 
                type="text" 
                placeholder="Nome Completo"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-primary/60 text-surface placeholder:text-surface/30 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-secondary text-sm border border-transparent"
              />
            </div>
          </section>

          {/* Forma de Entrega */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 bg-secondary rounded-full"></div>
              <h2 className="font-headline italic text-xl text-surface">Forma de Entrega</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={() => setDeliveryOption('retirada')}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${deliveryOption === 'retirada' ? 'border-secondary bg-primary/40' : 'border-transparent bg-primary/60'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${deliveryOption === 'retirada' ? 'bg-secondary text-primary' : 'bg-primary/80 text-surface/50'}`}>
                  <span className="material-symbols-outlined text-xl">storefront</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-surface">RETIRADA</p>
                  <p className="text-[9px] text-secondary uppercase tracking-wider mt-0.5">Cortesia</p>
                </div>
              </button>
              
              <button 
                onClick={() => setDeliveryOption('motoboy')}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${deliveryOption === 'motoboy' ? 'border-secondary bg-primary/40' : 'border-transparent bg-primary/60'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${deliveryOption === 'motoboy' ? 'bg-secondary text-primary' : 'bg-primary/80 text-surface/50'}`}>
                  <span className="material-symbols-outlined text-xl">local_shipping</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-surface">MOTOBOY</p>
                  <p className="text-[9px] text-secondary uppercase tracking-wider mt-0.5">Taxa a combinar</p>
                </div>
              </button>
            </div>
          </section>
        </div>

        {/* Finalização */}
        <div className="glass-card rounded-3xl p-6 space-y-6">
          <h2 className="font-headline italic text-2xl text-surface">Finalização</h2>
          
          <div className="space-y-3 text-xs font-bold tracking-widest uppercase">
            <div className="flex justify-between text-surface/70">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-surface/70">
              <span>Taxa de Entrega</span>
              <span className="text-secondary font-bold">{deliveryOption === 'retirada' ? 'Grátis' : 'A Combinar'}</span>
            </div>
          </div>
          
          <div className="h-px w-full bg-surface/10"></div>
          
          <div className="flex justify-between items-end">
            <span className="font-headline italic text-lg text-surface/90">Valor Total</span>
            <span className="font-bold text-3xl text-secondary">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>

          {/* Forma de Pagamento */}
          <div className="pt-4 space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-surface/60">Forma de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setPaymentOption('pix')}
                className={`py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${paymentOption === 'pix' ? 'bg-secondary text-primary border-secondary shadow-[0_0_15px_rgba(244,192,37,0.3)]' : 'bg-primary/40 text-surface/60 border-transparent hover:bg-primary/60'}`}
              >
                Pix
              </button>
              <button 
                onClick={() => setPaymentOption('dinheiro')}
                className={`py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${paymentOption === 'dinheiro' ? 'bg-secondary text-primary border-secondary shadow-[0_0_15px_rgba(244,192,37,0.3)]' : 'bg-primary/40 text-surface/60 border-transparent hover:bg-primary/60'}`}
              >
                Dinheiro
              </button>
              <button 
                onClick={() => setPaymentOption('cartao')}
                className={`py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${paymentOption === 'cartao' ? 'bg-secondary text-primary border-secondary shadow-[0_0_15px_rgba(244,192,37,0.3)]' : 'bg-primary/40 text-surface/60 border-transparent hover:bg-primary/60'}`}
              >
                Cartão
              </button>
            </div>

            {paymentOption === 'cartao' && (
              <div className="glass-card rounded-2xl p-4 space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setCardType('debito')}
                    className={`py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${cardType === 'debito' ? 'bg-secondary text-primary border-secondary shadow-[0_0_15px_rgba(244,192,37,0.3)]' : 'bg-primary/40 text-surface/60 border-transparent hover:bg-primary/60'}`}
                  >
                    Débito
                  </button>
                  <button 
                    onClick={() => setCardType('credito')}
                    className={`py-3 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${cardType === 'credito' ? 'bg-secondary text-primary border-secondary shadow-[0_0_15px_rgba(244,192,37,0.3)]' : 'bg-primary/40 text-surface/60 border-transparent hover:bg-primary/60'}`}
                  >
                    Crédito
                  </button>
                </div>
                
                {cardType === 'credito' && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-surface/50">Plano de Parcelamento</label>
                    <select 
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="w-full bg-primary/60 text-surface text-xs font-bold rounded-xl px-4 py-4 focus:outline-none appearance-none border border-transparent focus:border-secondary"
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>
                          {num}X DE R$ {(total / num).toFixed(2).replace('.', ',')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4">
            <button 
              onClick={handleCheckout}
              disabled={items.length === 0}
              className="w-full bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-primary py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(244,192,37,0.3)]"
            >
              Concluir Pedido
            </button>
            <div className="flex items-center justify-center gap-2 mt-6 text-[8px] font-bold uppercase tracking-widest text-surface/40">
              <span className="material-symbols-outlined text-[10px]">lock</span>
              <span>Environment Protected • Whatsapp Checkout</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
