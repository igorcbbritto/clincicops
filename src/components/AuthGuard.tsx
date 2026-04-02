import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Roles que têm acesso. Se omitido, qualquer usuário autenticado passa. */
  allowedRoles?: Profile['role'][];
}

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'no_profile' }
  | { status: 'unauthorized' }
  | { status: 'authorized'; profile: Profile };

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      // 1. Verificar sessão ativa
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        if (!cancelled) setState({ status: 'unauthenticated' });
        return;
      }

      // 2. Carregar profile do usuário logado
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error('[AuthGuard] Erro ao carregar profile:', profileError.message);
        setState({ status: 'no_profile' });
        return;
      }

      if (!profile) {
        // Usuário autenticado mas sem profile — estado inválido
        console.warn('[AuthGuard] Usuário sem profile:', session.user.id);
        setState({ status: 'no_profile' });
        return;
      }

      // 3. Verificar role se exigido
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(profile.role)) {
          setState({ status: 'unauthorized' });
          return;
        }
      }

      setState({ status: 'authorized', profile });
    }

    checkAuth();

    // Escutar mudanças de sessão (logout, expiração de token etc.)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState({ status: 'unauthenticated' });
      } else {
        // Re-checar ao relogar
        checkAuth();
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [allowedRoles]);

  // ─── Renderização por estado ────────────────────────────────

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (state.status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (state.status === 'no_profile') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Perfil não encontrado</h2>
          <p className="text-gray-500 text-sm mb-6">
            Sua conta existe, mas o perfil de acesso não foi configurado. Entre em contato com o
            administrador do sistema.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Sair e tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Acesso não autorizado</h2>
          <p className="text-gray-500 text-sm mb-6">
            Você não tem permissão para acessar esta área. Verifique com o administrador se o seu
            perfil tem o nível de acesso necessário.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // status === 'authorized'
  return <>{children}</>;
}
