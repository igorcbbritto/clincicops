import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { OSList } from './pages/OSList';
import { OSDetail } from './pages/OSDetail';
import { CreateOS } from './pages/CreateOS';
import { LoginPage } from './pages/LoginPage';
import { Users as UsersPage } from './pages/Users';
import { SectorDashboard } from './pages/SectorDashboard';
import { Reports } from './pages/Reports';
import Settings from './pages/Settings';
import { Equipments } from './pages/Equipments';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NewOSModal } from './components/NewOSModal';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { User } from 'lucide-react';

// Auth Guard Component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    async function checkAuth() {
      try {
        setLoading(true);
        console.log('Checking auth session...');
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        
        if (session?.user) {
          console.log('Fetching profile for user:', session.user.id);
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error('Error fetching profile:', error);
          }
          if (isMounted) setProfile(profileData);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkAuth();

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth check timed out, forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!isMounted) return;
        setSession(session);
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (isMounted) setProfile(profileData);
        } else {
          if (isMounted) setProfile(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verificando Acesso...</p>
      </div>
    </div>
  );

  if (!session) return <Navigate to="/login" replace />;

  if (!profile && session) {
    // If it's the master user, we can bypass the profile check if it failed
    if (session.user.email === 'igor@igor.com.br' || session.user.email === 'igor@igor.com' || session.user.email === 'suportesfhm@gmail.com') {
      return <>{children}</>;
    }
    
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-rose-100 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto">
            <User size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Perfil não encontrado</h2>
            <p className="text-sm text-gray-500 mt-2">
              Seu usuário existe, mas não encontramos seu perfil no sistema. 
              Por favor, entre em contato com o administrador ou tente sair e entrar novamente.
            </p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            Sair do Sistema
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Layout Component
function MainLayout({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans selection:bg-blue-100 selection:text-blue-700">
      <Sidebar onNewOS={() => setIsModalOpen(true)} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="p-8 flex-1 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <footer className="px-8 py-6 border-t border-gray-100 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            ClinicOps v1.0.0 &copy; 2026 &bull; Sistema de Gestão Hospitalar Premium
          </p>
        </footer>
      </div>

      <NewOSModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Auth Route */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected App Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/ordens-servico"
            element={
              <AuthGuard>
                <MainLayout>
                  <OSList />
                </MainLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/ordens-servico/nova"
            element={
              <AuthGuard>
                <MainLayout>
                  <CreateOS />
                </MainLayout>
              </AuthGuard>
            }
          />
          
          <Route
            path="/ordens-servico/:id"
            element={
              <AuthGuard>
                <MainLayout>
                  <OSDetail />
                </MainLayout>
              </AuthGuard>
            }
          />
          
          <Route
            path="/equipamentos"
            element={
              <AuthGuard>
                <MainLayout>
                  <SectorDashboard title="Engenharia Clínica" sectorType="ENG_CLINICA" />
                </MainLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/ti"
            element={
              <AuthGuard>
                <MainLayout>
                  <SectorDashboard title="Tecnologia da Informação" sectorType="TI" />
                </MainLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/manutencao"
            element={
              <AuthGuard>
                <MainLayout>
                  <SectorDashboard title="Manutenção Predial" sectorType="MANUTENCAO" />
                </MainLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/relatorios"
            element={
              <AuthGuard>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/usuarios"
            element={
              <AuthGuard>
                <MainLayout>
                  <UsersPage />
                </MainLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/configuracoes"
            element={
              <AuthGuard>
                <MainLayout>
                  <Settings />
                </MainLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/inventario"
            element={
              <AuthGuard>
                <MainLayout>
                  <Equipments />
                </MainLayout>
              </AuthGuard>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
