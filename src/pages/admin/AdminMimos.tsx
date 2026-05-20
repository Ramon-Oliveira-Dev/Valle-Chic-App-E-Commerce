import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Gift, MessageCircle, Copy, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export default function AdminMimos() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [todayBirthdays, setTodayBirthdays] = useState<any[]>(location.state?.todayBirthdays || []);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>(location.state?.upcomingBirthdays || []);
  const [loading, setLoading] = useState(!location.state);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const discountPercent = 10;

  useEffect(() => {
    if (!location.state) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [today, upcoming] = await Promise.all([
        api.clients.getTodayBirthdays(),
        api.clients.getUpcomingBirthdays(7)
      ]);
      setTodayBirthdays(today);
      setUpcomingBirthdays(upcoming);
    } catch (error) {
      console.error('Error fetching birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCoupon = (clientName: string) => {
    const firstName = clientName.split(' ')[0].toUpperCase();
    return `NIVER${firstName}${discountPercent}`;
  };

  const handleCopyCoupon = (coupon: string) => {
    navigator.clipboard.writeText(coupon);
    setCopiedCoupon(coupon);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const handleWhatsApp = (client: any) => {
    const coupon = generateCoupon(client.name);
    const message = `Parabéns e feliz Aniversário, ${client.name.split(' ')[0]}! 🎂✨\n\nA equipe Valle Chic passa por aqui para desejar um feliz aniversário! Que seu dia seja tão incrível quanto você.\n\nComo forma de agradecer por sua parceria, preparamos um mimo especial: use o cupom *${coupon}* para ganhar ${discountPercent}% de desconto em sua próxima compra! 🎉💖`;
    window.open(`https://wa.me/55${client.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const renderClientCard = (client: any, isToday: boolean) => {
    const coupon = generateCoupon(client.name);
    
    return (
      <div key={client.id} className="bg-[#111A2E] border border-[#D4AF37]/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-lg relative overflow-hidden">
        {/* Decorative Ticket Dashed Line */}
        <div className="hidden sm:block absolute left-[280px] top-0 bottom-0 w-px border-l-2 border-dashed border-[#D4AF37]/20"></div>
        
        <div className="flex items-center gap-4 w-full sm:w-[260px]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] bg-[#151E3F] flex items-center justify-center overflow-hidden">
              {client.photo_url || client.image_url ? (
                <img src={client.photo_url || client.image_url} alt={client.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[#D4AF37] font-headline text-2xl">{client.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {isToday && (
              <div className="absolute -bottom-2 -right-2 bg-[#D4AF37] text-[#0A1220] text-[10px] font-bold px-2 py-1 rounded-full border-2 border-[#111A2E]">
                HOJE
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h4 className="text-white font-medium text-lg truncate">{client.name}</h4>
            <p className="text-gray-400 text-sm">
              {isToday ? 'Faz aniversário hoje!' : `Dia ${client.birth_day}/${client.birth_month}`}
            </p>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-between w-full gap-4 sm:pl-8">
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Cupom Exclusivo</span>
            <button 
              onClick={() => handleCopyCoupon(coupon)}
              className="group relative flex items-center justify-center bg-[#151E3F] border border-dashed border-[#D4AF37]/50 text-[#D4AF37] px-4 py-2 rounded-lg font-mono font-bold hover:bg-[#D4AF37]/10 transition-all overflow-hidden"
            >
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#111A2E] border-r border-dashed border-[#D4AF37]/50"></div>
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#111A2E] border-l border-dashed border-[#D4AF37]/50"></div>
              
              <span className="flex items-center gap-2">
                {copiedCoupon === coupon ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} className="opacity-50 group-hover:opacity-100 transition-opacity" />}
                <span className="tracking-wider">{coupon}</span>
              </span>
            </button>
          </div>

          <button 
            onClick={() => handleWhatsApp(client)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#D4AF37] text-[#0A1220] px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#F3E5AB] transition-colors"
          >
            <MessageCircle size={18} />
            Enviar Mimo
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A1220] text-white pb-20">
      {/* Header */}
      <div className="bg-[#111A2E] border-b border-[#D4AF37]/20 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors mr-4"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 flex items-center justify-center pr-14">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                <Gift size={20} />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="font-headline text-xl italic text-white">Central de Mimos</h1>
                <p className="text-xs text-gray-400">Fidelização e Recompensas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Today's Birthdays */}
            {todayBirthdays.length > 0 && (
              <section>
                <h2 className="text-[#D4AF37] font-headline text-2xl mb-4 flex items-center gap-2">
                  Aniversariantes de Hoje
                  <span className="bg-[#D4AF37] text-[#0A1220] text-xs font-bold px-2 py-1 rounded-full font-sans">
                    {todayBirthdays.length}
                  </span>
                </h2>
                <div className="space-y-4">
                  {todayBirthdays.map(client => renderClientCard(client, true))}
                </div>
              </section>
            )}

            {/* Upcoming Birthdays */}
            {upcomingBirthdays.length > 0 && (
              <section>
                <h2 className="text-white font-headline text-xl mb-4 flex items-center gap-2">
                  Próximos 7 dias
                  <span className="bg-white/10 text-white text-xs font-bold px-2 py-1 rounded-full font-sans">
                    {upcomingBirthdays.length}
                  </span>
                </h2>
                <div className="space-y-4">
                  {upcomingBirthdays.map(client => renderClientCard(client, false))}
                </div>
              </section>
            )}

            {todayBirthdays.length === 0 && upcomingBirthdays.length === 0 && (
              <div className="bg-[#111A2E] border border-[#D4AF37]/20 rounded-2xl p-12 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-6">
                  <Gift size={40} />
                </div>
                <h3 className="text-xl font-headline text-white mb-2">Nenhum aniversariante próximo</h3>
                <p className="text-gray-400 max-w-md">
                  Aproveite este momento para criar promoções relâmpago ou enviar mimos para seus clientes mais fiéis!
                </p>
                <button 
                  onClick={() => navigate('/admin/clients')}
                  className="mt-8 bg-transparent border border-[#D4AF37] text-[#D4AF37] px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#D4AF37]/10 transition-colors uppercase tracking-widest"
                >
                  Ver Todos os Clientes
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
