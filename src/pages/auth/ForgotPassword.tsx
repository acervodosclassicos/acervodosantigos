import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const forgotSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '';
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema)
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const redirectUrl = `${window.location.origin}/redefinir-senha${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`;

      const { error } = await supabase.auth.resetPasswordForEmail(data.email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        // We log error internally, but according to security rules and requirements,
        // we present a neutral message or handle rate limits gracefully
        if (error.message.includes('rate limit') || error.message.includes('over_email_send_rate_limit')) {
          setErrorMessage('Muitas solicitações em sequência. Aguarde alguns instantes antes de tentar novamente.');
          setIsLoading(false);
          return;
        }
      }

      // Always show neutral confirmation
      setIsSuccess(true);
    } catch {
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loginUrl = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login';

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0B0D10]">
      <div className="max-w-md w-full bg-[#141820] border border-[#2B303A] rounded-sm p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#F5F5F5]">Recuperar minha senha</h1>
          <p className="text-[#A4ABB7] text-xs sm:text-sm mt-3 leading-relaxed">
            Informe o e-mail utilizado no seu cadastro. Se estiver registrado, enviaremos as instruções para criar uma nova senha.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-5 rounded-sm flex items-start">
              <CheckCircle2 className="w-5 h-5 shrink-0 mr-3 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-1">E-mail de recuperação enviado!</p>
                <p className="text-xs text-[#A4ABB7] leading-relaxed">
                  Se o endereço informado estiver cadastrado em nossa loja, você receberá um link seguro para criar sua nova senha. Verifique também sua caixa de spam ou lixo eletrônico.
                </p>
              </div>
            </div>

            <Link
              to={loginUrl}
              className="w-full flex items-center justify-center py-3.5 px-4 border border-[#2B303A] hover:border-[#FF7048] rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-[#1B2029] hover:bg-[#2B303A] transition-colors"
            >
              <ArrowLeft size={16} className="mr-2" />
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-sm flex items-center">
                <AlertCircle size={18} className="mr-2 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#A4ABB7] mb-1">E-mail cadastrado</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="w-full bg-[#0B0D10] border border-[#2B303A] text-[#F5F5F5] rounded-sm py-3 pl-10 pr-3 focus:outline-none focus:border-[#FF7048] text-sm"
                  placeholder="seu@email.com"
                />
              </div>
              {errors.email && <span className="text-red-400 text-xs mt-1 block">{errors.email.message}</span>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-[#FF7048] hover:bg-[#ff5d30] focus:outline-none transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(255,112,72,0.35)]"
            >
              {isLoading ? 'ENVIANDO INSTRUÇÕES...' : 'Enviar link de recuperação'}
            </button>

            <div className="text-center pt-2">
              <Link
                to={loginUrl}
                className="text-xs sm:text-sm text-[#A4ABB7] hover:text-[#FF7048] transition-colors inline-flex items-center"
              >
                <ArrowLeft size={14} className="mr-1.5" />
                Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
