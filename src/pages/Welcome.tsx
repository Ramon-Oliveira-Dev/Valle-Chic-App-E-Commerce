import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function Welcome() {
  const { isNavyTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-sans scroll-smooth">
      {/* Backgrounds for smooth transition */}
      <div className={`fixed inset-0 bg-gradient-to-b from-[#4A3F35] via-[#A67C65] to-[#2D241E] transition-opacity duration-1000 ${isNavyTheme ? 'opacity-0' : 'opacity-100'}`} />
      <div className={`fixed inset-0 bg-gradient-to-b from-[#0A192F] to-[#1a1510] transition-opacity duration-1000 ${isNavyTheme ? 'opacity-100' : 'opacity-0'}`} />

      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 pt-12 pb-4 z-50 relative">
        <button 
          onClick={toggleTheme}
          className="text-white hover:opacity-80 transition-opacity cursor-pointer p-2 -ml-2"
          aria-label="Mudar tema"
        >
          <span className="material-symbols-outlined transition-all duration-500" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isNavyTheme ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
        <h1 className="font-headline text-2xl font-bold tracking-tighter text-white flex items-center gap-1">
          <span className={`material-symbols-outlined text-xl transition-colors duration-700 ${isNavyTheme ? 'text-[#f4c025]' : 'text-[#E2B320]'}`} style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          <span className="uppercase italic">vc</span>
        </h1>
        <Link to="/admin" className="text-white hover:opacity-80 transition-opacity p-2 -mr-2">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 z-10 relative -mt-10">
        <p className={`text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-10 font-medium text-center transition-colors duration-700 ${isNavyTheme ? 'text-[#cbbc90]' : 'text-[#E2B320]'}`}>
          Exclusividade Valle Chic
        </p>
        
        <div className="text-center text-white drop-shadow-xl flex flex-col items-center leading-[1.1]">
          <span className="text-5xl sm:text-6xl font-light tracking-wide">CONHEÇA</span>
          <span className="text-5xl sm:text-6xl font-extrabold italic tracking-wide">A NOVA</span>
          <span className="text-5xl sm:text-6xl font-light tracking-wide">COLEÇÃO</span>
        </div>

        <div className={`w-12 h-[1px] mt-12 transition-colors duration-700 ${isNavyTheme ? 'bg-[#f4c025]' : 'bg-[#E2B320]'}`}></div>
      </main>

      {/* Footer / Button */}
      <div className="px-6 pb-12 z-20 relative flex justify-center w-full">
        <Link 
          to="/home" 
          className={`w-full max-w-sm flex items-center justify-center gap-3 text-[#0a0c10] font-bold text-sm uppercase tracking-widest py-5 rounded-full hover:scale-105 transition-all duration-300 ${isNavyTheme ? 'bg-[#f4c025] shadow-[0_0_40px_rgba(244,192,37,0.3)] hover:shadow-[0_0_50px_rgba(244,192,37,0.5)]' : 'bg-[#E2B320] shadow-[0_0_40px_rgba(226,179,32,0.3)] hover:shadow-[0_0_50px_rgba(226,179,32,0.5)]'}`}
        >
          Ver Produtos
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
