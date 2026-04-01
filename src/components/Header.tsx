import { Bell, Search, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';

export function Header() {
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

  const isMaster = profile?.email === 'igor@igor.com.br' || profile?.email === 'igor@igor.com' || profile?.email === 'suportesfhm@gmail.com';
  const displayRole = isMaster ? 'ADMIN' : profile?.role;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4 w-1/3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar ordens de serviço, equipamentos..." 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors group">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white group-hover:scale-110 transition-transform" />
        </button>

        <div className="h-8 w-px bg-gray-200" />

        <div className="flex items-center gap-3 pl-2 pr-1 py-1">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-900">{profile?.full_name || 'Carregando...'}</span>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{displayRole || 'Usuário'}</span>
          </div>
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold border border-blue-200">
            {profile?.full_name?.split(' ').map(n => n[0]).join('') || <User size={18} />}
          </div>
        </div>
      </div>
    </header>
  );
}
