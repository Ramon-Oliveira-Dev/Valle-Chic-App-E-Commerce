import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import MenuButton from '../../components/MenuButton';
import NotificationSino from '../../components/NotificationSino';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

export default function AdminNewClient() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [clientData, setClientData] = useState({
    name: '',
    phone: '',
    birth_day: null as number | null,
    birth_month: null as number | null,
    is_vip: false,
    payment_status: 'Adimplente'
  });

  useEffect(() => {
    const state = location.state as { nomePreenchido?: string; telefonePreenchido?: string } | null;
    if (!state) return;

    setClientData(prev => ({
      ...prev,
      name: state.nomePreenchido || prev.name,
      phone: state.telefonePreenchido || prev.phone
    }));

    if (state.nomePreenchido) {
      toast.info('Dados preenchidos automaticamente da venda.');
    }
  }, [location.state]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientData.name.trim()) {
      toast.error('O nome da cliente é obrigatório.');
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = '';

      if (imageFile) {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
        const compressed = await imageCompression(imageFile, options);
        const fileName = `${Date.now()}-${imageFile.name}`;
        const path = `clients/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, compressed);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const formattedBirthday = clientData.birth_day && clientData.birth_month
        ? `${String(clientData.birth_day).padStart(2, '0')}/${String(clientData.birth_month).padStart(2, '0')}`
        : null;

      const { error } = await supabase.from('clients').insert([{
        name: clientData.name.trim(),
        phone: clientData.phone.trim(),
        birthday: formattedBirthday,
        birth_day: clientData.birth_day,
        birth_month: clientData.birth_month,
        is_vip: clientData.is_vip,
        payment_status: clientData.payment_status,
        image_url: imageUrl,
        status: 'Ativo',
        purchases: 0
      }]);

      if (error) throw error;

      toast.success('Cliente cadastrada com sucesso!');
      navigate('/admin/clients');
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      toast.error(error.message || 'Ocorreu um erro ao cadastrar a cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bar-fume border-b border-white/5">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <div className="flex items-center gap-4">
              <Link to="/admin/clients" className="text-surface/60 hover:text-secondary transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h2 className="font-headline text-2xl italic">Novo Cliente <span className="text-secondary italic ml-1">VC</span></h2>
            </div>
          </div>
          <NotificationSino />
        </header>

        <div className="px-5 md:px-10 pt-28 max-w-xl mx-auto w-full">
          <div className="glass-card rounded-[32px] p-8 border border-white/5 shadow-2xl bg-[#0B111D]/80 backdrop-blur-3xl">
            <form className="space-y-6" onSubmit={handleSaveClient}>
              <div className="flex flex-col items-center gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-full border-2 border-dashed border-secondary/30 flex items-center justify-center overflow-hidden hover:border-secondary transition-all bg-primary/20"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-secondary/40 text-4xl">add_a_photo</span>
                  )}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <p className="text-[10px] uppercase tracking-widest text-surface/30 font-bold">Foto do Perfil</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-surface/50 ml-1 font-bold">Nome Completo</label>
                  <input
                    type="text"
                    className="w-full bg-primary/60 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:border-secondary outline-none transition-all text-surface"
                    value={clientData.name}
                    onChange={e => setClientData({ ...clientData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-surface/50 ml-1 font-bold">WhatsApp / Fone</label>
                  <input
                    type="tel"
                    className="w-full bg-primary/60 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:border-secondary outline-none transition-all text-surface"
                    value={clientData.phone}
                    onChange={e => setClientData({ ...clientData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-surface/50 ml-1 font-bold">Aniversário</label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Dia"
                    className="w-full bg-primary/60 border border-white/5 rounded-2xl py-4 px-5 text-sm text-center focus:border-secondary outline-none text-surface"
                    value={clientData.birth_day || ''}
                    onChange={e => setClientData({ ...clientData, birth_day: e.target.value ? Number(e.target.value) : null })}
                  />
                  <select
                    className="col-span-2 bg-primary/60 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:border-secondary outline-none appearance-none cursor-pointer text-surface"
                    value={clientData.birth_month || ''}
                    onChange={e => setClientData({ ...clientData, birth_month: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">Mês...</option>
                    {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-surface/50 ml-1 font-bold">Status Financeiro</label>
                  <select
                    className="w-full bg-primary/60 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:border-secondary outline-none appearance-none cursor-pointer text-surface"
                    value={clientData.payment_status}
                    onChange={e => setClientData({ ...clientData, payment_status: e.target.value })}
                  >
                    <option value="Adimplente">Adimplente</option>
                    <option value="Inadimplente">Inadimplente</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <input
                    type="checkbox"
                    id="vip"
                    className="w-5 h-5 accent-secondary cursor-pointer"
                    checked={clientData.is_vip}
                    onChange={e => setClientData({ ...clientData, is_vip: e.target.checked })}
                  />
                  <label htmlFor="vip" className="text-sm cursor-pointer font-bold uppercase tracking-widest text-surface/80">Marcar como Cliente VIP</label>
                </div>
              </div>

              <div className="pt-6 flex flex-col gap-3">
                <button type="submit" disabled={isSaving} className="w-full py-5 rounded-2xl bg-secondary text-primary font-black uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-secondary/10 active:scale-95 transition-all disabled:opacity-50">
                  {isSaving ? 'Processando...' : 'Cadastrar Cliente'}
                </button>
                <Link to="/admin/clients" className="w-full py-5 rounded-2xl border border-white/10 text-surface/30 text-center font-bold uppercase tracking-widest text-[10px]">
                  Cancelar
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
