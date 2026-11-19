import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, GripVertical, Save, X, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { Banner } from '../../types';

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [bannerType, setBannerType] = useState<'topo' | 'rodape'>('topo');
  const [currentBanner, setCurrentBanner] = useState<Partial<Banner>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  const isRodapeBanner = (banner: Partial<Banner>) => {
    return (
      banner.mobile_image_url === 'rodape' ||
      banner.mobile_image_url === '#cta' ||
      banner.link === '#cta' ||
      banner.link === '#rodape' ||
      banner.link?.toLowerCase()?.includes('cta') ||
      banner.link?.toLowerCase()?.includes('rodape') ||
      banner.title?.toLowerCase()?.includes('ajuda') ||
      banner.title?.toLowerCase()?.includes('rodape') ||
      banner.title?.toLowerCase()?.includes('rodapé') ||
      banner.subtitle?.toLowerCase()?.includes('ajuda')
    );
  };

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      setBanners(data || []);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao carregar banners: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    const isRodape = isRodapeBanner(banner);
    setBannerType(isRodape ? 'rodape' : 'topo');
    setCurrentBanner(banner);
    setImageFile(null);
    setIsEditing(true);
  };

  const handleCreateTopo = () => {
    setBannerType('topo');
    setCurrentBanner({
      is_active: true,
      sort_order: banners.length,
      title: '',
      subtitle: '',
      button_text: 'Explorar Catálogo',
      link: '/produtos',
    });
    setImageFile(null);
    setIsEditing(true);
  };

  const handleCreateOrEditRodape = () => {
    const existingRodape = banners.find(isRodapeBanner);
    if (existingRodape) {
      handleEdit(existingRodape);
      return;
    }

    setBannerType('rodape');
    setCurrentBanner({
      is_active: true,
      sort_order: banners.length,
      title: 'PRECISA DE AJUDA PARA ENCONTRAR UMA PEÇA?',
      subtitle: 'Fale diretamente com os especialistas da Acervo dos Antigos. Podemos ter o item que você procura no nosso galpão físico.',
      button_text: 'FALAR NO WHATSAPP',
      link: '#cta',
      desktop_image_url: 'https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&q=80&w=2000',
    });
    setImageFile(null);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este banner?')) return;
    try {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
      setBanners(banners.filter(b => b.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let desktop_image_url = currentBanner.desktop_image_url;

      // Handle Image Upload
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `banner-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(`banners/${fileName}`, imageFile);
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(`banners/${fileName}`);
          
        desktop_image_url = urlData.publicUrl;
      }

      if (!desktop_image_url && bannerType === 'rodape') {
        desktop_image_url = 'https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&q=80&w=2000';
      }

      if (!desktop_image_url) {
        throw new Error('A imagem do banner é obrigatória.');
      }

      let finalLink = currentBanner.link?.trim() || '';
      if (bannerType === 'rodape') {
        if (!finalLink || finalLink === '') {
          finalLink = '#cta';
        }
      }

      const bannerData = {
        title: currentBanner.title ?? '',
        subtitle: currentBanner.subtitle ?? '',
        button_text: currentBanner.button_text ?? (bannerType === 'rodape' ? 'FALAR NO WHATSAPP' : 'Explorar Catálogo'),
        link: finalLink,
        mobile_image_url: bannerType, // 'rodape' or 'topo'
        is_active: currentBanner.is_active ?? true,
        sort_order: currentBanner.sort_order ?? 0,
        desktop_image_url,
      };

      if (currentBanner.id) {
        const { error } = await supabase.from('banners').update(bannerData).eq('id', currentBanner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('banners').insert([bannerData]);
        if (error) throw error;
      }
      
      setIsEditing(false);
      await loadBanners();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const rodapeBanner = banners.find(isRodapeBanner);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Banners da Loja</h2>
          <p className="text-zinc-400">Gerencie o banner principal do topo e o banner laranja de contato do rodapé.</p>
        </div>
        {!isEditing && (
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleCreateOrEditRodape}
              className="flex items-center px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-orange-400 border border-orange-500/30 font-medium rounded-sm transition-colors text-sm"
            >
              <MessageCircle size={16} className="mr-2 text-orange-500" />
              {rodapeBanner ? 'Editar Banner Rodapé' : '+ Banner Rodapé'}
            </button>
            <button 
              onClick={handleCreateTopo}
              className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-sm transition-colors text-sm"
            >
              <Plus size={16} className="mr-2" /> Novo Banner Topo
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm">
          <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">
                {currentBanner.id ? 'Editar Banner' : 'Novo Banner'}
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                bannerType === 'rodape' 
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {bannerType === 'rodape' ? 'RODAPÉ (LARANJA)' : 'TOPO (HERO)'}
              </span>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-5">
            {/* Posição do Banner */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Posição / Local do Banner</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBannerType('topo')}
                  className={`p-3 text-left rounded-sm border transition-all ${
                    bannerType === 'topo'
                      ? 'bg-zinc-800 border-orange-500 text-white ring-1 ring-orange-500'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-semibold text-sm">Banner Principal (Topo)</div>
                  <div className="text-xs text-zinc-500 mt-1">Destaque de entrada no início da página inicial.</div>
                </button>

                <button
                  type="button"
                  onClick={() => setBannerType('rodape')}
                  className={`p-3 text-left rounded-sm border transition-all ${
                    bannerType === 'rodape'
                      ? 'bg-orange-950/40 border-orange-500 text-white ring-1 ring-orange-500'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-semibold text-sm text-orange-400">Banner de Contato (Rodapé Laranja)</div>
                  <div className="text-xs text-zinc-500 mt-1">Seção laranja acima do rodapé com chamada para ação / WhatsApp.</div>
                </button>
              </div>
            </div>

            {/* Imagem do Banner */}
            <div className="bg-zinc-950/60 p-4 border border-zinc-800 rounded-sm">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                {bannerType === 'rodape' ? 'Imagem de Fundo do Banner (Opcional)' : 'Imagem do Banner *'}
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {currentBanner.desktop_image_url && !imageFile && (
                  <div className="relative group">
                    <img 
                      src={currentBanner.desktop_image_url} 
                      alt="Banner Preview" 
                      className="h-24 w-44 rounded-sm object-cover border border-zinc-700 shadow-md" 
                    />
                    <span className="absolute bottom-1 right-1 bg-black/70 text-[10px] text-zinc-300 px-1 rounded">Atual</span>
                  </div>
                )}
                {imageFile && (
                  <div className="text-xs text-emerald-400 font-medium">
                    ✓ Nova imagem selecionada: {imageFile.name}
                  </div>
                )}
                <div className="flex-1">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="text-zinc-300 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                  />
                  <p className="text-xs text-zinc-500 mt-1.5">
                    {bannerType === 'rodape' 
                      ? 'Esta imagem será mesclada ao fundo laranja do banner no rodapé.'
                      : 'Recomendado: 1920x600px para o topo.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Campos de Texto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Título</label>
                <input 
                  value={currentBanner.title || ''} 
                  placeholder={bannerType === 'rodape' ? 'PRECISA DE AJUDA PARA ENCONTRAR UMA PEÇA?' : 'Ex: PEÇAS CLÁSSICAS PARA MÁQUINAS ETERNAS'}
                  onChange={(e) => setCurrentBanner({...currentBanner, title: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Subtítulo</label>
                <input 
                  value={currentBanner.subtitle || ''} 
                  placeholder={bannerType === 'rodape' ? 'Fale diretamente com os especialistas...' : 'Descrição ou chamada secundária'}
                  onChange={(e) => setCurrentBanner({...currentBanner, subtitle: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Texto do Botão</label>
                <input 
                  value={currentBanner.button_text || ''} 
                  placeholder={bannerType === 'rodape' ? 'FALAR NO WHATSAPP' : 'Explorar Catálogo'}
                  onChange={(e) => setCurrentBanner({...currentBanner, button_text: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {bannerType === 'rodape' ? 'Link do Botão (Opcional)' : 'Link de Destino'}
                </label>
                <input 
                  value={currentBanner.link === '#cta' || currentBanner.link === '#rodape' ? '' : (currentBanner.link || '')} 
                  placeholder={bannerType === 'rodape' ? 'Vazio = Abre o WhatsApp da Loja' : '/produtos ou link externo'}
                  onChange={(e) => setCurrentBanner({...currentBanner, link: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
                />
                {bannerType === 'rodape' && (
                  <p className="text-[11px] text-zinc-500 mt-1">Se deixar vazio, o botão abrirá o WhatsApp cadastrado nas configurações da loja.</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="is_active" 
                checked={currentBanner.is_active ?? true}
                onChange={(e) => setCurrentBanner({...currentBanner, is_active: e.target.checked})}
                className="w-4 h-4 rounded-sm border-zinc-700 bg-zinc-950 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="is_active" className="text-sm text-zinc-300">Banner Ativo (Visível na loja)</label>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-zinc-800">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-sm transition-colors disabled:opacity-50"
              >
                <Save size={18} className="mr-2" /> {isSaving ? 'Salvando...' : 'Salvar Banner'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-400">Carregando banners...</div>
          ) : banners.length === 0 ? (
            <div className="p-12 text-center">
              <ImageIcon size={48} className="mx-auto text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-zinc-300 mb-2">Nenhum banner cadastrado</h3>
              <p className="text-zinc-500 mb-6">Adicione banners para dar destaque na página inicial.</p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={handleCreateTopo}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-sm text-sm"
                >
                  Criar Banner Topo
                </button>
                <button 
                  onClick={handleCreateOrEditRodape}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-orange-400 border border-orange-500/30 font-medium rounded-sm text-sm"
                >
                  Configurar Banner Rodapé
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/50 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                  <th className="px-4 py-3 md:px-6 md:py-4 font-medium w-16">Ordem</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Imagem</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Posição</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Título</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Status</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm">
                {banners.map((banner, index) => {
                  const isRodape = isRodapeBanner(banner);
                  return (
                    <tr key={banner.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 md:px-6 md:py-4 text-zinc-400">
                        <GripVertical size={16} className="cursor-move text-zinc-600 hover:text-white" />
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <img src={banner.desktop_image_url} alt="" className="h-12 w-24 object-cover rounded-sm border border-zinc-700" />
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        {isRodape ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            RODAPÉ (LARANJA)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            TOPO (HERO)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 text-white font-medium max-w-xs truncate">
                        {banner.title || (isRodape ? 'PRECISA DE AJUDA...' : 'Sem título')}
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium ${banner.is_active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'}`}>
                          {banner.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button onClick={() => handleEdit(banner)} className="text-zinc-400 hover:text-white transition-colors" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(banner.id)} className="text-zinc-400 hover:text-red-500 transition-colors" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
