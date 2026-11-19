import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  MessageCircle, 
  ArrowLeft, 
  ShoppingBag, 
  Package, 
  ShieldCheck, 
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { formatCurrency, formatWhatsAppNumber, cn } from '../lib/utils';
import { useSettings } from '../store/useSettings';
import { fetchOrderByIdFromDatabase } from '../lib/ordersService';

interface OrderItemDisplay {
  title: string;
  quantity: number;
  price: number;
  imageUrl?: string | null;
}

interface OrderDisplayData {
  orderId?: string;
  orderNumber?: string;
  total?: number;
  items?: OrderItemDisplay[];
  customerName?: string;
}

export default function PaymentConfirmed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [order, setOrder] = useState<OrderDisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadOrderData() {
      // 1. Check for identifier in query parameters sent by gateway or custom link
      // Common gateway params: id, pedido, external_reference, preference_id, payment_id
      const queryParam = 
        searchParams.get('id') || 
        searchParams.get('pedido') || 
        searchParams.get('order_id') || 
        searchParams.get('external_reference');

      if (queryParam) {
        try {
          const dbOrder = await fetchOrderByIdFromDatabase(queryParam);
          if (dbOrder && isMounted) {
            setOrder({
              orderId: dbOrder.id,
              orderNumber: `PED-${dbOrder.id.slice(-6).toUpperCase()}`,
              total: dbOrder.total,
              customerName: dbOrder.customer_name,
              items: (dbOrder.items || []).map(it => ({
                title: it.product_title,
                quantity: it.quantity,
                price: it.price,
                imageUrl: it.image_url || null,
              })),
            });
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Erro ao consultar pedido por queryParam:', err);
        }
      }

      // 2. Fallback to active order in sessionStorage
      try {
        const stored = sessionStorage.getItem('acervo_last_order');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.orderNumber || parsed.orderId)) {
            if (isMounted) {
              setOrder({
                orderId: parsed.orderId,
                orderNumber: parsed.orderNumber,
                total: parsed.total,
                customerName: parsed.customerName,
                items: parsed.items || [],
              });
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao consultar sessionStorage:', err);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadOrderData();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const handleCopyOrderNumber = () => {
    if (!order?.orderNumber) return;
    navigator.clipboard.writeText(order.orderNumber);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  };

  // Official Store WhatsApp Number
  const rawWhatsapp = settings?.whatsapp;
  const officialPhone = formatWhatsAppNumber(rawWhatsapp);

  // Build WhatsApp Message according to specifications:
  // "Olá! Meu pagamento foi aprovado e gostaria de enviar o comprovante da minha compra.
  // Número do pedido: [número do pedido, se disponível]
  // Valor da compra: [valor do pedido, se disponível]
  // Podem me ajudar, por favor?"
  const messageLines: string[] = [
    'Olá! Meu pagamento foi aprovado e gostaria de enviar o comprovante da minha compra.'
  ];

  if (order?.orderNumber) {
    messageLines.push(`Número do pedido: #${order.orderNumber}`);
  }

  if (order?.total && order.total > 0) {
    messageLines.push(`Valor da compra: ${formatCurrency(order.total)}`);
  }

  messageLines.push('Podem me ajudar, por favor?');

  const formattedMessage = messageLines.join('\n\n');
  const whatsappUrl = `https://wa.me/${officialPhone}?text=${encodeURIComponent(formattedMessage)}`;

  return (
    <div className="bg-zinc-950 min-h-screen py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        
        {/* Main Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-5 sm:p-8 md:p-10 shadow-2xl text-center">
          
          {/* Animated Success Icon */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-25" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/15">
              <CheckCircle2 className="w-11 h-11 sm:w-14 sm:h-14" />
            </div>
          </div>

          {/* Mandatory Titles */}
          <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight mb-3">
            Pagamento confirmado!
          </h1>
          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-6">
            Seu pagamento foi aprovado e sua compra foi concluída com sucesso. Obrigado pela sua preferência!
          </p>

          {/* Order Reference Badge (when available) */}
          {order?.orderNumber && (
            <div className="inline-flex items-center gap-2.5 bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-sm shadow-inner mb-6">
              <span className="text-zinc-400 text-xs sm:text-sm font-medium">Número do Pedido:</span>
              <span className="text-orange-500 font-mono font-bold text-sm sm:text-base tracking-wider">
                #{order.orderNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="ml-1 text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                title="Copiar número do pedido"
                aria-label="Copiar número do pedido"
              >
                {hasCopied ? (
                  <span className="text-emerald-400 flex items-center text-xs gap-1 font-sans font-medium">
                    <Check size={14} /> Copiado
                  </span>
                ) : (
                  <Copy size={15} />
                )}
              </button>
            </div>
          )}

          {/* Order Summary Card (when available) */}
          {order && order.items && order.items.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-sm p-4 sm:p-6 mb-8 text-left">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Package size={15} className="text-orange-500" /> Resumo da Compra ({order.items.length})
                </span>
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck size={14} /> Pedido Garantido
                </span>
              </div>

              <ul className="divide-y divide-zinc-800/60 mb-4 max-h-56 overflow-y-auto pr-1">
                {order.items.map((it, idx) => (
                  <li key={idx} className="py-2.5 flex items-center gap-3">
                    {it.imageUrl ? (
                      <img 
                        src={it.imageUrl} 
                        alt={it.title} 
                        className="w-11 h-11 rounded-sm object-cover bg-zinc-900 border border-zinc-800 shrink-0" 
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
                        <ShoppingBag size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm text-zinc-200 font-medium truncate" title={it.title}>
                        {it.title}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Qtd: <span className="text-white font-medium">{it.quantity}</span>
                        {it.price > 0 && (
                          <span className="ml-2 text-zinc-500">
                            ({formatCurrency(it.price)} un.)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-white shrink-0 font-mono">
                      {formatCurrency(it.price * it.quantity)}
                    </div>
                  </li>
                ))}
              </ul>

              {order.total !== undefined && order.total > 0 && (
                <div className="border-t border-zinc-800 pt-3 flex justify-between items-baseline">
                  <span className="text-white font-bold text-sm sm:text-base">
                    Valor total da compra:
                  </span>
                  <span className="font-display font-bold text-xl sm:text-2xl text-emerald-400 font-mono">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Instructions Notice */}
          <div className="bg-zinc-950/80 border border-emerald-500/25 rounded-sm p-4 sm:p-5 mb-8 text-left">
            <div className="flex items-start gap-3">
              <Sparkles className="text-emerald-400 shrink-0 mt-0.5" size={20} />
              <div className="text-xs sm:text-sm">
                <p className="text-white font-semibold mb-1">
                  Envio e Preparação das Peças
                </p>
                <p className="text-zinc-300 leading-relaxed">
                  Sua compra já está sendo separada por nossos especialistas com embalagem reforçada para transporte seguro. Se desejar, envie seu comprovante pelo WhatsApp abaixo para agilizar ainda mais a emissão do código de rastreamento.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3.5">
            {/* Primary Button: Enviar comprovante pelo WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "w-full flex items-center justify-center gap-2.5 font-bold py-4 px-6 rounded-sm text-base sm:text-lg transition-all shadow-xl cursor-pointer select-none",
                "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white shadow-emerald-950/50"
              )}
            >
              <MessageCircle size={22} className="shrink-0" />
              <span>Enviar comprovante pelo WhatsApp</span>
            </a>

            {/* Explanatory note about manual receipt attachment */}
            <p className="text-zinc-400 text-xs text-center px-2 leading-relaxed">
              Ao clicar, uma conversa será aberta no WhatsApp com os dados da sua compra preenchidos. Você poderá anexar seu comprovante manualmente na conversa.
            </p>

            {/* Secondary Button: Voltar à loja */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-sm text-sm font-medium transition-colors cursor-pointer mt-2"
            >
              <ArrowLeft size={16} />
              <span>Voltar à loja</span>
            </button>
          </div>

          {/* Store Info Footer */}
          <div className="mt-8 pt-6 border-t border-zinc-800 text-center text-xs text-zinc-500">
            <p>
              Acervo dos Antigos • Especialistas em Peças Originais e Clássicos
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
