import { useState, useEffect, FormEvent } from 'react';
import { 
  fetchAllOrdersFromDatabase, 
  updateOrderStatusInDatabase, 
  deleteOrderFromDatabase, 
  createOrderInDatabase,
  SYSTEM_ORDERS_USER_ID
} from '../../lib/ordersService';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { 
  ShoppingBag, 
  Search, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  MapPin, 
  User, 
  Package, 
  DollarSign, 
  RefreshCw, 
  Trash2, 
  Check, 
  X, 
  Copy, 
  FileText, 
  Send, 
  Plus, 
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'aguardando' | 'pago'>('todos');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  
  // State for summary modal and clipboard feedback
  const [copiedSummaryOrderId, setCopiedSummaryOrderId] = useState<string | null>(null);
  const [summaryModalOrder, setSummaryModalOrder] = useState<Order | null>(null);
  const [summaryModalText, setSummaryModalText] = useState('');
  const [isModalCopied, setIsModalCopied] = useState(false);

  // State for manual order registration (e.g. customer negotiated on WhatsApp / Facebook)
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isSubmittingNewOrder, setIsSubmittingNewOrder] = useState(false);
  const [rawWhatsAppPaste, setRawWhatsAppPaste] = useState('');
  const [storeProducts, setStoreProducts] = useState<Array<{ id: string; title: string; price: number }>>([]);

  const QUICK_STORE_PRODUCTS = [
    { title: 'Difusor Lateral De Ar Omega Original Gm Lado Esquerdo', price: '320' },
    { title: 'Par lanternas fusca fafa', price: '1000' },
    { title: 'Jogo Bancos Recaro Sem Detalhes', price: '1500' },
    { title: 'Antiga Monareta Dobramatic Ano 1978 Peças Originais', price: '900' }
  ];

  const [manualForm, setManualForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_cpf: '',
    customer_email: '',
    product_title: 'Difusor Lateral De Ar Omega Original Gm Lado Esquerdo',
    total: '320',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_city: '',
    address_state: 'SP',
    address_cep: '',
    status: 'pago' as 'pago' | 'aguardando pagamento'
  });

  const handleAutoFillFromWhatsApp = () => {
    if (!rawWhatsAppPaste.trim()) return;
    const raw = rawWhatsAppPaste;
    const updated = { ...manualForm };

    const clientMatch = raw.match(/(?:Cliente|Nome):?\*?\s*([^\n\r]+)/i);
    if (clientMatch) updated.customer_name = clientMatch[1].replace(/[*_]/g, '').trim();

    const phoneMatch = raw.match(/(?:Telefone|WhatsApp|Tel|Celular|Cel):?\*?\s*([^\n\r]+)/i);
    if (phoneMatch) updated.customer_phone = phoneMatch[1].replace(/[*_]/g, '').trim();

    const totalMatch = raw.match(/Total:?\*?\s*(?:R\$\s*)?([\d.,]+)/i);
    if (totalMatch) updated.total = totalMatch[1].trim();

    const itemMatch = raw.match(/•\s*([^(\n\r-]+)/i) || raw.match(/(?:Peça|Produto):?\*?\s*([^\n\r]+)/i);
    if (itemMatch) updated.product_title = itemMatch[1].replace(/[*_]/g, '').trim();

    const addressMatch = raw.match(/(?:Entrega|Endereço):?\*?\s*([^\n\r]+)/i);
    if (addressMatch) {
      const rawAddr = addressMatch[1].replace(/[*_]/g, '').trim();
      updated.address_street = rawAddr;

      const cepMatch = rawAddr.match(/CEP:?\s*([\d.-]+)/i);
      if (cepMatch) updated.address_cep = cepMatch[1].trim();

      const cityUfMatch = rawAddr.match(/,\s*([^,/]+)\/([a-zA-Z]{2})/);
      if (cityUfMatch) {
        updated.address_city = cityUfMatch[1].trim();
        updated.address_state = cityUfMatch[2].toUpperCase().trim();
      }
    }

    setManualForm(updated);
    showToast('Dados extraídos do WhatsApp com sucesso!', 'success');
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    let loadedOrders: Order[] = [];

    // Deleted IDs set from localStorage and known deleted orders
    const deletedIds = new Set<string>(['ped-892144', 'ped-891902']);
    try {
      const storedDeleted = JSON.parse(localStorage.getItem('acervo_deleted_orders') || '[]');
      if (Array.isArray(storedDeleted)) {
        storedDeleted.forEach(id => deletedIds.add(id));
      }
    } catch {}

    // 1. Fetch directly from database service (which already filters server & local deleted orders)
    try {
      const dbOrders = await fetchAllOrdersFromDatabase();
      if (dbOrders && dbOrders.length > 0) {
        loadedOrders = dbOrders;
      }
    } catch (err) {
      console.warn('Erro ao buscar pedidos:', err);
    }

    // 2. Also merge with localStorage cache
    try {
      const local = JSON.parse(localStorage.getItem('acervo_admin_orders') || '[]');
      if (local && local.length > 0) {
        const cleanedLocal = local.filter((o: any) => !deletedIds.has(o.id));
        localStorage.setItem('acervo_admin_orders', JSON.stringify(cleanedLocal));

        const existingIds = new Set(loadedOrders.map(o => o.id));
        for (const item of cleanedLocal) {
          if (!existingIds.has(item.id) && !deletedIds.has(item.id)) {
            loadedOrders.push(item);
            existingIds.add(item.id);
          }
        }
      }
    } catch (e) {}

    // Ensure deleted orders are NEVER displayed
    loadedOrders = loadedOrders.filter(o => !deletedIds.has(o.id));

    // Apply any local status overrides
    try {
      const statusMap = JSON.parse(localStorage.getItem('acervo_order_status_map') || '{}');
      loadedOrders = loadedOrders.map(o => ({
        ...o,
        status: statusMap[o.id] || o.status
      }));
    } catch {}

    // Sort by created_at DESC
    loadedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setOrders(loadedOrders);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Load active products from Supabase to provide quick product selection in manual order modal
    supabase
      .from('products')
      .select('id, title, price')
      .order('title', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setStoreProducts(data as any);
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Generate complete, professional WhatsApp order summary text
  const generateOrderSummaryText = (order: Order) => {
    const orderDate = new Date(order.created_at);
    const formattedDate = orderDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isPaid = order.status.toLowerCase() === 'pago';
    const statusBadge = isPaid 
      ? '✅ PAGAMENTO CONFIRMADO & APROVADO' 
      : '⏳ AGUARDANDO CONFIRMAÇÃO DO COMPROVANTE';

    const itemsList = order.items && order.items.length > 0
      ? order.items.map(it => `• *${it.quantity}x* ${it.product_title} — ${formatCurrency(it.price * it.quantity)}`).join('\n')
      : '• Peça sob consulta';

    const complementStr = order.address_complement ? ` (${order.address_complement})` : '';

    return (
      `🏁 *ACERVO DOS ANTIGOS — RESUMO DO SEU PEDIDO*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *Pedido:* #${order.id.slice(-6).toUpperCase()}\n` +
      `📅 *Data do Pedido:* ${formattedDate}\n` +
      `💳 *Status:* ${statusBadge}\n\n` +
      `👤 *DADOS DO COMPRADOR:*\n` +
      `• *Nome:* ${order.customer_name}\n` +
      `• *CPF:* ${order.customer_cpf || 'Não informado'}\n` +
      `• *WhatsApp:* ${order.customer_phone}\n` +
      `• *E-mail:* ${order.customer_email || 'Não informado'}\n\n` +
      `📍 *ENDEREÇO DE ENTREGA:*\n` +
      `• *Logradouro:* ${order.address_street}, nº ${order.address_number}${complementStr}\n` +
      `• *Bairro:* ${order.address_neighborhood}\n` +
      `• *Cidade/UF:* ${order.address_city} - ${order.address_state}\n` +
      `• *CEP:* ${order.address_cep}\n\n` +
      `🛒 *PEÇAS SOLICITADAS:*\n` +
      `${itemsList}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🚚 *Frete:* Grátis (Envio com Seguro Especial)\n` +
      `💰 *VALOR TOTAL:* ${formatCurrency(order.total)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      (isPaid
        ? `📦 *PRÓXIMOS PASSOS:*\nSua peça já está sendo conferida e embalada com proteção especial para peças clássicas. Assim que realizarmos a postagem nos Correios / Transportadora, enviaremos seu código de rastreamento por aqui.\n\nMuito obrigado pela confiança e preferência no Acervo dos Antigos! 🚗💨`
        : `💬 *AVISO:*\nPor gentileza, assim que realizar a transferência/PIX, me envie o comprovante por aqui para darmos início imediato ao empacotamento e despacho da sua peça!`)
    );
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    } catch (e) {
      console.warn('Fallback copy failed', e);
    }
  };

  // Instant copy summary to clipboard with multi-device fallback
  const handleCopyOrderSummary = (order: Order) => {
    const text = generateOrderSummaryText(order);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
    setCopiedSummaryOrderId(order.id);
    showToast(`Resumo do pedido #${order.id.slice(-6).toUpperCase()} copiado! Pronto para colar no WhatsApp.`, 'success');
    setTimeout(() => {
      setCopiedSummaryOrderId(null);
    }, 3000);
  };

  // Open modal with summary preview
  const handleOpenSummaryModal = (order: Order) => {
    const text = generateOrderSummaryText(order);
    setSummaryModalOrder(order);
    setSummaryModalText(text);
    setIsModalCopied(false);
  };

  const handleCopyFromModal = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summaryModalText).catch(() => {
        fallbackCopyText(summaryModalText);
      });
    } else {
      fallbackCopyText(summaryModalText);
    }
    setIsModalCopied(true);
    showToast('Resumo copiado para a área de transferência!', 'success');
    setTimeout(() => setIsModalCopied(false), 2500);
  };

  // Toggle order payment status between 'pago' and 'aguardando pagamento'
  const handleTogglePaymentStatus = async (order: Order) => {
    const isCurrentlyPaid = order.status.toLowerCase() === 'pago';
    const newStatus = isCurrentlyPaid ? 'aguardando pagamento' : 'pago';

    // Optimistic update in UI
    const updatedOrders = orders.map(o => 
      o.id === order.id ? { ...o, status: newStatus } : o
    );
    setOrders(updatedOrders);

    // If modal is open for this order, update text dynamically
    if (summaryModalOrder && summaryModalOrder.id === order.id) {
      const updatedOrderObj = { ...order, status: newStatus };
      setSummaryModalOrder(updatedOrderObj);
      setSummaryModalText(generateOrderSummaryText(updatedOrderObj));
    }

    // Save to localStorage cache
    try {
      localStorage.setItem('acervo_admin_orders', JSON.stringify(updatedOrders));
    } catch (e) {}

    // Update in Supabase
    try {
      await updateOrderStatusInDatabase(order.id, newStatus);
    } catch (err) {
      console.error('Falha ao atualizar status no banco:', err);
    }

    if (newStatus === 'pago') {
      showToast(`Pedido #${order.id.slice(-6).toUpperCase()} marcado como PAGO com sucesso!`, 'success');
    } else {
      showToast(`Pedido #${order.id.slice(-6).toUpperCase()} revertido para Aguardando Pagamento.`, 'info');
    }
  };

  // Delete an order permanently
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o pedido #${orderId.slice(-6).toUpperCase()}?`)) {
      return;
    }

    // 1. Immediately remove from current state
    const updated = orders.filter(o => o.id !== orderId);
    setOrders(updated);

    // 2. Immediately mark as deleted in localStorage so it can NEVER return on refresh or update
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem('acervo_deleted_orders') || '[]');
      if (!deletedList.includes(orderId)) {
        deletedList.push(orderId);
        localStorage.setItem('acervo_deleted_orders', JSON.stringify(deletedList));
      }
      localStorage.setItem('acervo_admin_orders', JSON.stringify(updated));
    } catch (e) {}

    // 3. Trigger database/server permanent deletion
    try {
      await deleteOrderFromDatabase(orderId);
    } catch (e) {
      console.warn('Erro ao deletar pedido no banco:', e);
    }

    showToast('Pedido removido com sucesso!', 'info');
  };

  // Save manual order from WhatsApp conversation
  const handleCreateManualOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualForm.customer_name || !manualForm.product_title || !manualForm.total) {
      showToast('Por favor, informe ao menos o Nome do Cliente, a Peça e o Valor.', 'info');
      return;
    }

    setIsSubmittingNewOrder(true);
    const parsedTotal = parseFloat(manualForm.total.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;

    try {
      const saved = await createOrderInDatabase({
        status: manualForm.status,
        subtotal: parsedTotal,
        shipping_cost: 0,
        total: parsedTotal,
        customer_name: manualForm.customer_name,
        customer_phone: manualForm.customer_phone,
        customer_cpf: manualForm.customer_cpf,
        customer_email: manualForm.customer_email,
        address_street: manualForm.address_street || 'A combinar no WhatsApp',
        address_number: manualForm.address_number || 'S/N',
        address_neighborhood: manualForm.address_neighborhood || 'Centro',
        address_city: manualForm.address_city || 'São Paulo',
        address_state: manualForm.address_state || 'SP',
        address_cep: manualForm.address_cep || '00000-000',
        items: [
          {
            product_title: manualForm.product_title,
            quantity: 1,
            price: parsedTotal
          }
        ]
      });

      if (saved) {
        const newOrdersList = [saved, ...orders];
        setOrders(newOrdersList);
        try {
          localStorage.setItem('acervo_admin_orders', JSON.stringify(newOrdersList));
        } catch (e) {}

        setIsNewOrderModalOpen(false);
        showToast('Pedido cadastrado e sincronizado com sucesso no sistema!', 'success');
        
        // Reset form
        setManualForm({
          customer_name: '',
          customer_phone: '',
          customer_cpf: '',
          customer_email: '',
          product_title: '',
          total: '',
          address_street: '',
          address_number: '',
          address_neighborhood: '',
          address_city: '',
          address_state: 'SP',
          address_cep: '',
          status: 'pago'
        });

        // Automatically offer summary
        handleOpenSummaryModal(saved);
      }
    } catch (err: any) {
      showToast('Erro ao cadastrar pedido: ' + (err.message || 'Verifique a conexão'), 'info');
    } finally {
      setIsSubmittingNewOrder(false);
    }
  };

  // Generate WhatsApp contact link for customer
  const getCustomerWhatsAppUrl = (order: Order, customText?: string) => {
    const rawPhone = (order.customer_phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    const textToSend = customText || generateOrderSummaryText(order);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`;
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const isPaid = order.status.toLowerCase() === 'pago';
    if (statusFilter === 'aguardando' && isPaid) return false;
    if (statusFilter === 'pago' && !isPaid) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = order.customer_name.toLowerCase().includes(term);
      const matchId = order.id.toLowerCase().includes(term);
      const matchPhone = (order.customer_phone || '').includes(term);
      const matchCpf = (order.customer_cpf || '').includes(term);
      const matchCity = (order.address_city || '').toLowerCase().includes(term);
      return matchName || matchId || matchPhone || matchCpf || matchCity;
    }

    return true;
  });

  const totalRevenue = orders
    .filter(o => o.status.toLowerCase() === 'pago')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingCount = orders.filter(o => o.status.toLowerCase() !== 'pago').length;
  const paidCount = orders.filter(o => o.status.toLowerCase() === 'pago').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Toast Alert */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-sm shadow-2xl flex items-center text-sm font-medium border animate-in slide-in-from-bottom-5 ${
          notification.type === 'success' 
            ? 'bg-emerald-950 border-emerald-500 text-emerald-200' 
            : 'bg-zinc-900 border-zinc-700 text-zinc-100'
        }`}>
          <CheckCircle2 size={18} className="mr-2 text-emerald-400 shrink-0" />
          {notification.message}
        </div>
      )}

      {/* MODAL: MANUAL ORDER REGISTRATION */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center">
                <Plus size={20} className="text-orange-500 mr-2.5" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Registrar Venda (Cliente Sem Cadastro / WhatsApp / Direto)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Grava a venda diretamente no banco Supabase com dados da peça, comprador e status de pagamento
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-sm transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              
              {/* WhatsApp Quick Auto-Fill Box */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-sm p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center">
                    <MessageCircle size={14} className="mr-1.5" />
                    Preenchimento Rápido com Mensagem do WhatsApp
                  </span>
                  {rawWhatsAppPaste && (
                    <button
                      type="button"
                      onClick={handleAutoFillFromWhatsApp}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-sm shadow transition-colors cursor-pointer"
                    >
                      Preencher Dados ⚡
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  placeholder="Cole aqui a mensagem que o cliente te enviou no WhatsApp para extrair nome, telefone, endereço, peça e valor automaticamente..."
                  value={rawWhatsAppPaste}
                  onChange={e => setRawWhatsAppPaste(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-sm p-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 font-medium mb-1">Nome Completo do Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    value={manualForm.customer_name}
                    onChange={e => setManualForm({ ...manualForm, customer_name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 99999-9999"
                    value={manualForm.customer_phone}
                    onChange={e => setManualForm({ ...manualForm, customer_phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">CPF (Opcional)</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={manualForm.customer_cpf}
                    onChange={e => setManualForm({ ...manualForm, customer_cpf: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-400 font-medium">Peça / Produto Comprado *</label>
                    <span className="text-[11px] text-zinc-500">Clique para selecionar:</span>
                  </div>

                  {/* Dynamic Store Products Selector */}
                  {storeProducts.length > 0 && (
                    <div className="mb-2">
                      <select
                        onChange={(e) => {
                          const selected = storeProducts.find(p => p.id === e.target.value);
                          if (selected) {
                            setManualForm(prev => ({
                              ...prev,
                              product_title: selected.title,
                              total: String(selected.price)
                            }));
                          }
                        }}
                        defaultValue=""
                        className="w-full bg-zinc-950 border border-zinc-700 hover:border-orange-500 rounded-sm py-2 px-3 text-white text-xs focus:outline-none focus:border-orange-500 mb-2 cursor-pointer"
                      >
                        <option value="" disabled>-- Selecionar peça cadastrada no catálogo da loja --</option>
                        {storeProducts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.title} — R$ {p.price}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Quick Store Product Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(storeProducts.length > 0 ? storeProducts.slice(0, 4) : QUICK_STORE_PRODUCTS).map((prod: any, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setManualForm(prev => ({ ...prev, product_title: prod.title, total: String(prod.price) }))}
                        className={`text-[11px] px-2.5 py-1 rounded-sm border transition-colors cursor-pointer ${
                          manualForm.product_title === prod.title
                            ? 'bg-orange-600 border-orange-500 text-white font-semibold'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700'
                        }`}
                      >
                        {prod.title.slice(0, 32)}... (R$ {prod.price})
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Nome da peça ou produto vendido"
                    value={manualForm.product_title}
                    onChange={e => setManualForm({ ...manualForm, product_title: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Valor Total (R$) *</label>
                  <input
                    type="text"
                    required
                    placeholder="1000.00"
                    value={manualForm.total}
                    onChange={e => setManualForm({ ...manualForm, total: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Status do Pagamento</label>
                  <select
                    value={manualForm.status}
                    onChange={e => setManualForm({ ...manualForm, status: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="pago">✅ Já Pago (Comprovante Recebido)</option>
                    <option value="aguardando pagamento">⏳ Aguardando Pagamento</option>
                  </select>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-zinc-800/80">
                  <span className="text-xs uppercase font-semibold text-zinc-500 block mb-2">Endereço de Entrega</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 font-medium mb-1">Rua / Logradouro</label>
                  <input
                    type="text"
                    placeholder="Ex: Rua das Flores, 123"
                    value={manualForm.address_street}
                    onChange={e => setManualForm({ ...manualForm, address_street: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={manualForm.address_neighborhood}
                    onChange={e => setManualForm({ ...manualForm, address_neighborhood: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Cidade / UF</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={manualForm.address_city}
                      onChange={e => setManualForm({ ...manualForm, address_city: e.target.value })}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="SP"
                      value={manualForm.address_state}
                      onChange={e => setManualForm({ ...manualForm, address_state: e.target.value.toUpperCase() })}
                      className="w-14 bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500 uppercase text-center font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">CEP</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={manualForm.address_cep}
                    onChange={e => setManualForm({ ...manualForm, address_cep: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-2 px-3 text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewOrder}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-5 py-2.5 rounded-sm transition-colors shadow-lg cursor-pointer flex items-center"
                >
                  {isSubmittingNewOrder ? 'Salvando...' : 'Salvar Pedido no Sistema'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* SUMMARY PREVIEW & COPY MODAL */}
      {summaryModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center">
                <FileText size={20} className="text-orange-500 mr-2.5" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Resumo do Pedido #{summaryModalOrder.id.slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Pronto para copiar e enviar no WhatsApp do cliente ({summaryModalOrder.customer_name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSummaryModalOrder(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-sm transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Mensagem formatada com todos os dados da compra:</span>
                <span className="text-zinc-500">Você pode ajustar o texto antes de enviar se desejar</span>
              </div>

              <textarea
                value={summaryModalText}
                onChange={(e) => setSummaryModalText(e.target.value)}
                rows={14}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-sm p-3.5 text-xs sm:text-sm font-mono text-zinc-200 focus:outline-none focus:border-orange-500 leading-relaxed resize-none"
              />
            </div>

            <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => setSummaryModalOrder(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyFromModal}
                  className="flex-1 sm:flex-initial flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs px-4 py-2.5 rounded-sm border border-zinc-700 transition-colors shadow-sm cursor-pointer"
                >
                  {isModalCopied ? (
                    <>
                      <Check size={14} className="mr-1.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="mr-1.5 text-orange-400" />
                      Copiar Resumo
                    </>
                  )}
                </button>

                <a
                  href={getCustomerWhatsAppUrl(summaryModalOrder, summaryModalText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-sm transition-colors shadow-md"
                >
                  <Send size={14} className="mr-1.5" />
                  Enviar no WhatsApp
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <ShoppingBag className="mr-3 text-orange-500" size={26} />
            Pedidos dos Clientes
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Confirme pagamentos via comprovante do WhatsApp e gere resumos completos para envio direto ao comprador.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button 
            onClick={() => setIsNewOrderModalOpen(true)}
            className="flex items-center bg-orange-600 hover:bg-orange-500 text-white font-semibold px-3.5 py-2 rounded-sm text-sm transition-colors shadow-md cursor-pointer"
            title="Registrar venda feita com cliente sem cadastro ou pelo WhatsApp"
          >
            <Plus size={16} className="mr-1.5" />
            + Registrar Venda (Sem Cadastro / WhatsApp)
          </button>

          <button 
            onClick={fetchOrders}
            className="flex items-center bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white px-3.5 py-2 rounded-sm text-sm transition-colors cursor-pointer"
            title="Atualizar lista do banco de dados"
          >
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm">
          <div className="text-xs text-zinc-500 uppercase font-semibold mb-1">Total de Pedidos</div>
          <div className="text-2xl font-bold text-white">{orders.length}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm">
          <div className="text-xs text-yellow-500 uppercase font-semibold mb-1 flex items-center">
            <Clock size={12} className="mr-1" /> Aguardando Pagamento
          </div>
          <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm">
          <div className="text-xs text-emerald-500 uppercase font-semibold mb-1 flex items-center">
            <CheckCircle2 size={12} className="mr-1" /> Pedidos Pagos
          </div>
          <div className="text-2xl font-bold text-emerald-400">{paidCount}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm">
          <div className="text-xs text-orange-500 uppercase font-semibold mb-1 flex items-center">
            <DollarSign size={12} className="mr-1" /> Faturamento Confirmado
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-400 truncate">
            {formatCurrency(totalRevenue)}
          </div>
        </div>
      </div>

      {/* Controls Bar: Filters & Search */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        
        {/* Status Tabs */}
        <div className="flex bg-zinc-950 p-1 rounded-sm border border-zinc-800 text-xs sm:text-sm">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
              statusFilter === 'todos' 
                ? 'bg-orange-600 text-white font-medium' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todos ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('aguardando')}
            className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
              statusFilter === 'aguardando' 
                ? 'bg-yellow-600 text-white font-medium' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Aguardando ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('pago')}
            className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
              statusFilter === 'pago' 
                ? 'bg-emerald-600 text-white font-medium' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pagos ({paidCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por cliente, pedido, telefone, CPF ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center text-zinc-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-orange-500" />
          Carregando pedidos dos clientes...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 p-12 text-center text-zinc-400">
          <ShoppingBag size={40} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-base text-zinc-300 font-medium">Nenhum pedido encontrado com os filtros atuais.</p>
          <p className="text-xs text-zinc-500 mt-1">Quando novos clientes finalizarem o pedido, eles aparecerão aqui instantaneamente.</p>
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="mt-4 inline-flex items-center bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-sm shadow-md cursor-pointer"
          >
            <Plus size={14} className="mr-1.5" /> Cadastrar Pedido do WhatsApp
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isPaid = order.status.toLowerCase() === 'pago';
            const orderDate = new Date(order.created_at);
            const formattedDate = orderDate.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const isCopied = copiedSummaryOrderId === order.id;

            return (
              <div 
                key={order.id} 
                className={`bg-zinc-900 border rounded-sm transition-all overflow-hidden ${
                  isPaid ? 'border-emerald-500/40' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Order Header Bar */}
                <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono font-bold text-base sm:text-lg text-white">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center">
                      <Clock size={12} className="mr-1" />
                      {formattedDate}
                    </span>
                    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      order.user_id === SYSTEM_ORDERS_USER_ID || !order.user_id
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      <User size={10} className="mr-1 text-orange-400" />
                      {order.user_id === SYSTEM_ORDERS_USER_ID || !order.user_id ? 'Cliente Sem Cadastro' : 'Cliente Cadastrado'}
                    </span>
                  </div>

                  {/* Payment Status Badge & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-bold uppercase tracking-wider border ${
                      isPaid 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {isPaid ? (
                        <>
                          <CheckCircle2 size={13} className="mr-1.5 text-emerald-400" />
                          Pagamento Efetuado
                        </>
                      ) : (
                        <>
                          <Clock size={13} className="mr-1.5 text-yellow-400" />
                          Aguardando Pagamento
                        </>
                      )}
                    </span>

                    {/* Quick Button: Extract Order Summary for WhatsApp */}
                    <button
                      onClick={() => handleCopyOrderSummary(order)}
                      className="text-xs font-bold px-3 py-1.5 rounded-sm transition-colors flex items-center bg-orange-600 hover:bg-orange-500 text-white shadow-sm cursor-pointer"
                      title="Copiar resumo completo da compra para colar no WhatsApp"
                    >
                      {isCopied ? (
                        <>
                          <Check size={14} className="mr-1.5 text-white" />
                          <span>Resumo Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="mr-1.5 text-white" />
                          <span>Extrair Resumo do Pedido</span>
                        </>
                      )}
                    </button>

                    {/* Quick Status Toggle Button */}
                    <button
                      onClick={() => handleTogglePaymentStatus(order)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-sm transition-colors flex items-center shadow-sm cursor-pointer ${
                        isPaid
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                      title={isPaid ? 'Clique para desativar e voltar para pendente' : 'Clique para marcar este pedido como pago'}
                    >
                      {isPaid ? (
                        <>
                          <X size={13} className="mr-1 text-red-400" />
                          Desativar Pago
                        </>
                      ) : (
                        <>
                          <Check size={14} className="mr-1" />
                          Ativar Pedido Pago
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Order Body */}
                <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Customer Information (4 cols) */}
                  <div className="lg:col-span-4 space-y-3 border-b lg:border-b-0 lg:border-r border-zinc-800/80 pb-4 lg:pb-0 lg:pr-4">
                    <div className="flex items-center text-xs uppercase font-semibold text-zinc-500">
                      <User size={13} className="mr-1.5 text-orange-500" />
                      Dados do Cliente
                    </div>

                    <div>
                      <div className="font-semibold text-white text-base">{order.customer_name}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">CPF: {order.customer_cpf || 'Não informado'}</div>
                      <div className="text-xs text-zinc-400">E-mail: {order.customer_email || 'Não informado'}</div>
                      <div className="text-xs text-zinc-300 font-mono mt-1">Tel: {order.customer_phone}</div>
                    </div>

                    {/* WhatsApp Action Buttons */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleOpenSummaryModal(order)}
                        className="inline-flex items-center bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-500/40 text-xs font-semibold px-3 py-2 rounded-sm transition-colors cursor-pointer"
                        title="Ver e editar resumo completo para WhatsApp"
                      >
                        <FileText size={14} className="mr-1.5" />
                        Ver Resumo WhatsApp
                      </button>

                      <a
                        href={getCustomerWhatsAppUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 text-xs font-semibold px-3 py-2 rounded-sm transition-colors"
                        title="Abrir WhatsApp com mensagem pronta"
                      >
                        <MessageCircle size={14} className="mr-1.5" />
                        Conversar no Zap
                      </a>
                    </div>
                  </div>

                  {/* Delivery Address (4 cols) */}
                  <div className="lg:col-span-4 space-y-3 border-b lg:border-b-0 lg:border-r border-zinc-800/80 pb-4 lg:pb-0 lg:pr-4">
                    <div className="flex items-center text-xs uppercase font-semibold text-zinc-500">
                      <MapPin size={13} className="mr-1.5 text-orange-500" />
                      Endereço de Envio
                    </div>

                    <p className="text-sm text-zinc-300 leading-relaxed">
                      <strong className="text-white">{order.address_street}</strong>, nº {order.address_number}
                      {order.address_complement && <span className="text-zinc-400"> ({order.address_complement})</span>}
                      <br />
                      {order.address_neighborhood}
                      <br />
                      {order.address_city} - {order.address_state}
                      <br />
                      <span className="font-mono text-zinc-400 text-xs">CEP: {order.address_cep}</span>
                    </p>
                  </div>

                  {/* Items and Financial Summary (4 cols) */}
                  <div className="lg:col-span-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center text-xs uppercase font-semibold text-zinc-500 mb-2">
                        <Package size={13} className="mr-1.5 text-orange-500" />
                        Peças Solicitadas
                      </div>

                      <ul className="space-y-2 mb-4 text-xs">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((it, idx) => (
                            <li key={idx} className="flex justify-between items-start bg-zinc-950 p-2 rounded-sm border border-zinc-800/50">
                              <span className="text-zinc-200 pr-2 line-clamp-2">
                                {it.product_title} <span className="text-orange-500 font-semibold">x{it.quantity}</span>
                              </span>
                              <span className="font-semibold text-white shrink-0">
                                {formatCurrency(it.price * it.quantity)}
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="text-zinc-500 italic">Itens não detalhados</li>
                        )}
                      </ul>
                    </div>

                    <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-zinc-500">Valor Total:</span>
                        <div className="font-display font-bold text-xl text-orange-500">
                          {formatCurrency(order.total)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 rounded-sm hover:bg-zinc-800 cursor-pointer"
                        title="Excluir este pedido"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
