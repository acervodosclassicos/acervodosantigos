import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, ArrowRight } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '';
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setIsLoading(false);

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setError('Por favor, confirme seu e-mail antes de fazer login.');
      } else if (error.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(error.message);
      }
    } else {
      // Safe internal redirect
      if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
        navigate(redirectTarget);
      } else {
        navigate('/');
      }
    }
  };

  const registerUrl = redirectTarget ? `/cadastro?redirect=${encodeURIComponent(redirectTarget)}` : '/cadastro';
  const forgotUrl = redirectTarget ? `/recuperar-senha?redirect=${encodeURIComponent(redirectTarget)}` : '/recuperar-senha';

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0B0D10]">
      <div className="max-w-md w-full bg-[#141820] border border-[#2B303A] rounded-sm p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
            {redirectTarget?.includes('checkout') ? 'Entrar ou criar uma conta' : 'Acesse sua Conta'}
          </h2>
          <p className="text-[#A4ABB7] text-xs sm:text-sm mt-2">
            {redirectTarget?.includes('checkout') 
              ? 'Acesse sua conta ou cadastre-se para acompanhar seus pedidos.' 
              : 'Bem-vindo de volta à garagem.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-[#A4ABB7] mb-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                {...register('email')}
                type="email" 
                className="w-full bg-[#0B0D10] border border-[#2B303A] text-[#F5F5F5] rounded-sm py-3 pl-10 pr-3 focus:outline-none focus:border-[#FF7048] text-sm"
                placeholder="seu@email.com"
              />
            </div>
            {errors.email && <span className="text-red-500 text-xs mt-1 block">{errors.email.message}</span>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-[#A4ABB7]">Senha</label>
              <Link 
                to={forgotUrl} 
                className="text-xs text-[#FF7048] hover:text-[#ff5d30] transition-colors"
              >
                Esqueci minha senha
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                {...register('password')}
                type="password" 
                className="w-full bg-[#0B0D10] border border-[#2B303A] text-[#F5F5F5] rounded-sm py-3 pl-10 pr-3 focus:outline-none focus:border-[#FF7048] text-sm"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <span className="text-red-500 text-xs mt-1 block">{errors.password.message}</span>}
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-[#FF7048] hover:bg-[#ff5d30] focus:outline-none transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(255,112,72,0.35)]"
          >
            {isLoading ? 'ENTRANDO...' : 'ENTRAR'}
            {!isLoading && <ArrowRight size={17} className="ml-2" />}
          </button>
        </form>

        <div className="mt-6 text-center text-xs sm:text-sm text-[#A4ABB7] border-t border-[#2B303A] pt-6 space-y-2">
          <div>
            Ainda não tem cadastro?{' '}
            <Link to={registerUrl} className="text-[#FF7048] hover:text-white transition-colors font-medium">
              Criar conta
            </Link>
          </div>
          {redirectTarget?.includes('checkout') && (
            <div>
              <Link to="/checkout" className="text-xs text-[#A4ABB7] hover:text-[#FF7048] transition-colors">
                Prefere não se cadastrar? <span className="underline">Comprar sem conta</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
