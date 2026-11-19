import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Filter, Copy, ExternalLink, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('products').select('*, images:product_images(*)').order('created_at', { ascending: false });
      
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente "${title}"?\n\nEsta ação não poderá ser desfeita.`)) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        setProducts(products.filter(p => p.id !== id));
      } catch (error: any) {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const { id, images, created_at, updated_at, payment_link, ...productData } = product as any;
      const newSlug = `${productData.slug}-copia-${Math.floor(Math.random() * 1000)}`;
      
      // Exhaustively remove any payment link alias variants so nothing leaks
      delete (productData as any).paymentLink;
      delete (productData as any).payment_url;
      delete (productData as any).paymentUrl;
      delete (productData as any).checkout_url;
      delete (productData as any).checkoutUrl;
      delete (productData as any).gateway_link;
      delete (productData as any).gatewayLink;
      
      const isUuid = (val: any) => Boolean(val && typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));
      productData.category_id = isUuid(productData.category_id) ? productData.category_id.trim() : null;

      const { data: newProd, error } = await supabase.from('products').insert([{
        ...productData,
        title: `${productData.title} (Cópia)`,
        slug: newSlug,
        status: 'rascunho',
        payment_link: null // Duplicate must start with blank payment link to prevent leaking
      }]).select().single();
      
      if (error) throw error;
      
      navigate(`/admin/produtos/editar/${newProd.id}`);
    } catch (error: any) {
      alert('Erro ao duplicar: ' + error.message);
    }
  };

  const shareProduct = (product: Product) => {
    const url = window.location.origin + '/produto/' + product.slug;
    const priceText = product.price ? ` - ${formatCurrency(product.price)}` : '';
    const text = `Confira "${product.title}"${priceText} no Acervo dos Antigos:\n${url}`;
    
    if (navigator.share) {
      navigator.share({ title: `${product.title}${priceText}`, text: text, url: url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      showToast('Link do anúncio copiado! Cole no WhatsApp para carregar a foto e valor.');
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.part_code && p.part_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.vehicle && p.vehicle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Anúncios</h2>
          <p className="text-zinc-400">Gerencie todo o inventário da loja.</p>
        </div>
        <Link 
          to="/admin/produtos/novo" 
          className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-sm transition-colors"
        >
          <Plus size={18} className="mr-2" /> Novo Anúncio
        </Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-sm mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, veículo ou código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-2 rounded-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex items-center">
            <Filter className="text-zinc-500 mr-2" size={18} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-white px-4 py-2 rounded-sm focus:outline-none focus:border-orange-500"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="rascunho">Rascunhos</option>
              <option value="pausado">Pausados</option>
              <option value="esgotado">Esgotados</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Produto</th>
                <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Condição / Veículo</th>
                <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Preço</th>
                <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Estoque</th>
                <th className="px-4 py-3 md:px-6 md:py-4 font-medium">Status</th>
                <th className="px-4 py-3 md:px-6 md:py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-400">Carregando anúncios...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-400">Nenhum anúncio encontrado.</td></tr>
              ) : (
                filteredProducts.map((product) => {
                  const primaryImage = product.images?.find(img => img.is_primary)?.url || product.images?.[0]?.url;
                  
                  return (
                    <tr key={product.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 shrink-0 rounded-sm bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center mr-4">
                            {primaryImage ? (
                              <img src={primaryImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-zinc-600 text-xs">Sem foto</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white" title={product.title}>{product.title}</div>
                            {product.part_code && <div className="text-xs text-zinc-500">Cód: {product.part_code}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <div className="text-zinc-300">{product.vehicle || '-'}</div>
                        <div className="text-xs text-zinc-500">{product.condition}</div>
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <div className="text-white font-medium">{formatCurrency(product.price)}</div>
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 text-zinc-300">
                        {product.stock} un.
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium border
                          ${product.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                            product.status === 'esgotado' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                            product.status === 'pausado' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                            'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'}`}
                        >
                          {product.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <Link to={`/admin/produtos/editar/${product.id}`} className="text-zinc-400 hover:text-white transition-colors" title="Editar">
                            <Edit2 size={16} />
                          </Link>
                          <button onClick={() => shareProduct(product)} className="text-zinc-400 hover:text-blue-400 transition-colors" title="Compartilhar">
                            <Share2 size={16} />
                          </button>
                          <button onClick={() => handleDuplicate(product)} className="text-zinc-400 hover:text-emerald-400 transition-colors" title="Duplicar">
                            <Copy size={16} />
                          </button>
                          <a href={`/produto/${product.slug}`} target="_blank" className="text-zinc-400 hover:text-orange-400 transition-colors" title={`Ver anúncio: ${product.title}`}>
                            <ExternalLink size={16} />
                          </a>
                          <button onClick={() => handleDelete(product.id, product.title)} className="text-zinc-400 hover:text-red-500 transition-colors" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-medium text-sm px-5 py-3 rounded-sm shadow-2xl animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
