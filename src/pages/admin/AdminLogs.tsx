import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import MenuButton from '../../components/MenuButton';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { api } from '../../services/api';
import SettingsData from '../../components/SettingsData';
import { useTheme } from '../../contexts/ThemeContext';

export default function AdminLogs() {
  const { isDesktopSidebarCollapsed } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.logs.getAll();
      setLogs(data || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className={`flex-1 min-w-0 p-0 pb-28 ${isDesktopSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px]'} transition-all duration-300`}>
        <header className={`fixed top-0 left-0 right-0 ${isDesktopSidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[240px]'} z-30 flex items-center justify-between px-6 py-4 bar-fume mb-6 transition-all duration-300`}>
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <MenuButton onClick={() => setIsSidebarOpen(true)} />
            </div>
          </div>
          <button onClick={fetchLogs} className="text-secondary hover:opacity-80">
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </header>

        <div className="px-6 lg:px-10 max-w-[1600px] mx-auto pt-24">
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <h2 className="font-headline text-3xl italic tracking-tight">Logs <span className="text-secondary">VC</span></h2>
            </div>
            <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
              Monitoramento de atividades e sincronização do sistema
            </p>
          </div>

          {/* Painel de Controle de Dados */}
          <div className="mb-10">
            <SettingsData onActionComplete={fetchLogs} />
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-secondary/10 text-surface/60 text-[10px] uppercase tracking-widest">
                    <th className="p-4 font-normal">Data</th>
                    <th className="p-4 font-normal">Ação</th>
                    <th className="p-4 font-normal">Mensagem</th>
                    <th className="p-4 font-normal">Usuário</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr><td colSpan={4} className="p-10 text-center animate-pulse">Carregando logs...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={4} className="p-10 text-center text-surface/40 italic">Nenhum log registrado</td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b border-secondary/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 text-xs text-surface/60 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[8px] uppercase tracking-widest font-bold ${
                            log.level === 'RESET' ? 'bg-rose-500/20 text-rose-400' :
                            log.level === 'RESTORE' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="p-4 font-medium max-w-xs truncate" title={log.message}>
                          {log.message}
                        </td>
                        <td className="p-4 text-xs text-surface/60 max-w-xs truncate">
                          {log.context?.user_email || 'Sistema'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
