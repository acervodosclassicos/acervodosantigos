import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { ArrowLeft, Package, MapPin, CreditCard, Truck } from 'lucide-react';

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      if (!hasSupabaseConfig) {
        setIsLoading(false);
        return;
      }
      try {
        let loadedOrder: any = null;
        const { data, error } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('id', id)
          .maybeSingle();
        
        if (!error && data) {
          loadedOrder = data;
        }

        if (!loadedOrder && id) {
          const { fetchOrderByIdFromDatabase } = await import('../../lib/ordersService');
          loadedOrder = await fetchOrderByIdFromDatabase(id);
        }

        if (loadedOrder && id) {
          try {
            const statusMap = JSON.parse(localStorage.getItem('acervo_order_status_map') || '{}');
            if (statusMap[id]) {
              loadedOrder.status = statusMap[id];
            }
          } catch {}
        }

        setOrder(loadedOrder);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#0B0D10]">
        <div className="w-8 h-8 border-4 border-[#FF7048] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#0B0D10] text-[#F5F5F5]">
        <h2 className="text-2xl font-bold mb-4">Pedido não encontrado</h2>
        <Link to="/minha-conta" className="text-[#FF7048] hover:underline">Voltar para Minha Conta</Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D10] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <Link to="/minha-conta" className="inline-flex items-center text-sm font-medium text-[#A4ABB7] hover:text-[#F5F5F5] mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Voltar aos pedidos
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl text-[#F5F5F5]">
              Pedido <span className="text-[#FF7048]">#{order.id.split('-')[0].toUpperCase()}</span>
            </h1>
            <p className="text-[#A4ABB7] mt-1 text-sm">Realizado em {new Date(order.created_at).toLocaleString('pt-BR')}</p>
          </div>
          <div className="px-4 py-2 bg-[#141820] border border-[#2B303A] rounded-sm text-xs font-bold text-[#F5F5F5] uppercase tracking-wider text-center">
            {order.status}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#141820] border border-[#2B303A] p-5 rounded-sm">
            <div className="flex items-center text-[#FF7048] mb-3">
              <MapPin size={20} className="mr-2" /> 
              <h3 className="font-bold text-[#F5F5F5]">Entrega</h3>
            </div>
            <div className="text-sm text-[#A4ABB7] space-y-1">
              <p className="font-medium text-[#F5F5F5]">{order.customer_name}</p>
              <p>{order.address_street}, {order.address_number} {order.address_complement && `- ${order.address_complement}`}</p>
              <p>{order.address_neighborhood}</p>
              <p>{order.address_city} - {order.address_state}</p>
              <p className="font-mono">CEP: {order.address_cep}</p>
            </div>
          </div>
          
          <div className="bg-[#141820] border border-[#2B303A] p-5 rounded-sm">
            <div className="flex items-center text-[#FF7048] mb-3">
              <CreditCard size={20} className="mr-2" /> 
              <h3 className="font-bold text-[#F5F5F5]">Pagamento</h3>
            </div>
            <div className="text-sm text-[#A4ABB7] space-y-2">
              {order.payment_link ? (
                <>
                  <p>Ambiente externo com criptografia segura.</p>
                  {order.status === 'aguardando pagamento' && (
                    <a 
                      href={order.payment_link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block bg-[#FF7048] hover:bg-[#ff5d30] text-white font-bold py-2 px-3.5 rounded-sm text-xs uppercase tracking-wider transition-all shadow-[0_4px_16px_rgba(255,112,72,0.3)]"
                    >
                      Efetuar Pagamento
                    </a>
                  )}
                </>
              ) : (
                <p>Nenhum link configurado.</p>
              )}
            </div>
          </div>

          <div className="bg-[#141820] border border-[#2B303A] p-5 rounded-sm">
            <div className="flex items-center text-[#FF7048] mb-3">
              <Truck size={20} className="mr-2" /> 
              <h3 className="font-bold text-[#F5F5F5]">Rastreamento</h3>
            </div>
            <div className="text-sm text-[#A4ABB7] space-y-1">
              {order.tracking_code ? (
                <>
                  <p className="font-mono text-[#F5F5F5] mb-2">{order.tracking_code}</p>
                  {order.tracking_url && (
                    <a 
                      href={order.tracking_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block text-[#FF7048] hover:underline"
                    >
                      Acompanhar Entrega
                    </a>
                  )}
                </>
              ) : (
                <p className="text-xs text-[#A4ABB7]">Rastreamento em preparação. Você receberá o código assim que a peça for despachada.</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#141820] border border-[#2B303A] rounded-sm overflow-hidden shadow-xl">
          <div className="p-5 border-b border-[#2B303A] bg-[#0B0D10]/50">
            <h3 className="font-bold text-[#F5F5F5] flex items-center">
              <Package size={20} className="text-[#FF7048] mr-2" /> Itens do Pedido
            </h3>
          </div>
          <div className="p-5">
            <ul className="divide-y divide-[#2B303A]">
              {order.items?.map((item: any) => (
                <li key={item.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-[#F5F5F5]">{item.product_title}</p>
                    <p className="text-xs text-[#A4ABB7] mt-1">Qtd: {item.quantity}</p>
                  </div>
                  <div className="font-mono font-medium text-[#F5F5F5] ml-4 shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </li>
              ))}
            </ul>
            
            <div className="mt-6 pt-6 border-t border-[#2B303A] space-y-3">
              <div className="flex justify-between text-sm text-[#A4ABB7]">
                <span>Subtotal</span>
                <span className="font-mono text-[#F5F5F5]">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#A4ABB7]">
                <span>Frete</span>
                <span className="font-mono text-[#F5F5F5]">{formatCurrency(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[#F5F5F5] pt-3 border-t border-[#2B303A]">
                <span>Total</span>
                <span className="text-[#FF7048] font-mono">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
