import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, ArrowLeft, ImagePlus, X, Copy, ExternalLink, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';

type ProductForm = {
  title: string;
  slug: string;
  description: string;
  price: number;
  previous_price: number | null;
  stock: number;
  category_id: string | null;
  brand: string | null;
  model: string | null;
  vehicle: string | null;
  year: string | null;
  part_code: string | null;
  condition: string;
  compatibility: string | null;
  notes: string | null;
  badge: string | null;
  status: string;
  payment_link: string | null;
  payment_methods?: string[];
  require_shipping: boolean;
  is_featured: boolean;
};

const VEHICLE_TYPES = [
  'Chevrolet Omega', 'Chevrolet Opala', 'Chevrolet Caravan', 'Chevrolet Chevette',
  'Chevrolet Monza', 'Chevrolet Kadett', 'Chevrolet C10', 'Volkswagen Gol Quadrado',
  'Volkswagen Fusca', 'Volkswagen Brasília', 'Volkswagen Variant', 'Ford Corcel',
  'Ford Belina', 'Ford Del Rey', 'Ford Escort', 'Outros'
];

const isUuid = (val: any) => Boolean(val && typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));

export default function AdminProductForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id && isUuid(id));
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [images, setImages] = useState<{file: File | null, url: string | null, isPrimary: boolean, dbId?: string}[]>(
    Array(6).fill({ file: null, url: null, isPrimary: false })
  );
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, reset } = useForm<ProductForm>({
    defaultValues: {
      status: 'ativo',
      condition: 'Usada',
      stock: 1,
      price: 0,
      payment_link: '',
      require_shipping: true,
      is_featured: false,
      category_id: null
    }
  });

  const titleWatch = watch('title');
  const priceWatch = watch('price');
  const slugWatch = watch('slug');
  const currentUrl = window.location.origin + '/produto/' + slugWatch;

  useEffect(() => {
    if (isEditMode && id) {
      setIsLoading(true);
      loadProduct(id);
    } else {
      setIsLoading(false);
      reset({
        status: 'ativo',
        condition: 'Usada',
        stock: 1,
        price: 0,
        payment_link: '',
        require_shipping: true,
        is_featured: false,
        title: '',
        slug: '',
        description: '',
        category_id: null,
        brand: '',
        model: '',
        vehicle: '',
        year: '',
        part_code: '',
        compatibility: '',
        notes: '',
        badge: '',
        previous_price: undefined
      });
      setImages(Array(6).fill({ file: null, url: null, isPrimary: false }));
    }
  }, [id, isEditMode]);

  const loadProduct = async (productId: string) => {
    try {
      const { data, error } = await supabase.from('products').select('*, images:product_images(*)').eq('id', productId).single();
      if (error) throw error;
      
      reset({
        title: data.title || '',
        slug: data.slug || '',
        description: data.description || '',
        price: data.price || 0,
        previous_price: data.previous_price,
        stock: data.stock !== undefined ? data.stock : 1,
        category_id: isUuid(data.category_id) ? data.category_id : null,
        brand: data.brand || '',
        model: data.model || '',
        vehicle: data.vehicle || '',
        year: data.year || '',
        part_code: data.part_code || '',
        condition: data.condition || 'Usada',
        compatibility: data.compatibility || '',
        notes: data.notes || '',
        badge: data.badge || '',
        status: data.status || 'ativo',
        payment_link: data.payment_link || '',
        require_shipping: data.require_shipping !== false, // Default to true if null/undefined
        is_featured: data.is_featured || false
      });

      if (data.images && data.images.length > 0) {
        const sorted = data.images.sort((a: any, b: any) => a.sort_order - b.sort_order);
        const newImages = Array(6).fill({ file: null, url: null, isPrimary: false });
        sorted.forEach((img: any, i: number) => {
          if (i < 6) {
            newImages[i] = { file: null, url: img.url, isPrimary: img.is_primary, dbId: img.id };
          }
        });
        if (!newImages.find(img => img.isPrimary) && newImages[0].url) {
            newImages[0].isPrimary = true;
        }
        setImages(newImages);
      }
    } catch(err) {
      console.error(err);
      alert('Erro ao carregar produto.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = () => {
    if (titleWatch && !id) {
      const slug = titleWatch
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setValue('slug', slug);
    }
  };

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...images];
        newImages[index] = { ...newImages[index], file, url: reader.result as string };
        
        // Auto set primary if it's the first image ever uploaded
        if (index === 0 && !images.some(img => img.isPrimary)) {
          newImages[0].isPrimary = true;
        }
        setImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages[index] = { file: null, url: null, isPrimary: false };
    // Re-assign primary if needed
    if (images[index].isPrimary) {
      const nextAvailable = newImages.findIndex(img => img.url);
      if (nextAvailable !== -1) newImages[nextAvailable].isPrimary = true;
    }
    setImages(newImages);
  };

  const setPrimaryImage = (index: number) => {
    const newImages = images.map((img, i) => ({ ...img, isPrimary: i === index }));
    setImages(newImages);
  };

  const onSubmit = async (data: ProductForm) => {
    setIsSaving(true);
    try {
      const cleanCategoryId = isUuid(data.category_id) ? data.category_id!.trim() : null;

      const productPayload: any = { 
        title: (data.title || '').trim(),
        slug: (data.slug || '').trim(),
        description: (data.description || '').trim(),
        price: Number(data.price) || 0,
        previous_price: data.previous_price ? Number(data.previous_price) : null,
        stock: data.stock !== undefined && data.stock !== null ? Number(data.stock) : 1,
        category_id: cleanCategoryId,
        brand: data.brand?.trim() || null,
        model: data.model?.trim() || null,
        vehicle: data.vehicle?.trim() || null,
        year: data.year?.trim() || null,
        part_code: data.part_code?.trim() || null,
        condition: data.condition || 'Usada',
        compatibility: data.compatibility?.trim() || null,
        notes: data.notes?.trim() || null,
        badge: data.badge?.trim() || null,
        status: data.status || 'ativo',
        require_shipping: data.require_shipping !== false,
        is_featured: Boolean(data.is_featured),
        payment_link: data.payment_link && data.payment_link.trim().length > 0 ? data.payment_link.trim() : null
      };
      
      let productId = isEditMode ? id! : null;

      if (isEditMode && productId) {
        const { error } = await supabase.from('products').update(productPayload).eq('id', productId);
        if (error) throw error;
      } else {
        const { data: newProd, error } = await supabase.from('products').insert([productPayload]).select().single();
        if (error) throw error;
        productId = newProd.id;
      }

      // Handle images logic
      if (productId && isUuid(productId)) {
        // Delete old ones first for simplicity (or just manage them properly, but let's clear and re-insert for MVP robustness)
        await supabase.from('product_images').delete().eq('product_id', productId);
        
        let hadUploadError = false;
        const imageInserts = [];
        for (let i = 0; i < 6; i++) {
          const img = images[i];
          if (img.url) {
            let finalUrl = img.url;
            
            // If it's a new file, upload it
            if (img.file) {
              const fileExt = img.file.name.split('.').pop();
              const fileName = `${productId}-${i}-${Math.random()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage.from('product-images').upload(`products/${fileName}`, img.file, {
                cacheControl: '3600',
                upsert: true
              });
              if (!uploadError) {
                const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(`products/${fileName}`);
                finalUrl = urlData.publicUrl;
              } else {
                console.warn('Falha no upload do Supabase Storage:', uploadError);
                hadUploadError = true;
              }
            }

            // Prepare insert (accept http and https)
            if (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) {
              imageInserts.push({
                product_id: productId,
                url: finalUrl,
                is_primary: img.isPrimary,
                sort_order: i
              });
            }
          }
        }

        if (imageInserts.length > 0) {
          await supabase.from('product_images').insert(imageInserts);
        }

        if (hadUploadError) {
          alert('Atenção: O anúncio foi salvo, mas uma ou mais fotos não puderam ser enviadas para o Supabase Storage. Verifique se o bucket "product-images" está criado e público no Supabase.');
        }
      }
      
      // Warm up cache so the link opens instantly for anyone
      try {
        const cachedProd = {
          id: productId,
          ...productPayload,
          images: images.filter(img => img.url).map((img, idx) => ({ id: `img-${idx}`, url: img.url, is_primary: img.isPrimary, sort_order: idx }))
        };
        const raw = localStorage.getItem('acervo_cache_v2_product_' + data.slug);
        localStorage.setItem('acervo_cache_v2_product_' + data.slug, JSON.stringify({ data: cachedProd, expiry: Date.now() + 15 * 60 * 1000 }));
      } catch (e) {}

      setPublishedUrl(window.location.origin + '/produto/' + data.slug);
      window.scrollTo(0, 0);
      
      if (!id) {
         alert('Anúncio publicado com sucesso!');
      } else {
         alert('Anúncio atualizado com sucesso!');
      }

    } catch (error: any) {
      console.error(error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-white text-center py-10">Carregando produto...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate('/admin')} className="text-zinc-400 hover:text-white mr-4 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">{id ? 'Editar Anúncio' : 'Novo Anúncio'}</h2>
          <p className="text-zinc-400 text-sm">Preencha os dados da peça de forma completa.</p>
        </div>
      </div>

      {publishedUrl && (
        <div className="mb-8 bg-emerald-950/40 border border-emerald-900/50 p-6 rounded-sm">
          <h3 className="text-emerald-500 font-bold text-lg mb-2">ANÚNCIO PUBLICADO</h3>
          <p className="text-zinc-300 text-sm mb-4">Link do anúncio: <a href={publishedUrl} target="_blank" className="text-emerald-400 hover:underline">{publishedUrl}</a></p>
          <div className="flex space-x-3">
            <button onClick={() => navigator.clipboard.writeText(publishedUrl)} className="flex items-center text-xs bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-sm hover:text-white text-zinc-300 transition-colors">
              <Copy size={14} className="mr-2" /> COPIAR LINK
            </button>
            <a href={publishedUrl} target="_blank" className="flex items-center text-xs bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-sm hover:text-white text-zinc-300 transition-colors">
              <ExternalLink size={14} className="mr-2" /> ABRIR ANÚNCIO
            </a>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* IMAGENS */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h3 className="text-lg font-semibold text-white">Imagens da Peça (Até 6)</h3>
            <span className="text-xs text-zinc-500 font-medium">Você pode adicionar até 6 imagens.</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img, index) => (
              <div key={index} className="relative aspect-square bg-zinc-950 border border-zinc-800 rounded-sm overflow-hidden flex flex-col items-center justify-center group">
                {img.url ? (
                  <>
                    <img src={img.url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2">
                      <button type="button" onClick={() => removeImage(index)} className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded-sm">Excluir</button>
                      {!img.isPrimary && (
                        <button type="button" onClick={() => setPrimaryImage(index)} className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded-sm">Tornar Principal</button>
                      )}
                    </div>
                    {img.isPrimary && <span className="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">PRINCIPAL</span>}
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-zinc-800/50 transition-colors">
                    <ImagePlus className="w-8 h-8 text-zinc-600 mb-2" />
                    <span className="text-xs text-zinc-500 font-medium">Imagem {index + 1}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange(index, e)} />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* INFORMAÇÕES BÁSICAS */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm space-y-6">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-3">Informações Básicas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Título do Anúncio *</label>
              <input {...register('title', { required: true })} onBlur={generateSlug} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Slug (URL) *</label>
              <input {...register('slug', { required: true })} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm text-zinc-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Veículo Principal (Opcional)</label>
              <select {...register('vehicle')} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2.5 px-3 focus:outline-none focus:border-orange-500">
                <option value="">Selecione...</option>
                {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Condição da Peça *</label>
              <select {...register('condition', { required: true })} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2.5 px-3 focus:outline-none focus:border-orange-500">
                <option value="Nova">Nova</option>
                <option value="Usada">Usada</option>
                <option value="Restaurada">Restaurada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Estoque *</label>
              <input {...register('stock', { required: true, valueAsNumber: true })} type="number" min="0" className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Código da Peça (Opcional)</label>
              <input {...register('part_code')} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Descrição</label>
            <textarea {...register('description')} rows={5} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"></textarea>
          </div>
        </div>

        {/* PREÇO E PAGAMENTO */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm space-y-6">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-3">Preço e Pagamento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Preço Atual (R$) *</label>
              <input {...register('price', { required: true, valueAsNumber: true })} type="number" step="0.01" className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 font-medium" />
              {priceWatch > 0 && (
                <p className="text-xs text-emerald-500 mt-1 font-medium">12x de {(priceWatch / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Preço Anterior (Opcional - R$)</label>
              <input {...register('previous_price', { valueAsNumber: true })} type="number" step="0.01" className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Métodos de Pagamento Disponíveis</label>
              <div className="flex space-x-6">
                {['PIX', 'Cartão de crédito', 'Débito'].map((method) => (
                  <label key={method} className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" value={method} {...register('payment_methods')} className="w-4 h-4 rounded-sm border-zinc-700 bg-zinc-950 text-orange-500 focus:ring-orange-500" />
                    <span className="text-sm text-zinc-300">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 pt-2">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Link de Pagamento Seguro (Provedor Externo)</label>
              <input {...register('payment_link')} type="url" placeholder="https://mercadopago..." className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500" />
            </div>

            <div className="md:col-span-2 pt-2">
              <label className="flex items-center space-x-2 cursor-pointer bg-zinc-950 border border-zinc-800 p-3 rounded-sm">
                <input type="checkbox" {...register('require_shipping')} className="w-4 h-4 rounded-sm border-zinc-700 bg-zinc-950 text-orange-500 focus:ring-orange-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">Exigir Dados do Cliente no Checkout</span>
                  <span className="text-xs text-zinc-500">Se ativo, o cliente precisará preencher nome, endereço, etc., antes de ir para o link de pagamento (Ideal para PIX). Se inativo, vai direto para o link (Ideal para links de cartão que já pedem dados).</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* STATUS */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Status do Anúncio</label>
              <select {...register('status')} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2.5 px-3 focus:outline-none focus:border-orange-500">
                <option value="ativo">Ativo (Público)</option>
                <option value="rascunho">Rascunho (Oculto)</option>
                <option value="pausado">Pausado</option>
                <option value="esgotado">Esgotado</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
               <label className="flex items-center space-x-2 cursor-pointer">
                 <input type="checkbox" {...register('is_featured')} className="w-4 h-4 rounded-sm border-zinc-700 bg-zinc-950 text-orange-500 focus:ring-orange-500" />
                 <span className="text-sm font-medium text-white">Anúncio em Destaque na Home</span>
               </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 pb-12">
          <button type="submit" disabled={isSaving} className="flex items-center px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-sm transition-colors disabled:opacity-50 text-lg">
            {isSaving ? 'Salvando...' : <><Save size={20} className="mr-2" /> Salvar Anúncio</>}
          </button>
        </div>
      </form>
    </div>
  );
}
