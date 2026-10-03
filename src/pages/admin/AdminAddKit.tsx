import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import NotificationModal from '../../components/NotificationModal';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import { maskCurrency, parseCurrency } from '../../lib/utils';
import imageCompression from 'browser-image-compression';
import { useTheme } from '../../contexts/ThemeContext';

interface KitItem {
  name: string;
  brand: string;
  description: string;
}

export default function AdminAddKit() {
  const { isDesktopSidebarCollapsed } = useTheme();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discount, setDiscount] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [sku, setSku] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<KitItem[]>([{ name: '', brand: '', description: '' }]);

  useEffect(() => {
    generateSku('kits');
  }, []);

  const generateSku = async (cat: string) => {
    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category', cat);
        
      if (error) throw error;
      
      const prefix = cat.substring(0, 4).toUpperCase();
      const sequence = (count || 0) + 1;
      const formattedSequence = String(sequence).padStart(3, '0');
      setSku(`${prefix}-${formattedSequence}`);
    } catch (error) {
      console.error('Error generating SKU:', error);
    }
  };
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

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const profitPercentage = (costPrice && salePrice) 
    ? (((parseCurrency(salePrice) - parseCurrency(costPrice)) / parseCurrency(costPrice)) * 100).toFixed(1)
    : '0';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      
      files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems([...items, { name: '', brand: '', description: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof KitItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    
    let imageUrls: string[] = [];

    try {
      // 0. Check SKU Uniqueness
      const { data: existingProduct, error: skuError } = await supabase
        .from('products')
        .select('id')
        .eq('sku', sku)
        .maybeSingle();
      
      if (skuError) throw skuError;
      if (existingProduct) {
        throw new Error(`O ID (SKU) "${sku}" já está em uso por outro produto. Por favor, use um ID único.`);
      }

      // 1. Upload Images with Compression
      const compressionOptions = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };

      for (const file of imageFiles) {
        let fileToUpload = file;
        
        try {
          fileToUpload = await imageCompression(file, compressionOptions);
        } catch (compError) {
          console.error('Compression error, using original file:', compError);
        }

        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        
        imageUrls.push(publicUrl);
      }

      // 2. Save Kit as a Product
      const sPrice = parseCurrency(salePrice);
      const dPercent = hasDiscount ? (Number(discount) || 0) : 0;
      const dPrice = sPrice * (1 - dPercent / 100);

      const kitData = {
        name: formData.get('kitName'),
        brand: 'Valle Chic Kit',
        category: 'kits',
        sku: sku,
        description: formData.get('description'),
        cost_price: parseCurrency(costPrice),
        sale_price: sPrice,
        discount: dPercent,
        discounted_price: dPrice,
        stock: Number(stock),
        accessories: formData.get('accessories'),
        published: formData.get('published') === 'on',
        featured: formData.get('featured') === 'on',
        image_url: imageUrls[0] || '',
        images: imageUrls,
        img: imageUrls[0] || '',
        is_kit: true,
        kit_items: items, // Store items in the kit
        entry_date: entryDate
      };

      const { data: newKit, error } = await supabase.from('products').insert([kitData]).select().single();
      if (error) throw error;
      
      setModalConfig({
        isOpen: true,
        title: 'Sucesso!',
        message: 'Kit cadastrado com sucesso no catálogo.',
        type: 'success'
      });
      
      setTimeout(() => navigate('/admin/inventory'), 2000);
    } catch (error: any) {
      console.error('Error saving kit:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Salvar',
        message: error.message || 'Ocorreu um erro inesperado ao salvar o kit.',
        type: 'error'
      });
    } finally {
      setUploading(false);
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
          <div className="flex items-center gap-4">
            <NotificationSino />
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pt-20 pb-6">
          <div className="mb-4">
            <h2 className="font-headline text-2xl italic">Cadastrar Kit <span className="text-secondary">VC</span></h2>
            <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-0.5">
              Crie um conjunto de produtos para venda especial
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-8">
            <div className="lg:col-span-7 space-y-4">
              {/* Kit Basic Info */}
              <div className="glass-card rounded-[16px] p-4 sm:p-5">
                <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-3 border-b border-secondary/20 pb-1.5">Informações do Kit</h3>
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Nome do Kit</label>
                    <input type="text" name="kitName" required className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-surface focus:outline-none focus:border-secondary transition-colors font-headline text-base" placeholder="Ex: Kit Elegância Verão" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">ID (Código de Rastreio)</label>
                      <input 
                        type="text" 
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary transition-colors font-mono" 
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Gerado automaticamente..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Data de Entrada</label>
                      <input 
                        type="date" 
                        required
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary transition-colors" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Descrição do Kit</label>
                    <textarea name="description" className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary transition-colors min-h-[60px]" placeholder="Descreva o que compõe este kit..."></textarea>
                  </div>
                </div>
              </div>

              {/* Kit Items */}
              <div className="glass-card rounded-[16px] p-4 sm:p-5">
                <div className="flex justify-between items-center mb-3 border-b border-secondary/20 pb-1.5">
                  <h3 className="text-secondary text-xs font-bold uppercase tracking-widest">Itens do Kit</h3>
                  <button 
                    type="button" 
                    onClick={addItem}
                    className="text-secondary flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest hover:underline"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Adicionar Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/5 relative group">
                      {items.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeItem(index)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-widest text-surface/60 font-bold">Nome do Item</label>
                          <input 
                            type="text" 
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            className="w-full bg-primary/20 border border-secondary/10 rounded-md py-1.5 px-2.5 text-xs text-surface focus:outline-none focus:border-secondary" 
                            placeholder="Ex: Bolsa Transversal"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-widest text-surface/60 font-bold">Marca</label>
                          <input 
                            type="text" 
                            value={item.brand}
                            onChange={(e) => handleItemChange(index, 'brand', e.target.value)}
                            className="w-full bg-primary/20 border border-secondary/10 rounded-md py-1.5 px-2.5 text-xs text-surface focus:outline-none focus:border-secondary" 
                            placeholder="Ex: Chanel"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[8px] uppercase tracking-widest text-surface/60 font-bold">Observações</label>
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full bg-primary/20 border border-secondary/10 rounded-md py-1.5 px-2.5 text-xs text-surface focus:outline-none focus:border-secondary" 
                            placeholder="Ex: Cor preta, seminova..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="glass-card rounded-[16px] p-4 sm:p-5">
                <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-3 border-b border-secondary/20 pb-1.5">Precificação & Estoque</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Custo Total do Kit (R$)</label>
                    <input 
                      type="text" 
                      required
                      value={costPrice}
                      onChange={(e) => setCostPrice(maskCurrency(e.target.value))}
                      className="w-full bg-primary/40 border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary" 
                      placeholder="R$ 0,00" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Preço de Venda do Kit (R$)</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      required
                      value={salePrice}
                      onChange={(e) => setSalePrice(maskCurrency(e.target.value))}
                      className="w-full bg-primary/40 border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary font-bold text-secondary" 
                      placeholder="R$ 0,00" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Quantidade de Kits</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-primary/40 border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary font-bold" 
                      placeholder="1" 
                    />
                  </div>
                  <div className="space-y-1 flex items-center justify-between bg-primary/20 p-2.5 rounded-lg border border-secondary/10">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Lucro Estimado</span>
                    <span className="text-emerald-400 font-bold text-sm">{profitPercentage}%</span>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/20 border border-secondary/10">
                      <div className="flex flex-col">
                        <span className="text-xs text-surface font-medium">Oferecer Desconto?</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={hasDiscount}
                          onChange={(e) => {
                            setHasDiscount(e.target.checked);
                            if (!e.target.checked) setDiscount('');
                          }}
                        />
                        <div className="w-9 h-5 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary/20"></div>
                      </label>
                    </div>

                    {hasDiscount && (
                      <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Desconto (%)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-primary/40 border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary"
                          placeholder="Ex: 10"
                        />
                      </div>
                    )}
                  </div>

                  {hasDiscount && discount && salePrice && (
                    <div className="md:col-span-2 p-2.5 rounded-lg bg-secondary/10 border border-secondary/20">
                      <p className="text-[11px] text-secondary font-bold uppercase tracking-widest">
                        Preço com Desconto: R$ {(parseCurrency(salePrice) * (1 - Number(discount) / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-card rounded-[16px] p-4 sm:p-5">
                <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-3 border-b border-secondary/20 pb-1.5">Imagens do Kit</h3>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-[3/4] rounded-lg overflow-hidden group border border-secondary/10">
                      <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                      </button>
                    </div>
                  ))}
                  <label className="aspect-[3/4] border-2 border-dashed border-secondary/30 rounded-lg flex flex-col items-center justify-center text-surface/60 hover:text-secondary hover:border-secondary/60 transition-colors cursor-pointer bg-primary/30">
                    <span className="material-symbols-outlined text-3xl mb-1">add_photo_alternate</span>
                    <span className="text-[9px] font-medium uppercase tracking-wider">Adicionar Foto</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="glass-card rounded-[16px] p-4 sm:p-5 space-y-3">
                <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-2 border-b border-secondary/20 pb-1.5">Status & Visibilidade</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface font-medium">Publicar Kit?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="published" value="on" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary/20"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface font-medium">Destaque na Home?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="featured" value="on" className="sr-only peer" />
                    <div className="w-9 h-5 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary/20"></div>
                  </label>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={uploading}
                className="w-full py-3 rounded-xl bg-secondary text-primary hover:bg-secondary/90 transition-colors text-xs font-bold uppercase tracking-widest shadow-md shadow-secondary/20 disabled:opacity-50"
              >
                {uploading ? 'Salvando...' : 'Salvar Kit'}
              </button>
            </div>
          </form>
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
