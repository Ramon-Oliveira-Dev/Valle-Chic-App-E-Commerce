import { Link, useParams, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import NotificationModal from '../../components/NotificationModal';
import NotificationBell from '../../components/NotificationBell';
import MenuButton from '../../components/MenuButton';
import imageCompression from 'browser-image-compression';

export default function AdminEditClient() {
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
    image_url: ''
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
        setClientData({
          name: data.name,
          phone: data.phone,
          address: data.address || '',
          birth_day: data.birth_day,
          birth_month: data.birth_month,
          is_vip: data.is_vip,
          payment_status: data.payment_status || 'Adimplente',
          image_url: data.image_url || ''
        });
        if (data.image_url) {
          setImagePreview(data.image_url);
        }
      }
    } catch (error) {
      console.error('Error fetching client:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro de Carregamento',
        message: 'Não foi possível carregar os dados do cliente.',
        type: 'error'
      });
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

  const uploadImage = async (file: File) => {
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(`clients/${fileName}`, compressedFile);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(`clients/${fileName}`);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    try {
      setIsUploading(true);
      let imageUrl = clientData.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase
        .from('clients')
        .update({
          ...clientData,
          image_url: imageUrl
        })
        .eq('id', id);

      if (error) throw error;
      
      setModalConfig({
        isOpen: true,
        title: 'Sucesso!',
        message: 'Dados do cliente atualizados com sucesso.',
        type: 'success'
      });
      
      setTimeout(() => navigate('/admin/clients'), 2000);
    } catch (error: any) {
      console.error('Error updating client:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Atualizar',
        message: error.message || 'Ocorreu um erro inesperado ao atualizar o cliente.',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 overflow-y-auto">
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-10">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <div>
              <div className="flex items-center gap-4">
                <Link to="/admin/clients" className="text-surface/60 hover:text-secondary transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h2 className="font-headline text-2xl italic">Editar Cliente <span className="text-secondary">VC</span></h2>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        <div className="px-5 md:px-10">
          <div className="mb-8">
            <h2 className="font-headline text-3xl italic">Editar Perfil</h2>
            <p className="text-surface/60 text-sm mt-1">Atualize as informações do cliente ID: {id}</p>
          </div>

        <div className="max-w-xl glass-card rounded-2xl p-5 sm:p-8">
          <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <section>
              <h3 className="text-secondary text-sm font-bold uppercase tracking-widest mb-6 border-b border-secondary/20 pb-2">Informações do Cliente</h3>
              
              {/* Image Upload Section */}
              <div className="flex flex-col items-center mb-8">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-full border-2 border-dashed border-secondary/30 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-secondary/60 transition-colors bg-primary/20 relative group"
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">edit</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-secondary/40 text-4xl mb-2">add_a_photo</span>
                      <span className="text-[10px] uppercase tracking-widest text-secondary/40">Foto</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <p className="text-[10px] text-surface/40 mt-2 uppercase tracking-widest">Clique para alterar foto</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Nome Completo</label>
                  <input 
                    type="text" 
                    className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                    value={clientData.name}
                    onChange={(e) => setClientData({...clientData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Telefone de Contato</label>
                  <input 
                    type="tel" 
                    className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                    value={clientData.phone}
                    onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Dia de Aniversário</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="31" 
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                      value={clientData.birth_day || ''}
                      onChange={(e) => setClientData({...clientData, birth_day: e.target.value ? Number(e.target.value) : null})}
                      placeholder="Dia"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Mês de Aniversário</label>
                    <select 
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors appearance-none"
                      value={clientData.birth_month || ''}
                      onChange={(e) => setClientData({...clientData, birth_month: e.target.value ? Number(e.target.value) : null})}
                    >
                      <option value="">Mês...</option>
                      <option value="1">Janeiro</option>
                      <option value="2">Fevereiro</option>
                      <option value="3">Março</option>
                      <option value="4">Abril</option>
                      <option value="5">Maio</option>
                      <option value="6">Junho</option>
                      <option value="7">Julho</option>
                      <option value="8">Agosto</option>
                      <option value="9">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Endereço (Opcional)</label>
                  <textarea 
                    className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors min-h-[100px]"
                    value={clientData.address}
                    onChange={(e) => setClientData({...clientData, address: e.target.value})}
                  ></textarea>
                </div>
                 <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Status de Pagamento</label>
                  <select 
                    className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors appearance-none"
                    value={clientData.payment_status}
                    onChange={(e) => setClientData({...clientData, payment_status: e.target.value})}
                  >
                    <option value="Adimplente">Adimplente (Em dia)</option>
                    <option value="Inadimplente">Inadimplente (Em débito)</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                   <input 
                    type="checkbox" 
                    id="vip" 
                    className="w-5 h-5 accent-secondary bg-primary border-secondary/20 rounded cursor-pointer" 
                    checked={clientData.is_vip}
                    onChange={(e) => setClientData({...clientData, is_vip: e.target.checked})}
                   />
                   <label htmlFor="vip" className="text-sm text-surface cursor-pointer font-medium">Marcar como Cliente VIP</label>
                </div>
              </div>
            </section>

            <div className="pt-6 flex flex-col sm:flex-row gap-4">
              <button 
                type="submit" 
                disabled={isUploading}
                className="flex-1 py-4 rounded-xl bg-secondary text-primary hover:bg-secondary/90 transition-colors text-sm font-bold uppercase tracking-widest shadow-lg shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <Link to="/admin/clients" className="flex-1 py-4 rounded-xl border border-surface/20 text-surface/60 hover:text-surface hover:border-surface/40 transition-colors text-sm font-bold uppercase tracking-widest text-center">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
      </main>

      <BottomNavigation />

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
