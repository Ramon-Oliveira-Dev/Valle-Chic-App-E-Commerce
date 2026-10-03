import { Link, useParams, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import { api } from '../../services/api';
import { toast } from 'sonner';
import NotificationModal from '../../components/NotificationModal';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import imageCompression from 'browser-image-compression';
import { useTheme } from '../../contexts/ThemeContext';

export default function AdminEditClient() {
  const { isDesktopSidebarCollapsed } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
  
  const [clientData, setClientData] = useState({
    name: '',
    phone: '',
    address: '',
    birth_day: null as number | null,
    birth_month: null as number | null,
    is_vip: false,
    payment_status: 'Adimplente',
    image_url: '',
    status: 'Ativo'
  });

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        // Converte a string "DD/MM" do banco para os campos numéricos da tela
        let d = null;
        let m = null;
        if (data.birthday && data.birthday.includes('/')) {
          const parts = data.birthday.split('/');
          d = parseInt(parts[0]);
          m = parseInt(parts[1]);
        }

        setClientData({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          birth_day: d || data.birth_day || null,
          birth_month: m || data.birth_month || null,
          is_vip: data.is_vip || false,
          payment_status: data.payment_status || 'Adimplente',
          image_url: data.image_url || '',
          status: data.status || 'Ativo'
        });
        
        if (data.image_url) {
          setImagePreview(data.image_url);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      toast.error('Não foi possível carregar os dados do cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setIsUploading(true);
      
      let finalImageUrl = clientData.image_url;

      // Upload da imagem se houver uma nova selecionada
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

          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(path);

          finalImageUrl = publicUrl;
        } catch (storageError) {
          console.warn('Storage upload error, using preview data URL fallback:', storageError);
          finalImageUrl = imagePreview || clientData.image_url;
        }
      }

      // Formata o aniversário para salvar como string DD/MM
      const formattedBirthday = (clientData.birth_day && clientData.birth_month)
        ? `${String(clientData.birth_day).padStart(2, '0')}/${String(clientData.birth_month).padStart(2, '0')}`
        : null;

      await api.clients.update(id!, {
        name: clientData.name,
        phone: clientData.phone,
        address: clientData.address,
        birthday: formattedBirthday || undefined,
        is_vip: clientData.is_vip,
        payment_status: clientData.payment_status,
        image_url: finalImageUrl || undefined,
        status: 'Ativo'
      });
      
      toast.success('Cliente atualizado com sucesso!');
      navigate('/admin/clients');

    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message || 'Erro ao atualizar cliente.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="min-h-screen global-bg flex items-center justify-center text-secondary uppercase tracking-widest text-xs">Carregando...</div>;

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className={`flex-1 min-w-0 p-0 pb-28 ${isDesktopSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px]'} transition-all duration-300`}>
        <header className={`fixed top-0 left-0 right-0 ${isDesktopSidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[240px]'} z-30 flex items-center justify-between px-6 py-4 bar-fume border-b border-white/5 transition-all duration-300`}>
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
          </div>
          <NotificationSino />
        </header>

        <div className="px-5 md:px-10 pt-28 max-w-xl mx-auto w-full">
          <div className="glass-card rounded-[32px] p-8 border border-white/5 shadow-2xl bg-[#0B111D]/80 backdrop-blur-3xl">
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              
              {/* Seção da Foto */}
              <div className="flex flex-col items-center gap-4 mb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-full border-2 border-dashed border-secondary/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-secondary transition-all bg-primary/20 relative group"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-secondary/40 text-4xl">add_a_photo</span>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <p className="text-[10px] uppercase tracking-widest text-surface/30 font-bold">Foto do Perfil</p>
              </div>

              {/* Campos de Texto */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-surface/50 ml-1 font-bold">Nome Completo</label>
                  <input type="text" className="w-full bg-primary/60 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:border-secondary outline-none transition-all text-surface" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-surface/50 ml-1 font-bold">WhatsApp / Fone</label>
                  <input type="tel" className="w-full bg-primary/60 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:border-secondary outline-none transition-all text-surface" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} />
                </div>
              </div>

              {/* Data de Aniversário */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-surface/50 ml-1 font-bold">Aniversário</label>
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" min="1" max="31" placeholder="Dia" className="w-full bg-primary/60 border border-white/5 rounded-2xl py-4 px-5 text-sm text-center focus:border-secondary outline-none text-surface" value={clientData.birth_day || ''} onChange={e => setClientData({...clientData, birth_day: e.target.value ? Number(e.target.value) : null})} />
                  <select className="col-span-2 bg-primary/60 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:border-secondary outline-none appearance-none cursor-pointer text-surface" value={clientData.birth_month || ''} onChange={e => setClientData({...clientData, birth_month: e.target.value ? Number(e.target.value) : null})}>
                    <option value="">Mês...</option>
                    {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                      <option key={m} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* VIP e Financeiro */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-surface/50 ml-1 font-bold">Status Financeiro</label>
                  <select className="w-full bg-primary/60 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:border-secondary outline-none appearance-none cursor-pointer text-surface" value={clientData.payment_status} onChange={e => setClientData({...clientData, payment_status: e.target.value})}>
                    <option value="Adimplente">Adimplente</option>
                    <option value="Inadimplente">Inadimplente</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                   <input type="checkbox" id="vip" className="w-5 h-5 accent-secondary cursor-pointer" checked={clientData.is_vip} onChange={e => setClientData({...clientData, is_vip: e.target.checked})} />
                   <label htmlFor="vip" className="text-sm cursor-pointer font-bold uppercase tracking-widest text-surface/80">Marcar como Cliente VIP</label>
                </div>
              </div>

              {/* Botões */}
              <div className="pt-6 flex flex-col gap-3">
                <button type="submit" disabled={isUploading} className="w-full py-5 rounded-2xl bg-secondary text-primary font-black uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-secondary/10 active:scale-95 transition-all">
                  {isUploading ? 'Processando...' : 'Confirmar Alterações'}
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