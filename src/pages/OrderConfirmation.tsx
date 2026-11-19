import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  ExternalLink, 
  AlertCircle, 
  MessageCircle, 
  ShieldCheck, 
  Package, 
  Copy, 
  Check, 
  ArrowLeft 
} from 'lucide-react';
import { fetchOrderByIdFromDatabase } from '../lib/ordersService';
import { useCart } from '../store/useCart';
import { useSettings } from '../store/useSettings';
import { formatWhatsAppNumber, formatCurrency } from '../lib/utils';

function normalizePaymentUrl(raw?: string | null): string | null {
  if (!raw) return null;
  let clean = raw.trim();
  if (!clean) return null;
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

interface OrderSummaryData {
  orderId?: string;
  orderNumber?: string;
  total?: number;
  subtotal?: number;
  shippingCost?: number;
  customerName?: string;
  items?: Array<{
    title: string;
    quantity: number;
    price: number;
    imageUrl?: string | null;
  }>;
  createdAt?: string;
  paymentLink?: string | null;
}

export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();

  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopiedOrderNum, setIsCopiedOrderNum] = useState(false);

  // Safely clear cart upon entering order confirmation screen
  useEffect(() => {
    try {
      useCart.getState().clearCart();
    } catch (e) {
      // Non-fatal
    }
  }, []);

  // Resolve order details and payment link from location.state, storage or database
  useEffect(() => {
    let isMounted = true;

    async function resolvePaymentData() {
      let resolvedLink: string | null = null;
      let resolvedOrderNum: string | null = null;
      let summaryData: OrderSummaryData | null = null;

      // 1. Try location.state
      const stateData = location.state as OrderSummaryData | null;
      if (stateData) {
        summaryData = stateData;
        if (stateData.orderNumber) resolvedOrderNum = stateData.orderNumber;
        if (stateData.paymentLink) resolvedLink = normalizePaymentUrl(stateData.paymentLink);
      }

      // 2. Try sessionStorage and localStorage if state is incomplete
      if (!resolvedLink || !resolvedOrderNum || !summaryData) {
        try {
          const stored = sessionStorage.getItem('acervo_last_order') || localStorage.getItem('acervo_last_order');
          if (stored) {
            const parsed = JSON.parse(stored) as OrderSummaryData;
            if (!summaryData) summaryData = parsed;
            if (!resolvedOrderNum && parsed?.orderNumber) resolvedOrderNum = parsed.orderNumber;
            if (!resolvedLink && parsed?.paymentLink) resolvedLink = normalizePaymentUrl(parsed.paymentLink);
          }
        } catch (err) {
          console.warn('Erro ao ler storage do pedido:', err);
        }
      }

      // 3. Try query parameter (?id= or ?pedido=) from database
      const queryId = searchParams.get('id') || searchParams.get('pedido') || stateData?.orderId;
      if (queryId && (!resolvedLink || !resolvedOrderNum || !summaryData?.total)) {
        try {
          const dbOrder = await fetchOrderByIdFromDatabase(queryId);
          if (dbOrder) {
            if (!resolvedOrderNum) resolvedOrderNum = `PED-${dbOrder.id.slice(-6).toUpperCase()}`;
            if (!resolvedLink && dbOrder.payment_link) {
              resolvedLink = normalizePaymentUrl(dbOrder.payment_link);
            }
            summaryData = {
              orderId: dbOrder.id,
              orderNumber: `PED-${dbOrder.id.slice(-6).toUpperCase()}`,
              total: dbOrder.total,
              subtotal: dbOrder.subtotal,
              shippingCost: dbOrder.shipping_cost,
              customerName: dbOrder.customer_name,
              paymentLink: dbOrder.payment_link,
              createdAt: dbOrder.created_at,
              items: dbOrder.items?.map(it => ({
                title: it.product_title,
                quantity: it.quantity,
                price: it.price
              }))
            };
          }
        } catch (err) {
          console.warn('Erro ao buscar pedido por parâmetro no banco:', err);
        }
      }

      if (isMounted) {
        if (resolvedOrderNum) setOrderNumber(resolvedOrderNum);
        if (resolvedLink) setPaymentLink(resolvedLink);
        if (summaryData) setOrderSummary(summaryData);
        setIsLoading(false);
      }
    }

    resolvePaymentData();

    return () => {
      isMounted = false;
    };
  }, [location.state, searchParams]);

  // Direct payment redirect button handler (Controlled by user click, NO auto-disappearing)
  const handleGoToPayment = () => {
    const targetUrl = normalizePaymentUrl(paymentLink);

    if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
      setIsRedirecting(true);
      // Navigate to payment in same tab or open safely
      window.location.href = targetUrl;
    } else {
      setErrorMessage(
        'Link de pagamento automático não configurado para este item. Por favor, conclua o pagamento via PIX no WhatsApp oficial com nossa equipe.'
      );
    }
  };

  const handleCopyOrderNumber = () => {
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber);
    setIsCopiedOrderNum(true);
    setTimeout(() => setIsCopiedOrderNum(false), 2000);
  };

  const supportWhatsApp = formatWhatsAppNumber(settings?.whatsapp || '5518981959696');
  const supportMsg = encodeURIComponent(
    `Olá! Acabei de gerar o pedido ${orderNumber ? `#${orderNumber}` : ''} no site Acervo dos Antigos (Total: ${orderSummary?.total ? formatCurrency(orderSummary.total) : ''}) e gostaria de concluir o pagamento.`
  );

  return (
    <div className="min-h-[calc(100dvh-120px)] flex items-center justify-center px-4 py-8 sm:py-12 bg-zinc-950">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl p-5 sm:p-8 shadow-2xl text-center">
        
        {/* Success Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11" />
        </div>

        {/* Title */}
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight mb-2">
          Pedido realizado com sucesso!
        </h1>

        <p className="text-zinc-300 text-sm sm:text-base mb-6 leading-relaxed">
          Seu pedido foi registrado no sistema. Clique no botão abaixo para ir direto ao pagamento e garantir sua peça.
        </p>

        {/* Order Identifier Badge */}
        {orderNumber && (
          <div className="mb-6 inline-flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3.5 py-1.5 rounded-md text-zinc-400 text-xs sm:text-sm font-mono">
            <span>Pedido:</span>
            <strong className="text-orange-500 font-bold text-sm sm:text-base">#{orderNumber}</strong>
            <button
              type="button"
              onClick={handleCopyOrderNumber}
              className="text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              title="Copiar número do pedido"
            >
              {isCopiedOrderNum ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        )}

        {/* Order Summary Details Card (Permanent, does not disappear) */}
        {orderSummary && (
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-4 mb-6 text-left space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/80 pb-2">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-300 uppercase tracking-wide">
                <Package size={14} className="text-orange-500" />
                Resumo da Compra
              </span>
              <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-medium">
                Aguardando Pagamento
              </span>
            </div>

            {orderSummary.customerName && (
              <div className="text-xs text-zinc-300">
                <span className="text-zinc-500">Cliente: </span>
                <span className="font-medium text-white">{orderSummary.customerName}</span>
              </div>
            )}

            {orderSummary.items && orderSummary.items.length > 0 && (
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {orderSummary.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-start">
                    <span className="line-clamp-1 pr-2">
                      {item.title} <strong className="text-orange-400">x{item.quantity}</strong>
                    </span>
                    <span className="font-mono text-zinc-200 shrink-0">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {typeof orderSummary.total === 'number' && (
              <div className="flex justify-between items-center border-t border-zinc-800/80 pt-2.5">
                <span className="text-xs text-zinc-400 font-semibold">Valor Total:</span>
                <span className="text-lg sm:text-xl font-bold font-display text-orange-500">
                  {formatCurrency(orderSummary.total)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* PROMINENT VISIBLE BUTTON: IR DIRETO AO PAGAMENTO */}
        <div className="space-y-3">
          {paymentLink ? (
            <button
              type="button"
              onClick={handleGoToPayment}
              disabled={isRedirecting}
              className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.99] text-white font-extrabold rounded-lg text-lg sm:text-xl transition-all shadow-xl shadow-orange-950/60 flex items-center justify-center gap-3 cursor-pointer touch-manipulation border border-orange-400/40 disabled:opacity-75"
            >
              {isRedirecting ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Abrindo pagamento...</span>
                </>
              ) : (
                <>
                  <ExternalLink size={22} className="shrink-0" />
                  <span>IR DIRETO AO PAGAMENTO</span>
                </>
              )}
            </button>
          ) : (
            <a
              href={`https://wa.me/${supportWhatsApp}?text=${supportMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-extrabold rounded-lg text-lg sm:text-xl transition-all shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-3 cursor-pointer touch-manipulation border border-emerald-400/40"
            >
              <MessageCircle size={22} className="shrink-0" />
              <span>IR DIRETO AO PAGAMENTO (WHATSAPP / PIX)</span>
            </a>
          )}

          {/* Alternative WhatsApp Support Button */}
          {paymentLink && (
            <a
              href={`https://wa.me/${supportWhatsApp}?text=${supportMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-zinc-800/80 hover:bg-zinc-800 hover:text-emerald-400 text-zinc-300 font-semibold rounded-lg text-xs sm:text-sm border border-zinc-700/60 transition-colors flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <MessageCircle size={16} className="text-emerald-400 shrink-0" />
              <span>Prefere pagar via PIX ou falar no WhatsApp? Clique aqui</span>
            </a>
          )}

          {/* Notice if checkout URL has an error */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-md text-xs flex items-center gap-2 text-left">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Security Assurance */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Ambiente seguro. Sua compra está protegida.</span>
          </div>

          {/* Return to Store */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span>Voltar à loja</span>
          </button>
        </div>

      </div>
    </div>
  );
}
