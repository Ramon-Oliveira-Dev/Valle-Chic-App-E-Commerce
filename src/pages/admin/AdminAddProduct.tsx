import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import NotificationModal from '../../components/NotificationModal';
import NotificationSino from '../../components/NotificationSino';
import MenuButton from '../../components/MenuButton';
import { maskCurrency, parseCurrency } from '../../lib/utils';
import imageCompression from 'browser-image-compression';

export default function AdminAddProduct() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discount, setDiscount] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [sku, setSku] = useState('');
  const [model, setModel] = useState('');
  const [individualIds, setIndividualIds] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [colors, setColors] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
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

  const generateSku = async (cat: string) => {
    if (!cat) return;
    
    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category', cat);
        
      if (error) throw error;
      
      const prefix = cat.substring(0, 4).toUpperCase();
      const sequence = (count || 0) + 1;
      const formattedSequence = String(sequence).padStart(3, '0');
      const newSku = `${prefix}-${formattedSequence}`;
      setSku(newSku);
      
      // Also update individual IDs if stock > 0
      if (stock && Number(stock) > 0) {
        generateIndividualIds(newSku, Number(stock));
      }
    } catch (error) {
      console.error('Error generating SKU:', error);
    }
  };

  const generateIndividualIds = (baseSku: string, count: number) => {
    const ids = Array.from({ length: count }, (_, i) => `${baseSku}-${String(i + 1).padStart(3, '0')}`);
    setIndividualIds(ids);
  };

  useEffect(() => {
    if (sku && stock && Number(stock) > 0) {
      generateIndividualIds(sku, Number(stock));
    } else {
      setIndividualIds([]);
    }
  }, [stock, sku]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setCategory(newCat);
    generateSku(newCat);
  };

  const profitPercentage = (costPrice && salePrice) 
    ? (((parseCurrency(salePrice) - parseCurrency(costPrice)) / parseCurrency(costPrice)) * 100).toFixed(1)
    : '0';

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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

        if (uploadError) {
          if (uploadError.message.includes('bucket not found')) {
            throw new Error('O bucket "product-images" não foi encontrado no Supabase. Por favor, crie o bucket com acesso público para continuar.');
          }
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        
        imageUrls.push(publicUrl);
      }

      // 2. Save Product
      const sPrice = parseCurrency(salePrice);
      const dPercent = hasDiscount ? (Number(discount) || 0) : 0;
      const dPrice = sPrice * (1 - dPercent / 100);

      const productData = {
        name: formData.get('name'),
        brand: formData.get('brand'),
        model,
        category: category,
        sku: sku,
        description: formData.get('description'),
        cost_price: parseCurrency(costPrice),
        sale_price: sPrice,
        discount: dPercent,
        discounted_price: dPrice,
        stock: Number(stock),
        individual_ids: individualIds,
        is_kit: formData.get('is_kit') === 'on',
        colors: typeof colors === 'string' 
                ? colors.split(',').map(c => c.trim()) 
                : (colors || []),
        accessories: formData.get('accessories'),
        published: formData.get('published') === 'on',
        featured: formData.get('featured') === 'on',
        image_url: imageUrls[0] || '',
        images: imageUrls, // Store all images in an array
        img: imageUrls[0] || '', // Backward compatibility
        entry_date: entryDate
      };

      const { data: newProduct, error } = await supabase.from('products').insert([productData]).select().single();
      if (error) throw error;
      
      setModalConfig({
        isOpen: true,
        title: 'Sucesso!',
        message: 'Produto salvo com sucesso na Valle Chic!',
        type: 'success'
      });
      
      setTimeout(() => navigate('/admin/inventory'), 2000);
    } catch (error: any) {
      console.error('Error saving product:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Salvar',
        message: error.message || 'Ocorreu um erro inesperado ao salvar o produto.',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen global-bg text-surface font-body flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 min-w-0 p-0 pb-28 ">
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bar-fume mb-10">
          <div className="flex items-center gap-4">
            <MenuButton onClick={() => setIsSidebarOpen(true)} />
            <div>
              <div className="flex items-center gap-4">
                <Link to="/admin/inventory" className="text-surface/60 hover:text-secondary transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h2 className="font-headline text-2xl italic">Novo Produto <span className="text-secondary">VC</span></h2>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSino />
          </div>
        </header>

        <div className="px-5 md:px-10 pt-24">
          <div className="mb-8">
            <h2 className="font-headline text-3xl italic">Cadastrar Produto</h2>
            <p className="text-surface/60 text-sm mt-1">Adicione uma nova peça ao catálogo da loja.</p>
          </div>

        <form onSubmit={handleSubmit} className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
          {/* Form Column */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-5 sm:p-8">
            <div className="space-y-8">
              <section>
                <h3 className="text-secondary text-sm font-bold uppercase tracking-widest mb-6 border-b border-secondary/20 pb-2">Detalhes da Peça</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Nome do Produto</label>
                    <input type="text" name="name" required className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors font-headline text-lg" placeholder="Ex: Classic Flap Bag Jumbo" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Marca / Designer</label>
                      <input 
                        type="text" 
                        name="brand" 
                        required 
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                        placeholder="Ex: Chanel, Hermès..." 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Modelo</label>
                      <input 
                        type="text" 
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                        placeholder="Ex: LT706, Classic Flap..." 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Categoria</label>
                      <select 
                        name="category" 
                        required 
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors appearance-none"
                        value={category}
                        onChange={handleCategoryChange}
                      >
                        <option value="">Selecione...</option>
                        <option value="bolsas">Bolsas</option>
                        <option value="maletas">Maletas</option>
                        <option value="carteiras">Carteiras</option>
                        <option value="acessorios">Acessórios</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">ID (Código de Rastreio)</label>
                      <input 
                        type="text" 
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors font-mono" 
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Gerado automaticamente..."
                      />
                      <p className="text-[9px] text-surface/60 italic">Pode ser editado manualmente se necessário</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Data de Entrada</label>
                    <input 
                      type="date" 
                      required
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Descrição Detalhada</label>
                    <textarea name="description" className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors min-h-[120px]" placeholder="Descreva o material, ano, condições, etc."></textarea>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-secondary text-sm font-bold uppercase tracking-widest mb-6 border-b border-secondary/20 pb-2">Precificação & Estoque</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Valor Pago (R$)</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      required
                      value={costPrice}
                      onChange={(e) => setCostPrice(maskCurrency(e.target.value))}
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                      placeholder="R$ 0,00" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Preço de Venda (R$)</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      required
                      value={salePrice}
                      onChange={(e) => setSalePrice(maskCurrency(e.target.value))}
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors font-bold text-secondary" 
                      placeholder="R$ 0,00" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">% de Lucro</label>
                    <div className="w-full bg-primary/20 backdrop-blur-sm border border-secondary/10 rounded-lg py-3 px-4 text-emerald-400 font-bold">
                      {profitPercentage}%
                    </div>
                    <p className="text-[9px] text-surface/40 italic">Calculado automaticamente</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Quantidade em Estoque</label>
                    <input 
                      type="number" 
                      required
                      inputMode="numeric"
                      value={stock}
                      onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                      placeholder="1" 
                      min="0" 
                    />
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/20 border border-secondary/10">
                      <div className="flex flex-col">
                        <span className="text-sm text-surface">Oferecer Desconto?</span>
                        <p className="text-[10px] text-surface/40 italic">Ative para definir uma porcentagem de desconto</p>
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
                        <div className="w-11 h-6 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary/20"></div>
                      </label>
                    </div>

                    {hasDiscount && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Desconto (%)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors"
                          placeholder="Ex: 10"
                          min="0"
                          max="100"
                        />
                      </div>
                    )}
                  </div>

                  {hasDiscount && discount && salePrice && (
                    <div className="md:col-span-2 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                      <p className="text-xs text-secondary font-bold uppercase tracking-widest">
                        Preço com Desconto: R$ {(parseCurrency(salePrice) * (1 - Number(discount) / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Acompanha</label>
                    <input type="text" name="accessories" className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" placeholder="Caixa, Dust bag, Cartão..." />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Cor Disponível</label>
                    <input 
                      type="text" 
                      value={colors}
                      onChange={(e) => setColors(e.target.value)}
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                      placeholder="Ex: Preto, Nude, Caramelo (separe por vírgula)" 
                    />
                  </div>

                  {individualIds.length > 0 && (
                    <div className="md:col-span-2 space-y-4 p-4 rounded-xl bg-secondary/5 border border-secondary/10">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold">IDs Individuais de Rastreio</label>
                        <span className="text-[10px] text-surface/40 italic">{individualIds.length} itens gerados</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {individualIds.map((id, index) => (
                          <div key={index} className="bg-primary/40 border border-secondary/20 rounded px-2 py-1 text-[10px] font-mono text-surface/80 flex items-center justify-between group">
                            <span>{id}</span>
                            <button 
                              type="button"
                              onClick={() => {
                                const newIds = [...individualIds];
                                const currentId = newIds[index];
                                const edited = prompt('Editar ID:', currentId);
                                if (edited) {
                                  newIds[index] = edited;
                                  setIndividualIds(newIds);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 text-secondary hover:text-white transition-opacity"
                            >
                              <span className="material-symbols-outlined text-xs">edit</span>
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-surface/40 italic">Estes IDs facilitam o rastreio individual de cada peça no estoque.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Image Upload Column */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-secondary text-sm font-bold uppercase tracking-widest mb-4 border-b border-secondary/20 pb-2">Imagens</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-[3/4] rounded-xl overflow-hidden group border border-secondary/10">
                    <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-secondary/80 text-primary text-[8px] font-bold uppercase py-1 text-center">
                        Principal
                      </div>
                    )}
                  </div>
                ))}
                
                <label className="aspect-[3/4] border-2 border-dashed border-secondary/30 rounded-xl flex flex-col items-center justify-center text-surface/40 hover:text-secondary hover:border-secondary/60 transition-colors cursor-pointer bg-primary/30 overflow-hidden relative">
                  <span className="material-symbols-outlined text-4xl mb-2">add_photo_alternate</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider">Adicionar Foto</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              
              <p className="text-[10px] text-surface/40 italic">A primeira imagem será a principal do catálogo.</p>
            </div>

            <div className="glass-card rounded-2xl p-6 space-y-4">
               <h3 className="text-secondary text-sm font-bold uppercase tracking-widest mb-2 border-b border-secondary/20 pb-2">Status</h3>
               <div className="flex items-center justify-between">
                  <span className="text-sm text-surface">Este produto é um Kit?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="is_kit" value="on" className="sr-only peer" />
                    <div className="w-11 h-6 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary/20"></div>
                  </label>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-sm text-surface">Publicar no catálogo?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="published" value="on" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary/20"></div>
                  </label>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-sm text-surface">Destaque na Home?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="featured" value="on" className="sr-only peer" />
                    <div className="w-11 h-6 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary/20"></div>
                  </label>
               </div>
            </div>

            <button 
              type="submit" 
              disabled={uploading}
              className="w-full py-4 rounded-xl bg-secondary text-primary hover:bg-secondary/90 transition-colors text-sm font-bold uppercase tracking-widest shadow-lg shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Salvando...' : 'Salvar Produto'}
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
