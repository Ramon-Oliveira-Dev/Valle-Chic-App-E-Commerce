import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import BottomNavigation from '../components/BottomNavigation';
import Sidebar from '../components/Sidebar';

export default function Contact() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden pb-24 font-display text-surface global-bg">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <header className="sticky top-0 w-full z-50 flex items-center justify-between px-6 py-4 bar-fume">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="w-10 h-10 rounded-full border border-secondary/20 overflow-hidden flex items-center justify-center bg-primary active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-secondary text-xl">menu</span>
        </button>
        <h1 className="font-headline text-2xl font-bold tracking-tighter text-stone-100 flex items-center gap-0.5">
          <span className="material-symbols-outlined text-xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          <span className="uppercase">vc</span>
        </h1>
        <Link to="/checkout" className="text-surface hover:opacity-80 transition-opacity active:scale-95 duration-150 ease-in-out relative">
          <div className="relative">
            <span className="material-symbols-outlined">shopping_cart</span>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-secondary text-primary text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {totalItems}
              </span>
            )}
          </div>
        </Link>
      </header>

      <div className="w-full max-w-md mx-auto">
        <div className="sm:px-4 sm:py-3">
          <div className="relative w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden sm:rounded-xl min-h-[300px] shadow-2xl" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCp7ZAM9Xl2SArYuMCmGVVBuuBD_2zjqmHJEKLIN0LxHrQnFS0RcENLvUrCL_Zxu9IrVZWRuw0Ac4pP9qA2rAwMeEmi5m28hVb2Xv8MFgX6MnJFTKeJMYhKbROlkKUUwCAmCHg-lcdMxs5FsQrtJijFvbX2i-Bc9YOAOD5xZZ-GxNMAr3CEQ4Mdbonq-IhNtbJtcrsNC7nEJQtCNRikbmsPLItkI94d5ybJ0IiHX3CAR02euN_FJ51uSU12u8oUGk7v6VAgB25Sn3U")'}}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div className="relative p-6">
              <span className="bg-secondary px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary mb-3 inline-block">Premium Boutique</span>
              <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight drop-shadow-md">Vallechic World</h1>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-secondary/80 tracking-[0.25em] text-[10px] font-extrabold leading-tight px-6 text-left pb-2 pt-10 uppercase">Conecte-se conosco</h2>
      <div className="flex justify-center mt-4">
        <div className="flex gap-6 items-center px-4 py-3">
          <a 
            href="https://www.instagram.com/vallechic.bolsas/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-14 h-14 rounded-full glass-button flex items-center justify-center text-secondary transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
          </a>
          
          <a 
            href="https://www.facebook.com/100054625111641" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-14 h-14 rounded-full glass-button flex items-center justify-center text-secondary transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
          
          <a 
            href="https://www.tiktok.com/@vallechic7" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-14 h-14 rounded-full glass-button flex items-center justify-center text-secondary transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
          </a>
        </div>
      </div>

      <div className="px-4 mt-8">
        <div className="glass-card rounded-2xl p-7 text-surface shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-secondary/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-secondary/5 rounded-full blur-3xl"></div>
          <h3 className="text-surface text-[22px] font-extrabold leading-tight tracking-tight mb-2">Atendimento Personalizado</h3>
          <p className="text-surface/60 text-sm mb-8 leading-relaxed max-w-[280px]">Fale diretamente com nossas consultoras e tenha uma experiência de compra exclusiva.</p>
          <a 
            href="https://wa.me/5532991647440" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-3 glass-button font-extrabold h-14 rounded-xl transition-all shadow-[0_10px_30px_rgba(244,192,37,0.2)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">chat</span>
            WhatsApp VIP
          </a>
        </div>
      </div>

      <div className="mt-12 px-6">
        <div className="flex flex-col gap-8">
          <div className="flex items-start gap-5">
            <div className="bg-secondary/10 border border-secondary/20 p-3.5 rounded-xl text-secondary shrink-0">
              <span className="material-symbols-outlined">mail</span>
            </div>
            <div>
              <p className="font-bold text-surface text-base">Consultas formais</p>
              <p className="text-sm text-surface/50 leading-relaxed mt-1">valechic.bolsas@gmail.com</p>
              <a className="text-secondary text-[11px] font-extrabold uppercase tracking-widest mt-3 inline-block hover:text-surface transition-colors" href="mailto:valechic.bolsas@gmail.com">ENVIAR E-MAIL AGORA</a>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 text-center px-6 pb-10">
        <p className="text-[9px] text-surface/20 uppercase tracking-[0.4em] font-medium">© 2026 VALLECHIC | All Rights Reserved</p>
      </div>

      <BottomNavigation />
    </div>
  );
}
