import { 
  LayoutDashboard, 
  ClipboardList, 
  Stethoscope, 
  Wrench, 
  Monitor, 
  Users, 
  Settings, 
  BarChart3, 
  LogOut,
  PlusCircle,
  Tag
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from './Badges';
import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['ADMIN', 'GESTOR', 'TECH_TI', 'TECH_ENG_CLINICA', 'TECH_PREDIAL', 'DASHBOARD', 'SOLICITANTE'] },
  { icon: ClipboardList, label: 'Ordens de Serviço', path: '/ordens-servico', roles: ['ADMIN', 'GESTOR', 'TECH_TI', 'TECH_ENG_CLINICA', 'TECH_PREDIAL', 'SOLICITANTE'] },
  { icon: Stethoscope, label: 'Eng. Clínica', path: '/equipamentos', roles: ['ADMIN', 'GESTOR', 'TECH_ENG_CLINICA'] },
  { icon: Monitor, label: 'TI', path: '/ti', roles: ['ADMIN', 'GESTOR', 'TECH_TI'] },
  { icon: Wrench, label: 'Manutenção', path: '/manutencao', roles: ['ADMIN', 'GESTOR', 'TECH_PREDIAL'] },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios', roles: ['ADMIN', 'GESTOR', 'DASHBOARD'] },
  { icon: Tag, label: 'Inventário', path: '/inventario', roles: ['ADMIN', 'TECH_TI', 'TECH_ENG_CLINICA'] },
  { icon: Users, label: 'Usuários', path: '/usuarios', roles: ['ADMIN'] },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', roles: ['ADMIN'] },
];

export function Sidebar({ onNewOS, onLogout }: { onNewOS: () => void, onLogout: () => void }) {
  const [profile, setProfile] = useState<Profile & { email?: string } | null>(null);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfile({ ...data, email: user.email });
        }
      }
    }
    getProfile();
  }, []);

  const filteredMenu = menuItems.filter(item => {
    if (!profile) return true;
    // Master user always sees everything
    const isMaster = profile.email === 'igor@igor.com.br' || profile.email === 'igor@igor.com' || profile.email === 'suportesfhm@gmail.com';
    if (isMaster) return true;
    return item.roles.includes(profile.role);
  });

  const isMaster = profile?.email === 'igor@igor.com.br' || profile?.email === 'igor@igor.com' || profile?.email === 'suportesfhm@gmail.com';
  const displayRole = isMaster ? 'ADMIN' : profile?.role;

  return (
    <aside className="w-64 bg-[#151619] text-white flex flex-col h-screen sticky top-0 border-r border-white/10">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl italic">C</div>
        <span className="font-bold text-xl tracking-tight">Clinic<span className="text-blue-500">Ops</span></span>
      </div>
      
      <div className="p-4">
        <button 
          onClick={onNewOS}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors shadow-lg shadow-blue-900/20"
        >
          <PlusCircle size={18} />
          Nova OS
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
              isActive 
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={20} className={cn("transition-colors", "group-hover:text-blue-400")} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        {profile && (
          <div className="mb-4 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{displayRole}</p>
            <p className="text-xs font-bold text-white truncate">{profile.full_name}</p>
          </div>
        )}
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
        >
          <LogOut size={20} />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
