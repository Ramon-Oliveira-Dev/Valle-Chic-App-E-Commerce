import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import MenuButton from '../../components/MenuButton';
import NotificationSino from '../../components/NotificationSino';
import { supabase } from '../../lib/supabase';
import { api } from '../../services/api';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { useTheme } from '../../contexts/ThemeContext';

export default function AdminNewClient() {
  const { isDesktopSidebarCollapsed } = useTheme();
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
    address: '',
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
        try {
          const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: false };
          let fileToUpload: File | Blob = imageFile;
          try {
            fileToUpload = await imageCompression(imageFile, options);
          } catch {
            fileToUpload = imageFile;
          }

          const fileExt = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          const cleanExt = fileExt.replace(/[^a-z0-9]/g, '') || 'jpg';
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
          const path = `clients/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(path, fileToUpload, { upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('product-images').getPublicUrl(path);
          imageUrl = data.publicUrl;
        } catch (storageError) {
          console.warn('Storage upload error, using preview data URL fallback:', storageError);
          imageUrl = imagePreview || '';
        }
      }

      const formattedBirthday = clientData.birth_day && clientData.birth_month
        ? `${String(clientData.birth_day).padStart(2, '0')}/${String(clientData.birth_month).padStart(2, '0')}`
        : null;

      await api.clients.create({
        name: clientData.name.trim(),
        phone: clientData.phone.trim(),
        address: clientData.address.trim(),
        birthday: formattedBirthday || undefined,
        birth_day: clientData.birth_day,
        birth_month: clientData.birth_month,
        is_vip: clientData.is_vip,
        payment_status: clientData.payment_status,
        image_url: imageUrl || undefined,
        status: 'Ativo',
        purchases: 0
      });

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

      <main className={`flex-1 min-w-0 p-0 pb-20 ${isDesktopSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px]'} transition-all duration-300`}>
        <header className={`fixed top-0 left-0 right-0 ${isDesktopSidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[240px]'} z-30 flex items-center justify-between px-4 sm:px-6 py-3 bar-fume transition-all duration-300 border-b border-white/5`}>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-surface/70 hover:text-secondary transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
              title="Voltar"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
              <span>Voltar</span>
            </button>
          </div>
          <NotificationSino />
        </header>

        <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pt-20 pb-6">
          <div className="mb-4">
            <h2 className="font-headline text-2xl italic">Cadastrar Cliente <span className="text-secondary">VC</span></h2>
            <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-0.5">
              Adicione uma nova cliente ao seu banco de dados
            </p>
          </div>

          <form onSubmit={handleSaveClient} className="max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-4 pb-8">
            {/* Left Column: Personal Information */}
            <div className="lg:col-span-7 space-y-4">
              <div className="glass-card rounded-[16px] p-4 sm:p-5">
                <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-3 border-b border-secondary/20 pb-1.5">
                  Informações Pessoais & Contato
                </h3>
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Maria Silva Santos"
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-surface focus:outline-none focus:border-secondary transition-colors font-headline text-base"
                      value={clientData.name}
                      onChange={e => setClientData({ ...clientData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">WhatsApp / Telefone</label>
                      <input
                        type="tel"
                        placeholder="(00) 90000-0000"
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary transition-colors"
                        value={clientData.phone}
                        onChange={e => setClientData({ ...clientData, phone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Data de Aniversário</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Dia"
                          className="w-full bg-primary/40 border border-secondary/20 rounded-lg py-2 px-2 text-xs text-center focus:outline-none focus:border-secondary text-surface font-bold"
                          value={clientData.birth_day || ''}
                          onChange={e => setClientData({ ...clientData, birth_day: e.target.value ? Number(e.target.value) : null })}
                        />
                        <select
                          className="col-span-2 bg-primary/80 border border-secondary/20 rounded-lg py-2 px-2 text-xs focus:outline-none focus:border-secondary cursor-pointer text-surface font-semibold"
                          value={clientData.birth_month || ''}
                          onChange={e => setClientData({ ...clientData, birth_month: e.target.value ? Number(e.target.value) : null })}
                        >
                          <option value="" className="bg-[#0B111D]">Mês...</option>
                          {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                            <option key={m} value={i + 1} className="bg-[#0B111D]">{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Endereço / Cidade</label>
                    <input
                      type="text"
                      placeholder="Ex: Rua das Flores, 123 - Centro, São Paulo - SP"
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary transition-colors"
                      value={clientData.address || ''}
                      onChange={e => setClientData({ ...clientData, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Photo & Status & Actions */}
            <div className="lg:col-span-5 space-y-4">
              {/* Photo Upload Card */}
              <div className="glass-card rounded-[16px] p-4 sm:p-5">
                <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-3 border-b border-secondary/20 pb-1.5">
                  Foto do Perfil
                </h3>
                <div className="flex flex-col items-center justify-center p-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-secondary/30 flex items-center justify-center overflow-hidden hover:border-secondary transition-all bg-primary/20 group relative shadow-md"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-secondary/50 group-hover:text-secondary">
                        <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold">Foto</span>
                      </div>
                    )}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                  <p className="text-[9px] text-surface/40 italic">Clique para adicionar foto do perfil</p>
                </div>
              </div>

              {/* Status & Options Card */}
              <div className="glass-card rounded-[16px] p-4 sm:p-5 space-y-3">
                <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-2 border-b border-secondary/20 pb-1.5">
                  Perfil & Status
                </h3>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Status Financeiro</label>
                  <select
                    className="w-full bg-primary/80 border border-secondary/20 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-secondary cursor-pointer text-surface font-semibold"
                    value={clientData.payment_status}
                    onChange={e => setClientData({ ...clientData, payment_status: e.target.value })}
                  >
                    <option value="Adimplente" className="bg-[#0B111D]">Adimplente</option>
                    <option value="Inadimplente" className="bg-[#0B111D]">Inadimplente</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-surface font-medium">Cliente VIP?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={clientData.is_vip}
                      onChange={e => setClientData({ ...clientData, is_vip: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary/20"></div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl bg-secondary text-primary hover:bg-secondary/90 transition-colors text-xs font-bold uppercase tracking-widest shadow-md shadow-secondary/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Salvando...' : 'Cadastrar Cliente'}
                </button>
                <Link
                  to="/admin/clients"
                  className="w-full py-2.5 rounded-xl border border-white/10 text-surface/60 hover:text-white text-center font-bold uppercase tracking-widest text-xs transition-colors"
                >
                  Cancelar
                </Link>
              </div>
            </div>
          </form>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
