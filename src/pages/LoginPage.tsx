import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, AlertCircle, Loader2, Plus } from 'lucide-react';
import { cn } from '../components/Badges';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Se não for um e-mail válido, trata como nome de usuário
    const loginIdentifier = email.includes('@') ? email : `${email.toLowerCase().trim()}@clinicops.local`;

    try {
      if (isSignUp) {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email: loginIdentifier,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          setError('Conta criada com sucesso! Verifique seu e-mail ou faça login.');
          setIsSignUp(false);
        }
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email: loginIdentifier,
          password,
        });
        
        if (error) {
          console.error('Erro detalhado do Supabase:', error);
          throw error;
        }
        
        if (data.user) {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error('Erro capturado no Login:', err);
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/20 mb-4">
            <span className="text-3xl font-black text-white italic">C</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Clinic<span className="text-blue-600">Ops</span></h1>
          <p className="text-sm text-gray-500 font-medium">
            {isSignUp ? 'Crie sua conta corporativa' : 'Gestão Hospitalar Inteligente'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className={cn(
              "p-4 border rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2",
              error.includes('sucesso') ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
            )}>
              <AlertCircle className={error.includes('sucesso') ? "text-emerald-500" : "text-rose-500"} size={20} />
              <p className={cn(
                "text-xs font-bold leading-tight",
                error.includes('sucesso') ? "text-emerald-600" : "text-rose-600"
              )}>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">E-mail ou Usuário</label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@hospital.com ou usuario"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Senha de Acesso</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isSignUp ? <Plus size={20} /> : <LogIn size={20} />}
                {isSignUp ? 'CRIAR MINHA CONTA' : 'ENTRAR NO SISTEMA'}
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
          >
            {isSignUp ? 'Já tenho uma conta? Fazer Login' : 'Não tem conta? Criar agora'}
          </button>
        </div>

        <div className="pt-6 border-t border-gray-50 text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <ShieldCheck size={14} />
            Ambiente Seguro e Monitorado
          </div>
        </div>
      </div>
    </div>
  );
}
