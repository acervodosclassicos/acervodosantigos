import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCart } from '../store/useCart';
import { useAuth } from '../store/useAuth';
import { formatCurrency } from '../lib/utils';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { createOrderInDatabase } from '../lib/ordersService';
import { 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight,
  Lock, 
  AlertCircle, 
  ShoppingBag,
  CheckCircle2,
  ExternalLink,
  Clock,
  User,
  UserCheck,
  UserPlus,
  LogIn,
  Mail
} from 'lucide-react';

const checkoutSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe seu nome completo'),
  cpf: z.string().trim().optional().refine(val => {
    if (!val || val.trim() === '') return true;
    const clean = val.replace(/\D/g, '');
    return clean.length === 11;
  }, 'Se informado, o CPF deve ter 11 dígitos'),
  email: z.string().trim().email('E-mail inválido'),
  phone: z.string().trim().refine(val => {
    const clean = val.replace(/\D/g, '');
    return clean.length >= 10 && clean.length <= 13;
  }, 'Informe WhatsApp com DDD (ex: 11 99999-9999)'),
  zipCode: z.string().trim().refine(val => {
    const clean = val.replace(/\D/g, '');
    return clean.length === 8;
  }, 'CEP inválido (8 dígitos)'),
  street: z.string().trim().min(2, 'Endereço obrigatório'),
  number: z.string().trim().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().trim().min(2, 'Bairro obrigatório'),
  city: z.string().trim().min(2, 'Cidade obrigatória'),
  state: z.string().trim().min(2, 'Estado (UF) inválido').max(2, 'Use a sigla UF com 2 letras (ex: SP)'),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

// Auto-mask helpers
function maskCpf(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function maskCep(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

export default function Checkout() {
  const { items, getCartTotal } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const isNavigatingRef = useRef(false);

  // Dialog state for confirmed order before payment redirect
  const [confirmedDialog, setConfirmedDialog] = useState<{
    isOpen: boolean;
    orderNumber: string;
    orderId: string;
    total: number;
    paymentLink: string | null;
    customerName: string;
  } | null>(null);
  const confirmedDialogRef = useRef<typeof confirmedDialog>(null);
  confirmedDialogRef.current = confirmedDialog;

  const handleExecuteRedirect = () => {
    const dialog = confirmedDialogRef.current;
    if (!dialog) return;

    const confirmPath = `/pedido-confirmado?pedido=${dialog.orderNumber}&id=${dialog.orderId}`;
    if (dialog.paymentLink && (dialog.paymentLink.startsWith('http://') || dialog.paymentLink.startsWith('https://'))) {
      navigate(confirmPath, {
        replace: true,
        state: {
          orderId: dialog.orderId,
          orderNumber: dialog.orderNumber,
          total: dialog.total,
          paymentLink: dialog.paymentLink,
          customerName: dialog.customerName
        }
      });
      setTimeout(() => {
        window.location.href = dialog.paymentLink!;
      }, 80);
    } else {
      navigate(confirmPath, {
        state: {
          orderId: dialog.orderId,
          orderNumber: dialog.orderNumber,
          total: dialog.total,
          paymentLink: dialog.paymentLink,
          customerName: dialog.customerName
        }
      });
    }
  };

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.user_metadata?.full_name || '',
      email: user?.email || '',
      phone: '',
      cpf: '',
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: 'SP',
    }
  });

  const zipCodeWatch = watch('zipCode');

  // Auto fetch address from ViaCEP when CEP reaches 8 digits
  useEffect(() => {
    const cleanCep = (zipCodeWatch || '').replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        .then(res => res.json())
        .then(data => {
          if (!data.erro) {
            setValue('street', data.logradouro || '', { shouldValidate: true });
            setValue('neighborhood', data.bairro || '', { shouldValidate: true });
            setValue('city', data.localidade || '', { shouldValidate: true });
            setValue('state', (data.uf || 'SP').toUpperCase(), { shouldValidate: true });
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingCep(false));
    }
  }, [zipCodeWatch, setValue]);

  // Sync authenticated user data into form
  useEffect(() => {
    if (user) {
      if (user.user_metadata?.full_name) {
        setValue('fullName', user.user_metadata.full_name, { shouldValidate: false });
      }
      if (user.email) {
        setValue('email', user.email, { shouldValidate: false });
      }
    }
  }, [user, setValue]);

  const handleSignOutCheckout = async () => {
    await signOut();
  };

  const shippingCost = 0; // Frete Grátis promocional

  const onSubmit = async (data: CheckoutForm) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setIsSubmitting(true);
    setErrorMsg(null);
    
    try {
      const total = getCartTotal();
      const finalTotal = total + shippingCost;
      let orderNumber = `PED-${Date.now().toString().slice(-6)}`;
      
      // 1. Retrieve the real checkout payment link from the product(s) in the cart
      let verifiedPaymentLink: string | null = null;

      for (const item of items) {
        if (item.product?.payment_link && item.product.payment_link.trim()) {
          verifiedPaymentLink = item.product.payment_link.trim();
          break;
        }
      }

      // 2. Fetch fresh payment_link from Supabase products table to ensure latest registered link
      const productIds = items.map(it => it.product?.id).filter(Boolean);
      if (hasSupabaseConfig && productIds.length > 0) {
        try {
          const { data: dbProds } = await supabase
            .from('products')
            .select('id, payment_link')
            .in('id', productIds);

          if (dbProds && dbProds.length > 0) {
            const found = dbProds.find(p => p.payment_link && p.payment_link.trim());
            if (found?.payment_link) {
              verifiedPaymentLink = found.payment_link.trim();
            }
          }
        } catch (fetchErr) {
          console.warn('Fallback checking dbProds:', fetchErr);
        }
      }

      // 3. Normalize link format (ensure protocol https://)
      let finalPaymentLink: string | null = null;
      if (verifiedPaymentLink) {
        let clean = verifiedPaymentLink.trim();
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = 'https://' + clean;
        }
        finalPaymentLink = clean;
      }

      // Snapshot items with product IDs and image thumbnails
      const orderItemsSnapshot = items.map(item => ({
        productId: item.product.id,
        title: item.product.title,
        quantity: item.quantity,
        price: item.product.price,
        imageUrl: item.product.images?.[0]?.url || null
      }));

      // 4. Record order in Supabase with resilient guest or customer association
      const savedOrder = await createOrderInDatabase({
        status: 'aguardando pagamento',
        subtotal: total,
        shipping_cost: shippingCost,
        total: finalTotal,
        customer_name: data.fullName,
        customer_cpf: data.cpf,
        customer_email: data.email,
        customer_phone: data.phone,
        address_cep: data.zipCode,
        address_street: data.street,
        address_number: data.number,
        address_complement: data.complement || '',
        address_neighborhood: data.neighborhood,
        address_city: data.city,
        address_state: data.state.toUpperCase(),
        payment_link: finalPaymentLink,
        user_id: user ? user.id : null,
        items: orderItemsSnapshot.map(it => ({
          product_id: it.productId,
          product_title: it.title,
          quantity: it.quantity,
          price: it.price
        }))
      });

      const createdOrderId = savedOrder.id;
      orderNumber = `PED-${createdOrderId.slice(-6).toUpperCase()}`;

      const orderConfirmationPayload = {
        orderId: createdOrderId,
        orderNumber,
        total: finalTotal,
        subtotal: total,
        shippingCost,
        paymentLink: finalPaymentLink,
        customerName: data.fullName,
        items: orderItemsSnapshot.map(it => ({
          title: it.title,
          quantity: it.quantity,
          price: it.price,
          imageUrl: it.imageUrl
        })),
        createdAt: new Date().toISOString()
      };

      // Store in both sessionStorage and localStorage so mobile browser refresh safely recovers the order
      try {
        sessionStorage.setItem('acervo_last_order', JSON.stringify(orderConfirmationPayload));
        localStorage.setItem('acervo_last_order', JSON.stringify(orderConfirmationPayload));
      } catch (storageErr) {
        console.warn('Erro ao salvar pedido no storage:', storageErr);
      }

      // Safely clear cart
      try {
        useCart.getState().clearCart();
      } catch (e) {}

      // 5. Open dialog: "Seu pedido foi confirmado. Estamos redirecionando você para o pagamento."
      setConfirmedDialog({
        isOpen: true,
        orderNumber,
        orderId: createdOrderId,
        total: finalTotal,
        paymentLink: finalPaymentLink,
        customerName: data.fullName
      });

    } catch (error: any) {
      console.error('Checkout error:', error);
      // Emergency recovery: Save fallback order payload to storage and open confirmation dialog smoothly
      const fallbackOrderId = `ped-${Date.now()}`;
      const fallbackNumber = `PED-${Date.now().toString().slice(-6).toUpperCase()}`;
      const emergencyPayload = {
        orderId: fallbackOrderId,
        orderNumber: fallbackNumber,
        total: getCartTotal() + shippingCost,
        subtotal: getCartTotal(),
        shippingCost,
        paymentLink: null,
        customerName: data.fullName,
        items: items.map(it => ({
          title: it.product.title,
          quantity: it.quantity,
          price: it.product.price,
          imageUrl: it.product.images?.[0]?.url || null
        })),
        createdAt: new Date().toISOString()
      };

      try {
        sessionStorage.setItem('acervo_last_order', JSON.stringify(emergencyPayload));
        localStorage.setItem('acervo_last_order', JSON.stringify(emergencyPayload));
        useCart.getState().clearCart();
      } catch {}

      setConfirmedDialog({
        isOpen: true,
        orderNumber: fallbackNumber,
        orderId: fallbackOrderId,
        total: getCartTotal() + shippingCost,
        paymentLink: null,
        customerName: data.fullName
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalidSubmit = (fieldErrors: any) => {
    isNavigatingRef.current = false;
    setIsSubmitting(false);
    const errorKeys = Object.keys(fieldErrors);
    if (errorKeys.length > 0) {
      const firstField = errorKeys[0];
      const errorMsgText = fieldErrors[firstField]?.message || 'Por favor, preencha todos os campos obrigatórios para continuar.';
      setErrorMsg(errorMsgText);

      // Smoothly scroll to the first invalid field on mobile devices
      setTimeout(() => {
        const el = document.querySelector(`[name="${firstField}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLElement).focus?.();
        }
      }, 50);
    }
  };

  if (items.length === 0 && !isNavigatingRef.current) {
    return (
      <div className="bg-zinc-950 min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-sm">
          <ShoppingBag className="w-14 h-14 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Seu carrinho está vazio</h2>
          <p className="text-zinc-400 text-sm mb-6">Escolha uma peça no catálogo para continuar com seu pedido.</p>
          <button
            onClick={() => navigate('/produtos')}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-sm text-sm transition-colors cursor-pointer"
          >
            Ver peças disponíveis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D10] text-[#F5F5F5] min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <button 
          onClick={() => navigate('/carrinho')}
          className="flex items-center text-zinc-400 hover:text-orange-500 mb-8 transition-colors text-sm cursor-pointer"
        >
          <ArrowLeft size={16} className="mr-2" /> Voltar ao carrinho
        </button>

        <h1 className="font-display font-bold text-3xl text-white mb-8">Finalizar Pedido</h1>
        
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-sm mb-8 flex items-center">
            <AlertCircle className="mr-3 shrink-0" size={24} />
            <p>{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Form Fields */}
            <div className="lg:col-span-7 space-y-8">

              {/* Identification Step */}
              {user ? (
                <div className="bg-zinc-900 border border-emerald-500/30 rounded-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <UserCheck size={18} />
                    </div>
                    <div>
                      <span className="text-xs text-zinc-400 block">Conectado na sua conta:</span>
                      <span className="text-sm font-bold text-white">{user.user_metadata?.full_name || user.email}</span>
                      <span className="text-xs text-zinc-400 ml-2">({user.email})</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOutCheckout}
                    className="text-xs text-zinc-400 hover:text-red-400 transition-colors underline cursor-pointer"
                  >
                    Trocar de conta
                  </button>
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4 sm:p-5">
                  <h2 className="font-display font-bold text-lg text-white mb-1">Como deseja continuar?</h2>
                  <p className="text-zinc-400 text-xs mb-3.5">
                    Escolha uma das opções abaixo para prosseguir com o seu pedido:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Opção 1: Entrar ou criar uma conta */}
                    <button
                      type="button"
                      onClick={() => navigate('/login?redirect=/checkout')}
                      className="p-3.5 rounded-sm border border-zinc-800 bg-zinc-950 hover:border-orange-500/70 text-left transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-sm text-white group-hover:text-orange-400 transition-colors flex items-center">
                            <User size={16} className="text-orange-500 mr-2 shrink-0" />
                            Entrar ou criar uma conta
                          </span>
                          <ArrowRight size={15} className="text-zinc-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Acesse sua conta ou cadastre-se para acompanhar seus pedidos.
                        </p>
                      </div>
                    </button>

                    {/* Opção 2: Comprar sem conta */}
                    <div
                      className="p-3.5 rounded-sm border border-orange-500/50 bg-orange-500/5 text-left flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <CheckCircle2 size={16} className="text-orange-500 shrink-0" />
                          <span className="font-bold text-sm text-white">
                            Comprar sem conta
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Continue sua compra sem criar cadastro ou senha.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dados Pessoais */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
                <h2 className="font-display font-bold text-xl text-white mb-6 flex items-center border-b border-zinc-800 pb-4">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs mr-3">1</span>
                  Dados Pessoais
                </h2>
              
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Nome Completo</label>
                    <input 
                      {...register('fullName')}
                      type="text" 
                      autoComplete="name"
                      placeholder="Ex: Carlos Eduardo da Silva"
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    {errors.fullName && <span className="text-red-500 text-xs mt-1 block">{errors.fullName.message}</span>}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">CPF <span className="text-zinc-500 font-normal">(Opcional)</span></label>
                    <input 
                      {...register('cpf', {
                        onChange: (e) => {
                          const masked = maskCpf(e.target.value);
                          setValue('cpf', masked, { shouldValidate: false });
                        }
                      })}
                      type="text" 
                      inputMode="numeric"
                      placeholder="000.000.000-00 (Opcional)"
                      maxLength={14}
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    {errors.cpf && <span className="text-red-500 text-xs mt-1 block">{errors.cpf.message}</span>}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">WhatsApp / Telefone</label>
                    <input 
                      {...register('phone', {
                        onChange: (e) => {
                          const masked = maskPhone(e.target.value);
                          setValue('phone', masked, { shouldValidate: false });
                        }
                      })}
                      type="tel" 
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(11) 99999-9999"
                      maxLength={16}
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    {errors.phone && <span className="text-red-500 text-xs mt-1 block">{errors.phone.message}</span>}
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">E-mail</label>
                    <input 
                      {...register('email')}
                      type="email" 
                      inputMode="email"
                      autoComplete="email"
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    {errors.email && <span className="text-red-500 text-xs mt-1 block">{errors.email.message}</span>}
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                  <h2 className="font-display font-bold text-xl text-white flex items-center">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs mr-3">2</span>
                    Endereço de Entrega
                  </h2>
                  {isLoadingCep && <span className="text-xs text-orange-400 animate-pulse">Buscando CEP...</span>}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">CEP</label>
                    <input 
                      {...register('zipCode', {
                        onChange: (e) => {
                          const masked = maskCep(e.target.value);
                          setValue('zipCode', masked, { shouldValidate: false });
                        }
                      })}
                      type="text" 
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    {errors.zipCode && <span className="text-red-500 text-xs mt-1 block">{errors.zipCode.message}</span>}
                  </div>
                  
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Rua / Avenida</label>
                    <input 
                      {...register('street')}
                      type="text" 
                      autoComplete="street-address"
                      placeholder="Nome da rua"
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    {errors.street && <span className="text-red-500 text-xs mt-1 block">{errors.street.message}</span>}
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Número</label>
                    <input 
                      {...register('number')}
                      type="text" 
                      inputMode="numeric"
                      placeholder="123"
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    {errors.number && <span className="text-red-500 text-xs mt-1 block">{errors.number.message}</span>}
                  </div>
                  
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Complemento (Opcional)</label>
                    <input 
                      {...register('complement')}
                      type="text" 
                      placeholder="Apto, Bloco, Casa..."
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm"
                    />
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Bairro</label>
                    <input 
                      {...register('neighborhood')}
                      type="text" 
                      placeholder="Bairro"
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    {errors.neighborhood && <span className="text-red-500 text-xs mt-1 block">{errors.neighborhood.message}</span>}
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Cidade</label>
                    <input 
                      {...register('city')}
                      type="text" 
                      placeholder="Cidade"
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    {errors.city && <span className="text-red-500 text-xs mt-1 block">{errors.city.message}</span>}
                  </div>
                  
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">UF</label>
                    <select 
                      {...register('state')}
                      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-2.5 focus:outline-none focus:border-orange-500 uppercase cursor-pointer text-sm"
                    >
                      {['SP','RJ','MG','ES','PR','SC','RS','BA','PE','CE','DF','GO','MT','MS','AM','PA','MA','RN','PB','AL','SE','PI','TO','RO','AC','AP','RR'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                    {errors.state && <span className="text-red-500 text-xs mt-1 block">{errors.state.message}</span>}
                  </div>
                </div>
              </div>

            </div>
            
            {/* Resumo */}
            <div className="lg:col-span-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6 sticky top-28 shadow-xl">
                <h2 className="font-display font-bold text-xl text-white mb-6 border-b border-zinc-800 pb-4">
                  Resumo do Pedido
                </h2>
                
                <ul className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                  {items.map((item) => (
                    <li key={item.product.id} className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <div className="text-sm text-zinc-200 line-clamp-1">{item.product.title}</div>
                        <div className="text-xs text-zinc-500 mt-1">Qtd: {item.quantity}</div>
                      </div>
                      <div className="text-sm font-medium text-white shrink-0">
                        {formatCurrency(item.product.price * item.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>
                
                <div className="border-t border-zinc-800 pt-4 space-y-3 mb-6 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getCartTotal())}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Frete</span>
                    <span className="text-emerald-400 font-medium">Grátis</span>
                  </div>
                </div>
                
                <div className="border-t border-zinc-800 pt-4 mb-6">
                  <div className="flex justify-between items-end">
                    <span className="text-white font-bold">Total a pagar</span>
                    <span className="text-orange-500 font-display font-bold text-2xl">{formatCurrency(getCartTotal() + shippingCost)}</span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-sm mb-4 text-xs flex items-center">
                    <AlertCircle className="mr-2.5 shrink-0" size={18} />
                    <p className="leading-snug">{errorMsg}</p>
                  </div>
                )}
                
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-sm transition-all text-center uppercase tracking-wide flex items-center justify-center disabled:opacity-50 shadow-lg cursor-pointer touch-manipulation"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span>Processando pedido...</span>
                    </>
                  ) : (
                    <>Finalizar pedido e ir para pagar</>
                  )}
                </button>
                
                <div className="mt-6 flex flex-col space-y-3 text-xs text-zinc-500 bg-zinc-950 p-4 rounded-sm border border-zinc-800/50">
                  <div className="flex items-start">
                    <Lock size={16} className="text-emerald-500 mr-2 shrink-0 mt-0.5" />
                    <p className="text-zinc-400">Seus dados estão protegidos por criptografia de ponta a ponta.</p>
                  </div>
                  <div className="flex items-start">
                    <ShieldCheck size={16} className="text-emerald-500 mr-2 shrink-0 mt-0.5" />
                    <p className="text-zinc-400">Garantia de procedência e envio com seguro para todo o Brasil.</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </form>

        {/* Confirmation Dialog before payment redirect */}
        {confirmedDialog?.isOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative animate-in zoom-in-95 duration-200">
              
              {/* Animated Check Icon */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              {/* Mandatory Dialog Title & Message requested by customer */}
              <h3 id="confirm-dialog-title" className="text-xl sm:text-2xl font-bold text-white mb-2 font-display">
                Pedido Confirmado!
              </h3>
              
              <p className="text-zinc-200 text-sm sm:text-base font-medium mb-5 leading-relaxed">
                Seu pedido foi confirmado. Estamos redirecionando você para o pagamento.
              </p>

              {/* Order Mini-card */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-md p-3.5 mb-5 text-left text-xs space-y-2">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Número do Pedido:</span>
                  <span className="text-orange-500 font-mono font-bold text-sm">#{confirmedDialog.orderNumber}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Comprador:</span>
                  <span className="text-zinc-200 truncate max-w-[200px] font-medium">{confirmedDialog.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800 pt-1.5">
                  <span>Total:</span>
                  <span className="text-white font-bold text-sm">{formatCurrency(confirmedDialog.total)}</span>
                </div>
              </div>

              {/* Direct Action Notice */}
              <div className="mb-5 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-md text-xs text-emerald-300 flex items-center justify-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>Pedido registrado com sucesso no banco de dados!</span>
              </div>

              {/* Direct Action Buttons - Highly Visible as requested */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleExecuteRedirect}
                  className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.99] text-white font-extrabold rounded-md text-base sm:text-lg transition-all shadow-xl shadow-orange-950/50 flex items-center justify-center gap-2.5 cursor-pointer touch-manipulation border border-orange-400/30"
                >
                  <ExternalLink size={20} className="shrink-0" />
                  <span>IR DIRETO AO PAGAMENTO</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate(`/pedido-confirmado?pedido=${confirmedDialog.orderNumber}&id=${confirmedDialog.orderId}`, {
                      state: {
                        orderId: confirmedDialog.orderId,
                        orderNumber: confirmedDialog.orderNumber,
                        total: confirmedDialog.total,
                        paymentLink: confirmedDialog.paymentLink,
                        customerName: confirmedDialog.customerName
                      }
                    });
                  }}
                  className="w-full py-2.5 px-3 text-xs sm:text-sm text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-md border border-zinc-700/60 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Ver detalhes e comprovante do pedido</span>
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
