import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { User, Package, LogOut, MapPin, AlertCircle, Heart } from 'lucide-react';

export default function MyAccount() {
  const { user,  signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pedidos');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      navigate('/login');
      return;
    }

    async function fetchOrders() {
      if (!hasSupabaseConfig) {
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;

        // Apply local status overrides if present
        let statusMap: Record<string, string> = {};
        try {
          statusMap = JSON.parse(localStorage.getItem('acervo_order_status_map') || '{}');
        } catch {}

        const normalized = (data || []).map(order => ({
          ...order,
          status: statusMap[order.id] || order.status
        }));

        setOrders(normalized);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="bg-[#0B0D10] min-h-[75vh] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8 border-b border-[#2B303A] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl text-[#F5F5F5]">Minha Conta</h1>
            <p className="text-[#A4ABB7] mt-1 text-sm">Bem-vindo, {user?.user_metadata?.full_name || user.email}.</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center text-[#A4ABB7] hover:text-red-400 transition-colors px-4 py-2 border border-[#2B303A] rounded-sm hover:border-red-500/50 bg-[#141820] w-max cursor-pointer text-xs sm:text-sm font-semibold uppercase tracking-wider"
          >
            <LogOut size={16} className="mr-2" />
            Sair da Conta
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar Tabs */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="bg-[#141820] border border-[#2B303A] rounded-sm overflow-hidden flex flex-col">
              <button 
                onClick={() => setActiveTab('pedidos')}
                className={`flex items-center w-full text-left px-5 py-4 text-sm font-medium transition-colors border-l-4 cursor-pointer ${activeTab === 'pedidos' ? 'border-[#FF7048] text-white bg-[#1B2029]' : 'border-transparent text-[#A4ABB7] hover:bg-[#1B2029] hover:text-white'}`}
              >
                <Package size={18} className="mr-3 text-[#FF7048]" />
                Meus Pedidos
              </button>
              <button 
                onClick={() => setActiveTab('dados')}
                className={`flex items-center w-full text-left px-5 py-4 text-sm font-medium transition-colors border-l-4 border-t border-t-[#2B303A] cursor-pointer ${activeTab === 'dados' ? 'border-[#FF7048] text-white bg-[#1B2029]' : 'border-l-transparent text-[#A4ABB7] hover:bg-[#1B2029] hover:text-white'}`}
              >
                <User size={18} className="mr-3 text-[#FF7048]" />
                Meus Dados
              </button>
              <Link 
                to="/favoritos"
                className="flex items-center w-full text-left px-5 py-4 text-sm font-medium transition-colors border-l-4 border-t border-t-[#2B303A] border-transparent text-[#A4ABB7] hover:bg-[#1B2029] hover:text-white"
              >
                <Heart size={18} className="mr-3 text-red-500" />
                Favoritos
              </Link>
            </nav>
          </aside>

          {/* Content Area */}
          <div className="flex-1">
            {activeTab === 'pedidos' && (
              <div className="bg-[#141820] border border-[#2B303A] rounded-sm p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2B303A]">
                  <div>
                    <h3 className="text-xl font-bold text-[#F5F5F5]">Meus Pedidos</h3>
                    <p className="text-xs text-[#A4ABB7] mt-1">Acompanhe suas compras e histórico de pedidos</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-sm bg-[#1B2029] text-[#F5F5F5] font-mono border border-[#2B303A]">
                    {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
                  </span>
                </div>
                
                {isLoading ? (
                  <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#FF7048] border-t-transparent rounded-full animate-spin"></div></div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12 border border-[#2B303A] border-dashed rounded-sm p-8 bg-[#0B0D10]/40">
                    <Package className="mx-auto text-zinc-600 mb-3" size={40} />
                    <p className="text-[#F5F5F5] font-bold mb-1">Você ainda não realizou nenhum pedido</p>
                    <p className="text-[#A4ABB7] text-xs mb-5">Quando você finalizar compras pelo catálogo ou links de produtos, seus pedidos aparecerão aqui.</p>
                    <Link to="/produtos" className="inline-block px-5 py-2.5 bg-[#FF7048] hover:bg-[#ff5d30] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-[0_4px_16px_rgba(255,112,72,0.3)]">
                      Ver catálogo de peças
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {orders.map(order => {
                      const isPaid = (order.status || '').toLowerCase() === 'pago';
                      const orderCode = `PED-${(order.id || '').slice(-6).toUpperCase()}`;
                      const orderDate = new Date(order.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={order.id} className="border border-[#2B303A] rounded-sm p-5 hover:border-[#FF7048]/50 transition-colors bg-[#0B0D10]/60">
                          {/* Order Header */}
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 pb-4 border-b border-[#2B303A]">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-[#F5F5F5] font-mono">{orderCode}</span>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${
                                  isPaid 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {isPaid ? 'Pago' : 'Aguardando Pagamento'}
                                </span>
                              </div>
                              <div className="text-xs text-[#A4ABB7] mt-1">Data: {orderDate}</div>
                            </div>
                            
                            <div className="sm:text-right">
                              <span className="text-xs text-[#A4ABB7] block">Total do Pedido:</span>
                              <span className="text-lg font-bold text-[#FF7048] font-mono">{formatCurrency(order.total)}</span>
                            </div>
                          </div>

                          {/* Items List */}
                          <div className="mb-4 space-y-2">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((it: any, idx: number) => (
                                <div key={it.id || idx} className="flex justify-between items-center text-xs text-[#F5F5F5] py-1.5 bg-[#141820] px-3 rounded-sm border border-[#2B303A]/60">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#FF7048]">{it.quantity}x</span>
                                    <span className="font-medium text-[#F5F5F5]">{it.product_title}</span>
                                  </div>
                                  <span className="font-mono text-[#A4ABB7]">{formatCurrency(it.price * (it.quantity || 1))}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-[#A4ABB7] italic">Peça sob consulta</p>
                            )}
                          </div>

                          {/* Footer with Payment & Details */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2B303A] text-xs">
                            <div className="text-[#A4ABB7] flex items-center gap-1.5">
                              <span>Forma:</span>
                              <span className="text-zinc-200 font-medium">PIX / Cartão de Crédito</span>
                              {order.payment_link && !isPaid && (
                                <a
                                  href={order.payment_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 inline-flex items-center text-xs font-bold text-[#FF7048] hover:text-[#ff5d30] underline"
                                >
                                  Pagar agora
                                </a>
                              )}
                            </div>
                            
                            <Link 
                              to={`/pedido/${order.id}`} 
                              className="font-bold text-[#FF7048] hover:text-[#ff5d30] transition-colors"
                            >
                              Ver detalhes completos &rarr;
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dados' && (
              <div className="bg-[#141820] border border-[#2B303A] rounded-sm p-6 shadow-xl">
                <h3 className="text-xl font-bold text-[#F5F5F5] mb-6">Meus Dados Pessoais</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#A4ABB7] mb-1">E-mail (Login)</label>
                    <div className="text-zinc-200 bg-[#0B0D10] border border-[#2B303A] px-3 py-2.5 rounded-sm">{user.email}</div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#A4ABB7] mb-1">Nome Completo</label>
                    <div className="text-zinc-200 bg-[#0B0D10] border border-[#2B303A] px-3 py-2.5 rounded-sm">{user?.user_metadata?.full_name || 'Não informado'}</div>
                  </div>
                  <p className="text-xs text-[#A4ABB7] mt-4">Para alterar seus dados cadastrais, por favor entre em contato com nosso atendimento via WhatsApp.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
