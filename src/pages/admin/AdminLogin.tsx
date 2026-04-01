import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import NotificationModal from '../../components/NotificationModal';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setModalConfig({
        isOpen: true,
        title: 'Acesso Negado',
        message: 'Preencha todos os campos para continuar.',
        type: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Login realizado com sucesso!');
      navigate('/admin/dashboard');
    } catch (error: any) {
      setModalConfig({
        isOpen: true,
        title: 'Erro de Acesso',
        message: error.message || 'E-mail ou senha incorretos. Tente novamente.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen global-bg flex flex-col relative font-sans text-surface overflow-hidden scroll-smooth">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 pt-12 pb-4 z-10">
        <Link to="/" className="flex items-center gap-2 text-surface/60 hover:text-surface transition-colors text-[10px] font-bold tracking-[0.2em] uppercase">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Voltar
        </Link>
        <h1 className="font-headline text-2xl font-bold tracking-tighter text-surface flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <span className="material-symbols-outlined text-xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          <span className="uppercase italic">vc</span>
        </h1>
        <div className="w-20"></div> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 z-10 w-full max-w-md mx-auto">
        
        {/* Icon */}
        <div className="w-16 h-16 rounded-full border border-secondary/20 flex items-center justify-center mb-6 bg-primary/40 backdrop-blur-sm">
          <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
        </div>

        {/* Title */}
        <h2 className="font-headline text-4xl italic text-surface mb-12 font-light">Acesso Restrito</h2>

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold ml-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-full py-4 px-6 text-surface focus:outline-none focus:border-secondary transition-colors placeholder:text-surface/40"
              placeholder="admin@vallechic.com"
              required
            />
          </div>
          
          <div className="space-y-2 relative">
            <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold ml-1">Senha</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-full py-4 px-6 text-surface focus:outline-none focus:border-secondary transition-colors placeholder:text-surface/40"
                placeholder="••••••••"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-surface/40 hover:text-surface/60 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-secondary text-primary font-bold text-sm uppercase tracking-widest py-5 rounded-full shadow-[0_0_40px_rgba(226,179,32,0.15)] hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(226,179,32,0.25)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
              {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="w-full pb-8 pt-12 flex flex-col items-center gap-6 z-10">
        <div className="flex gap-8 text-[10px] font-bold tracking-[0.2em] text-surface/60 uppercase">
          <Link to="#" className="hover:text-surface transition-colors">Privacy</Link>
          <Link to="#" className="hover:text-surface transition-colors">Terms</Link>
          <Link to="#" className="hover:text-surface transition-colors">Contact</Link>
        </div>
        <p className="text-[8px] font-bold tracking-[0.2em] text-surface/60 uppercase">
          © 2024 Vallechic Editorial. All rights reserved.
        </p>
      </footer>

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
