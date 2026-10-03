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
import { useTheme } from '../../contexts/ThemeContext';
import { Plus, Trash2 } from 'lucide-react';

export default function AdminAddProduct() {
  const { isDesktopSidebarCollapsed } = useTheme();
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
  
  // Stock variations (Cores, Quantidades, SKUs)
  const [variations, setVariations] = useState<Array<{ color: string; quantity: number | ''; sku: string }>>([
    { color: '', quantity: 1, sku: '' }
  ]);
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

      // 2. Save Product (with variations if specified)
      const sPrice = parseCurrency(salePrice);
      const dPercent = hasDiscount ? (Number(discount) || 0) : 0;
      const dPrice = sPrice * (1 - dPercent / 100);

      const baseProductData = {
        name: formData.get('name'),
        brand: formData.get('brand'),
        model,
        category: category,
        description: formData.get('description'),
        cost_price: parseCurrency(costPrice),
        sale_price: sPrice,
        discount: dPercent,
        discounted_price: dPrice,
        is_kit: formData.get('is_kit') === 'on',
        accessories: formData.get('accessories'),
        published: formData.get('published') === 'on',
        featured: formData.get('featured') === 'on',
        image_url: imageUrls[0] || '',
        images: imageUrls,
        img: imageUrls[0] || '',
        entry_date: entryDate
      };

      const validVariations = variations.filter(v => v.color.trim() !== '');

      if (validVariations.length > 0) {
        for (const v of validVariations) {
          const variantSku = v.sku || `${sku}-${v.color.toUpperCase()}`;
          const variantData = {
            ...baseProductData,
            sku: variantSku,
            stock: Number(v.quantity) || 1,
            colors: [v.color.trim()],
            model: model ? `${model} (${v.color.trim()})` : v.color.trim()
          };
          const { error: insErr } = await supabase.from('products').insert(variantData);
          if (insErr) throw insErr;
        }
      } else {
        const productData = {
          ...baseProductData,
          sku: sku,
          stock: Number(stock) || 1,
          colors: typeof colors === 'string' ? colors.split(',').map(c => c.trim()) : []
        };
        const { error: insErr } = await supabase.from('products').insert(productData);
        if (insErr) throw insErr;
      }
      
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
            <h2 className="font-headline text-2xl italic">Cadastrar Produto <span className="text-secondary">VC</span></h2>
            <p className="text-surface/40 text-[10px] uppercase tracking-[0.2em] font-bold mt-0.5">
              Adicione uma nova peça ao catálogo da loja
            </p>
          </div>

        <form onSubmit={handleSubmit} className="max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-4 pb-8">
          {/* Form Column */}
          <div className="lg:col-span-7 glass-card rounded-[16px] p-4 sm:p-5">
            <div className="space-y-5">
              <section>
                <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-3 border-b border-secondary/20 pb-1.5">Detalhes da Peça</h3>
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Nome do Produto</label>
                    <input type="text" name="name" required className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-surface focus:outline-none focus:border-secondary transition-colors font-headline text-base" placeholder="Ex: Classic Flap Bag Jumbo" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Marca / Designer</label>
                      <input 
                        type="text" 
                        name="brand" 
                        required 
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary transition-colors" 
                        placeholder="Ex: Chanel, Hermès..." 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Modelo</label>
                      <input 
                        type="text" 
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary transition-colors" 
                        placeholder="Ex: LT706, Classic Flap..." 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Categoria</label>
                      <select 
                        name="category" 
                        required 
                        className="w-full bg-primary/80 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface font-semibold focus:outline-none focus:border-secondary transition-colors cursor-pointer hover:border-secondary/40 shadow-inner"
                        value={category}
                        onChange={handleCategoryChange}
                      >
                        <option value="" className="bg-[#0B111D] text-surface">Selecione...</option>
                        <option value="bolsas" className="bg-[#0B111D] text-surface">Bolsas</option>
                        <option value="maletas" className="bg-[#0B111D] text-surface">Maletas</option>
                        <option value="carteiras" className="bg-[#0B111D] text-surface">Carteiras</option>
                        <option value="acessorios" className="bg-[#0B111D] text-surface">Acessórios</option>
                      </select>
                    </div>
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Acompanha</label>
                      <input type="text" name="accessories" className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary transition-colors" placeholder="Caixa, Dust bag..." />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Descrição Detalhada</label>
                    <textarea name="description" className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary transition-colors min-h-[70px]" placeholder="Descreva o material, ano, condições, etc."></textarea>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-3 border-b border-secondary/20 pb-1.5">Precificação & Estoque</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Valor Pago (Custo)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-secondary font-bold text-xs">R$</span>
                      </div>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        required
                        value={costPrice}
                        onChange={(e) => setCostPrice(maskCurrency(e.target.value))}
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 pl-9 pr-3 text-xs text-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-colors" 
                        placeholder="0,00" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">Preço de Venda</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-secondary font-bold text-xs">R$</span>
                      </div>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        required
                        value={salePrice}
                        onChange={(e) => setSalePrice(maskCurrency(e.target.value))}
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/25 rounded-lg py-2 pl-9 pr-3 text-xs text-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-colors font-black text-secondary" 
                        placeholder="0,00" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1 md:col-span-2 flex items-center justify-between bg-primary/20 p-2.5 rounded-lg border border-secondary/10">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-surface/60 font-bold">% de Lucro Estimado</span>
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
                          inputMode="decimal"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-2 px-3 text-xs text-surface focus:outline-none focus:border-secondary transition-colors"
                          placeholder="Ex: 10"
                          min="0"
                          max="100"
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

                  <div className="md:col-span-2 space-y-3 pt-2 border-t border-secondary/10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-secondary text-xs font-bold uppercase tracking-widest">Variações de Estoque</h4>
                      <span className="text-[10px] text-surface/50">{variations.length} {variations.length === 1 ? 'linha' : 'linhas'}</span>
                    </div>

                    <div className="space-y-2">
                      {variations.map((v, index) => (
                        <div key={index} className="glass-card p-2.5 rounded-lg border border-secondary/20 flex flex-col sm:flex-row items-center gap-2">
                          <div className="flex-1 w-full space-y-0.5">
                            <label className="text-[8px] uppercase tracking-wider text-surface/50 font-bold">Cor</label>
                            <input 
                              type="text" 
                              value={v.color}
                              onChange={(e) => {
                                const newVars = [...variations];
                                newVars[index].color = e.target.value;
                                setVariations(newVars);
                              }}
                              placeholder="Ex: Preto"
                              className="w-full bg-primary/40 border border-secondary/20 rounded-md py-1.5 px-2.5 text-xs text-surface focus:outline-none focus:border-secondary"
                            />
                          </div>

                          <div className="w-full sm:w-28 space-y-0.5">
                            <label className="text-[8px] uppercase tracking-wider text-surface/50 font-bold">Qtd</label>
                            <input 
                              type="number" 
                              min="1"
                              value={v.quantity}
                              onChange={(e) => {
                                const newVars = [...variations];
                                newVars[index].quantity = e.target.value === '' ? '' : Number(e.target.value);
                                setVariations(newVars);
                              }}
                              placeholder="1"
                              className="w-full bg-primary/40 border border-secondary/20 rounded-md py-1.5 px-2.5 text-xs text-surface font-bold focus:outline-none focus:border-secondary"
                            />
                          </div>

                          <div className="flex-1 w-full space-y-0.5">
                            <label className="text-[8px] uppercase tracking-wider text-surface/50 font-bold">SKU</label>
                            <input 
                              type="text" 
                              value={v.sku || sku}
                              onChange={(e) => {
                                const newVars = [...variations];
                                newVars[index].sku = e.target.value;
                                setVariations(newVars);
                              }}
                              placeholder={sku || "MODELO"}
                              className="w-full bg-primary/40 border border-secondary/20 rounded-md py-1.5 px-2.5 text-xs text-surface font-mono focus:outline-none focus:border-secondary"
                            />
                          </div>

                          <div className="self-end sm:self-center pt-1 sm:pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (variations.length === 1) return;
                                setVariations(variations.filter((_, i) => i !== index));
                              }}
                              disabled={variations.length === 1}
                              className={`p-2 rounded-lg border transition-all ${
                                variations.length === 1 
                                  ? 'opacity-30 border-white/5 cursor-not-allowed' 
                                  : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                              }`}
                              title="Remover variação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setVariations(prev => [...prev, { color: '', quantity: 1, sku: `${sku}-${prev.length + 1}` }]);
                      }}
                      className="w-full py-2 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/10 font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-1.5 bg-primary/40 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Outra Cor
                    </button>
                  </div>

                  {individualIds.length > 0 && (
                    <div className="md:col-span-2 space-y-2 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] uppercase tracking-[0.2em] text-secondary font-bold">IDs Individuais de Rastreio</label>
                        <span className="text-[9px] text-surface/40 italic">{individualIds.length} itens gerados</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                        {individualIds.map((id, index) => (
                          <div key={index} className="bg-primary/40 border border-secondary/20 rounded px-2 py-0.5 text-[9px] font-mono text-surface/80 flex items-center justify-between group">
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
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Image Upload & Options Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-card rounded-[16px] p-4 sm:p-5">
              <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-3 border-b border-secondary/20 pb-1.5">Imagens</h3>
              
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
                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-secondary/80 text-primary text-[8px] font-bold uppercase py-0.5 text-center">
                        Principal
                      </div>
                    )}
                  </div>
                ))}
                
                <label className="aspect-[3/4] border-2 border-dashed border-secondary/30 rounded-lg flex flex-col items-center justify-center text-surface/40 hover:text-secondary hover:border-secondary/60 transition-colors cursor-pointer bg-primary/30 overflow-hidden relative">
                  <span className="material-symbols-outlined text-3xl mb-1">add_photo_alternate</span>
                  <span className="text-[9px] font-medium uppercase tracking-wider">Adicionar Foto</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              
              <p className="text-[9px] text-surface/40 italic">A primeira imagem será a principal do catálogo.</p>
            </div>

            <div className="glass-card rounded-[16px] p-4 sm:p-5 space-y-3">
               <h3 className="text-secondary text-xs font-bold uppercase tracking-widest mb-2 border-b border-secondary/20 pb-1.5">Status & Visibilidade</h3>
               <div className="flex items-center justify-between">
                  <span className="text-xs text-surface font-medium">Este produto é um Kit?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="is_kit" value="on" className="sr-only peer" />
                    <div className="w-9 h-5 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary/20"></div>
                  </label>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-xs text-surface font-medium">Publicar no catálogo?</span>
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
              className="w-full py-3 rounded-xl bg-secondary text-primary hover:bg-secondary/90 transition-colors text-xs font-bold uppercase tracking-widest shadow-md shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
