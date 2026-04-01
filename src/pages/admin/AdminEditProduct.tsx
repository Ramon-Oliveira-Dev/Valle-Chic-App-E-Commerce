import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import BottomNavigation from '../../components/BottomNavigation';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import NotificationModal from '../../components/NotificationModal';
import NotificationBell from '../../components/NotificationBell';
import MenuButton from '../../components/MenuButton';
import { maskCurrency, parseCurrency } from '../../lib/utils';

export default function AdminEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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
  
  const [productData, setProductData] = useState({
    name: '',
    brand: '',
    category: '',
    description: '',
    cost_price: 0,
    sale_price: 0,
    stock: 0,
    sku: '',
    condition: '',
    accessories: '',
    colors: '',
    individual_ids: [] as string[],
    is_kit: false,
    kit_items: [] as any[],
    image_url: '',
    images: [] as string[],
    published: true,
    featured: false
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [stock, setStock] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setProductData({
          name: data.name,
          brand: data.brand,
          category: data.category,
          description: data.description,
          cost_price: data.cost_price,
          sale_price: data.sale_price,
          stock: data.stock,
          sku: data.sku || '',
          condition: data.condition,
          accessories: data.accessories,
          colors: Array.isArray(data.colors) ? data.colors.join(', ') : (data.colors || ''),
          individual_ids: data.individual_ids || [],
          is_kit: data.is_kit || false,
          kit_items: data.kit_items || [],
          image_url: data.image_url || data.img || '',
          images: data.images || (data.image_url || data.img ? [data.image_url || data.img] : []),
          published: data.published,
          featured: data.featured
        });
        setCostPrice(data.cost_price ? maskCurrency(data.cost_price.toString()) : '');
        setSalePrice(data.sale_price ? maskCurrency(data.sale_price.toString()) : '');
        setDiscount(data.discount ? data.discount.toString() : '');
        setStock(data.stock ? data.stock.toString() : '');
        setImagePreviews(data.images || (data.image_url || data.img ? [data.image_url || data.img] : []));
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro de Carregamento',
        message: 'Não foi possível carregar os dados do produto.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const profitPercentage = useMemo(() => {
    const cost = parseCurrency(costPrice);
    const sale = parseCurrency(salePrice);
    if (!cost || !sale) return 0;
    return Math.round(((sale - cost) / cost) * 100);
  }, [costPrice, salePrice]);

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
    const previewToRemove = imagePreviews[index];
    const isExisting = !previewToRemove.startsWith('data:');
    
    if (isExisting) {
      setProductData(prev => ({
        ...prev,
        images: prev.images.filter(img => img !== previewToRemove)
      }));
    } else {
      const existingCount = imagePreviews.filter((p, i) => i < index && !p.startsWith('data:')).length;
      const fileIndex = index - existingCount;
      setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
    
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const regenerateIndividualIds = () => {
    const count = Number(productData.stock);
    const baseSku = productData.sku;
    if (!baseSku || count <= 0) return;
    
    const newIds = Array.from({ length: count }, (_, i) => `${baseSku}-${String(i + 1).padStart(3, '0')}`);
    setProductData(prev => ({ ...prev, individual_ids: newIds }));
    toast.success('IDs individuais regenerados com base no SKU atual.');
  };

  const syncIndividualIds = (newStock: number) => {
    const currentIds = [...productData.individual_ids];
    if (newStock > currentIds.length) {
      // Add more
      const baseSku = productData.sku || 'PROD';
      const additional = Array.from({ length: newStock - currentIds.length }, (_, i) => 
        `${baseSku}-${String(currentIds.length + i + 1).padStart(3, '0')}`
      );
      return [...currentIds, ...additional];
    } else if (newStock < currentIds.length) {
      // Remove from end
      return currentIds.slice(0, newStock);
    }
    return currentIds;
  };

  const handleSave = async () => {
    try {
      setUploading(true);
      
      // 1. Upload new images
      let newImageUrls: string[] = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) {
          if (uploadError.message.includes('bucket not found')) {
            throw new Error('O bucket "product-images" não foi encontrado no Supabase. Por favor, crie o bucket com acesso público para continuar.');
          }
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        newImageUrls.push(publicUrl);
      }

      const finalImages = [...productData.images, ...newImageUrls];
      const finalImageUrl = finalImages[0] || '';

      const { error } = await supabase
        .from('products')
        .update({
          ...productData,
          cost_price: parseCurrency(costPrice),
          sale_price: parseCurrency(salePrice),
          discount: Number(discount),
          stock: Number(stock),
          colors: typeof productData.colors === 'string' 
            ? productData.colors.split(',').map(c => c.trim()) 
            : (productData.colors || []),
          image_url: finalImageUrl,
          images: finalImages,
          img: finalImageUrl // Keep img in sync for now
        })
        .eq('id', id);

      if (error) throw error;
      
      setModalConfig({
        isOpen: true,
        title: 'Sucesso!',
        message: 'Produto atualizado com sucesso na Valle Chic!',
        type: 'success'
      });
      
      setTimeout(() => navigate('/admin/inventory'), 2000);
    } catch (error: any) {
      console.error('Error updating product:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Salvar',
        message: error.message || 'Ocorreu um erro inesperado ao atualizar o produto.',
        type: 'error'
      });
    } finally {
      setUploading(false);
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
                <Link to="/admin/inventory" className="text-surface/60 hover:text-secondary transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h2 className="font-headline text-2xl italic">Editar Produto <span className="text-secondary">VC</span></h2>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        <div className="px-5 md:px-10">
          <div className="mb-8">
            <h2 className="font-headline text-3xl italic">Editar Peça</h2>
            <p className="text-surface/60 text-sm mt-1">Atualize as informações do produto ID: {id}</p>
          </div>

        <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
          {/* Form Column */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-5 sm:p-8">
            <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <section>
                <h3 className="text-secondary text-sm font-bold uppercase tracking-widest mb-6 border-b border-secondary/20 pb-2">Detalhes da Peça</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Nome do Produto</label>
                    <input 
                      type="text" 
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors font-headline text-lg" 
                      value={productData.name}
                      onChange={(e) => setProductData({...productData, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Marca / Designer</label>
                      <input 
                        type="text" 
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                        value={productData.brand}
                        onChange={(e) => setProductData({...productData, brand: e.target.value})}
                        placeholder="Ex: Chanel, Hermès..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Categoria</label>
                      <select 
                        className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors appearance-none"
                        value={productData.category}
                        onChange={(e) => setProductData({...productData, category: e.target.value})}
                      >
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
                        value={productData.sku}
                        onChange={(e) => setProductData({...productData, sku: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Descrição Detalhada</label>
                    <textarea 
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors min-h-[120px]"
                      value={productData.description}
                      onChange={(e) => setProductData({...productData, description: e.target.value})}
                    ></textarea>
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
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                      value={costPrice}
                      onChange={(e) => setCostPrice(maskCurrency(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Preço de Venda (R$)</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors font-bold text-secondary" 
                      value={salePrice}
                      onChange={(e) => setSalePrice(maskCurrency(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">% de Lucro</label>
                    <div className="w-full bg-primary/20 backdrop-blur-sm border border-secondary/10 rounded-lg py-3 px-4 text-emerald-400 font-bold">
                      {profitPercentage}%
                    </div>
                    <p className="text-[9px] text-surface/60 italic">Calculado automaticamente</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Quantidade em Estoque</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                      value={stock}
                      onChange={(e) => {
                        const newStock = e.target.value;
                        setStock(newStock);
                        setProductData({
                          ...productData, 
                          stock: Number(newStock),
                          individual_ids: syncIndividualIds(Number(newStock))
                        });
                      }}
                      min="0" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Desconto (%)</label>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Condição</label>
                    <select 
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors appearance-none"
                      value={productData.condition}
                      onChange={(e) => setProductData({...productData, condition: e.target.value})}
                    >
                      <option value="novo">Novo / Never Worn</option>
                      <option value="excelente">Excelente</option>
                      <option value="muito-bom">Muito Bom</option>
                      <option value="bom">Bom</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Acompanha</label>
                    <input 
                      type="text" 
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                      value={productData.accessories}
                      onChange={(e) => setProductData({...productData, accessories: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-surface/60">Cor Disponível</label>
                    <input 
                      type="text" 
                      className="w-full bg-primary/40 backdrop-blur-sm border border-secondary/20 rounded-lg py-3 px-4 text-surface focus:outline-none focus:border-secondary transition-colors" 
                      value={productData.colors}
                      onChange={(e) => setProductData({...productData, colors: e.target.value})}
                      placeholder="Ex: Preto, Nude, Caramelo (separe por vírgula)"
                    />
                  </div>

                  {productData.is_kit && productData.kit_items && productData.kit_items.length > 0 && (
                    <div className="md:col-span-2 space-y-4 p-5 rounded-2xl bg-white/5 border border-white/10">
                      <h4 className="text-secondary text-[10px] font-bold uppercase tracking-widest border-b border-secondary/20 pb-2">Itens Inclusos no Kit</h4>
                      <div className="space-y-3">
                        {productData.kit_items.map((item: any, idx: number) => (
                          <div key={idx} className="flex flex-col gap-1 p-3 rounded-xl bg-primary/20 border border-secondary/10">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-surface">{item.name}</span>
                              <span className="text-[10px] text-secondary uppercase font-bold">{item.brand}</span>
                            </div>
                            {item.description && <p className="text-xs text-surface/60 italic">{item.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {productData.individual_ids.length > 0 && (
                    <div className="md:col-span-2 space-y-4 p-4 rounded-xl bg-secondary/5 border border-secondary/10">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold">IDs Individuais de Rastreio</label>
                        <button 
                          type="button"
                          onClick={regenerateIndividualIds}
                          className="text-[10px] text-secondary hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">refresh</span>
                          Regenerar Todos
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {productData.individual_ids.map((id, index) => (
                          <div key={index} className="bg-primary/40 border border-secondary/20 rounded px-2 py-1 text-[10px] font-mono text-surface/80 flex items-center justify-between group">
                            <span>{id}</span>
                            <button 
                              type="button"
                              onClick={() => {
                                const newIds = [...productData.individual_ids];
                                const currentId = newIds[index];
                                const edited = prompt('Editar ID:', currentId);
                                if (edited) {
                                  newIds[index] = edited;
                                  setProductData({ ...productData, individual_ids: newIds });
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

              <div className="flex gap-4">
                <button type="submit" className="flex-1 py-4 rounded-xl bg-secondary text-primary hover:bg-secondary/90 transition-colors text-sm font-bold uppercase tracking-widest shadow-lg shadow-secondary/20">
                  Salvar Alterações
                </button>
                <Link to="/admin/inventory" className="flex-1 py-4 rounded-xl border border-surface/20 text-surface/60 hover:text-surface hover:border-surface/40 transition-colors text-sm font-bold uppercase tracking-widest text-center">
                  Cancelar
                </Link>
              </div>
            </form>
          </div>

          {/* Image Upload Column */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-secondary text-sm font-bold uppercase tracking-widest mb-4 border-b border-secondary/20 pb-2">Imagens</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-[3/4] rounded-xl overflow-hidden group border border-secondary/10">
                    <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
              
              {uploading && (
                <div className="text-center py-2">
                  <p className="text-xs text-secondary animate-pulse">Enviando imagens...</p>
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-6 space-y-4">
               <h3 className="text-secondary text-sm font-bold uppercase tracking-widest mb-2 border-b border-secondary/20 pb-2">Status</h3>
               <div className="flex items-center justify-between">
                  <span className="text-sm text-surface">Este produto é um Kit?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={productData.is_kit}
                      onChange={(e) => setProductData({...productData, is_kit: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary/20"></div>
                  </label>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-sm text-surface">Publicar no catálogo?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={productData.published}
                      onChange={(e) => setProductData({...productData, published: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary/20"></div>
                  </label>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-sm text-surface">Destaque na Home?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={productData.featured}
                      onChange={(e) => setProductData({...productData, featured: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-primary border border-secondary/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary/20"></div>
                  </label>
               </div>
            </div>
          </div>
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
