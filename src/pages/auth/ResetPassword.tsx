import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Lock, ArrowRight, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react';

const resetSchema = z.object({
  password: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirme a nova senha')
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectTarget = searchParams.get('redirect') || '';

  const [isVerifying, setIsVerifying] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema)
  });

  useEffect(() => {
    // Check if user is in an active recovery session
    const checkSession = async () => {
      try {
        // 1. Supabase might pass token in hash: #access_token=...&type=recovery
        const hash = window.location.hash;
        if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
          // Supabase Auth listener handles hash extraction automatically
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          // Give Supabase client a moment to parse hash tokens if present
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && currentSession)) {
              setHasValidSession(true);
              setIsVerifying(false);
            }
          });

          // Timeout check
          setTimeout(async () => {
            const { data: { session: recheck } } = await supabase.auth.getSession();
            if (recheck) {
              setHasValidSession(true);
            }
            setIsVerifying(false);
            authListener.subscription.unsubscribe();
          }, 1500);

          return;
        }
      } catch (err) {
        console.warn('Erro ao verificar sessão de recuperação:', err);
      } finally {
        setIsVerifying(false);
      }
    };

    checkSession();
  }, []);

  const onSubmit = async (data: ResetForm) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        if (error.message.includes('Auth session missing') || error.message.includes('expired')) {
          setErrorMessage('O link de recuperação expirou ou é inválido. Por favor, solicite um novo link.');
          setHasValidSession(false);
        } else {
          setErrorMessage(error.message || 'Falha ao redefinir a senha.');
        }
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao atualizar a senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (redirectTarget && redirectTarget.startsWith('/')) {
      navigate(redirectTarget);
    } else {
      navigate('/minha-conta');
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#0B0D10] px-4">
        <div className="w-8 h-8 border-4 border-[#FF7048] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#A4ABB7] text-sm">Validando link de recuperação seguro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0B0D10]">
      <div className="max-w-md w-full bg-[#141820] border border-[#2B303A] rounded-sm p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#F5F5F5]">Criar Nova Senha</h1>
          <p className="text-[#A4ABB7] text-xs sm:text-sm mt-2">
            Defina uma senha segura para proteger sua conta no Acervo dos Antigos.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-5 rounded-sm flex items-start">
              <CheckCircle2 className="w-5 h-5 shrink-0 mr-3 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-1">Senha atualizada com sucesso!</p>
                <p className="text-xs text-[#A4ABB7] leading-relaxed">
                  Sua nova senha foi salva. Sua sessão já está autenticada e você pode continuar sua navegação normalmente.
                </p>
              </div>
            </div>

            {redirectTarget && redirectTarget.includes('checkout') ? (
              <button
                onClick={handleContinue}
                className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-[#FF7048] hover:bg-[#ff5d30] transition-all cursor-pointer shadow-[0_4px_20px_rgba(255,112,72,0.35)]"
              >
                <ShoppingBag size={18} className="mr-2" />
                Continuar Compra no Checkout
              </button>
            ) : (
              <button
                onClick={handleContinue}
                className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-[#FF7048] hover:bg-[#ff5d30] transition-all cursor-pointer shadow-[0_4px_20px_rgba(255,112,72,0.35)]"
              >
                Ir para Minha Conta
                <ArrowRight size={18} className="ml-2" />
              </button>
            )}
          </div>
        ) : !hasValidSession ? (
          <div className="space-y-6 text-center">
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-5 rounded-sm flex items-start text-left">
              <AlertCircle className="w-5 h-5 shrink-0 mr-3 mt-0.5 text-red-500" />
              <div>
                <p className="font-bold text-white mb-1">Link de recuperação inválido ou expirado</p>
                <p className="text-xs text-[#A4ABB7] leading-relaxed">
                  Por motivos de segurança, os links de recuperação de senha possuem validade temporária. Por favor, solicite um novo link para continuar.
                </p>
              </div>
            </div>

            <Link
              to={`/recuperar-senha${redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
              className="w-full inline-flex items-center justify-center py-3.5 px-4 border border-transparent rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-[#FF7048] hover:bg-[#ff5d30] transition-all shadow-[0_4px_20px_rgba(255,112,72,0.35)]"
            >
              Solicitar novo link de recuperação
            </Link>

            <div>
              <Link
                to={`/login${redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
                className="text-xs text-[#A4ABB7] hover:text-[#FF7048] transition-colors"
              >
                Voltar para o Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-sm flex items-center">
                <AlertCircle size={18} className="mr-2 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#A4ABB7] mb-1">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  {...register('password')}
                  type="password"
                  autoComplete="new-password"
                  className="w-full bg-[#0B0D10] border border-[#2B303A] text-[#F5F5F5] rounded-sm py-3 pl-10 pr-3 focus:outline-none focus:border-[#FF7048] text-sm"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              {errors.password && <span className="text-red-400 text-xs mt-1 block">{errors.password.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A4ABB7] mb-1">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  {...register('confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                  className="w-full bg-[#0B0D10] border border-[#2B303A] text-[#F5F5F5] rounded-sm py-3 pl-10 pr-3 focus:outline-none focus:border-[#FF7048] text-sm"
                  placeholder="Repita sua nova senha"
                />
              </div>
              {errors.confirmPassword && <span className="text-red-400 text-xs mt-1 block">{errors.confirmPassword.message}</span>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-[#FF7048] hover:bg-[#ff5d30] focus:outline-none transition-all disabled:opacity-50 cursor-pointer mt-2 shadow-[0_4px_20px_rgba(255,112,72,0.35)]"
            >
              {isSubmitting ? 'SALVANDO SENHA...' : 'Salvar Nova Senha'}
              {!isSubmitting && <ArrowRight size={17} className="ml-2" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
