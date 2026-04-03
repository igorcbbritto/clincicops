import React, { useState, useEffect } from 'react';
import { supabase, Profile, UserRole, Sector } from '../lib/supabase';
import { 
  Users as UsersIcon, 
  Shield, 
  UserCog, 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  Filter,
  Plus,
  Info,
  X,
  Save
} from 'lucide-react';
import { cn } from '../components/Badges';

export function Users() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showInviteInfo, setShowInviteInfo] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'SOLICITANTE' as UserRole,
    phone: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      const { data: sectorsData } = await supabase
        .from('sectors')
        .select('*');

      if (profilesData) setProfiles(profilesData);
      if (sectorsData) setSectors(sectorsData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    
    setIsDeleting(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao excluir usuário');
      }

      setProfiles(profiles.filter(p => p.id !== userId));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreateUser = async (e: any) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    if (newUserData.password.length < 6) {
      setCreateError('A senha deve ter pelo menos 6 caracteres');
      setIsCreating(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      // Se não for um e-mail válido, trata como nome de usuário
      const finalEmail = newUserData.email.includes('@') 
        ? newUserData.email 
        : `${newUserData.email.toLowerCase().trim()}@clinicops.local`;

      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...newUserData,
          email: finalEmail
        })
      });

      const contentType = response.headers.get("content-type");
      let result;
      
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error("Resposta não-JSON recebida:", text);
        throw new Error(`Erro no servidor (Status ${response.status}). Verifique os logs.`);
      }

      if (!response.ok) throw new Error(result.error || 'Erro ao criar usuário');

      setShowCreateForm(false);
      setNewUserData({ email: '', password: '', fullName: '', role: 'SOLICITANTE', phone: '' });
      fetchData(); // Refresh list
    } catch (error: any) {
      setCreateError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      setProfiles(profiles.map(p => p.id === userId ? { ...p, is_active: !currentStatus } : p));
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editingProfile.full_name,
          role: editingProfile.role,
          phone: editingProfile.phone,
          sector_id: editingProfile.sector_id,
          is_active: editingProfile.is_active
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      setProfiles(profiles.map(p => p.id === editingProfile.id ? editingProfile : p));
      setEditingProfile(null);
    } catch (error: any) {
      alert('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestão de <span className="text-blue-600">Usuários</span></h1>
          <p className="text-gray-500 font-medium mt-1">Controle de acessos, permissões e níveis de segurança.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus size={18} />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowCreateForm(false)}
              className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Plus size={28} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Cadastrar Usuário</h3>
                <p className="text-sm text-gray-500 font-medium">Crie um novo acesso direto no sistema.</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-5">
              {createError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                  <XCircle className="text-rose-500 shrink-0" size={20} />
                  <p className="text-xs font-bold text-rose-600 leading-tight">{createError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                    placeholder="Ex: João Silva"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cargo / Nível</label>
                  <select 
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700"
                  >
                    <option value="ADMIN">ADMINISTRADOR</option>
                    <option value="GESTOR">GESTOR / TRIAGEM</option>
                    <option value="TECH_TI">TÉCNICO TI</option>
                    <option value="TECH_ENG_CLINICA">TÉCNICO ENG. CLÍNICA</option>
                    <option value="TECH_PREDIAL">TÉCNICO MANUTENÇÃO</option>
                    <option value="DASHBOARD">DASHBOARD / BI</option>
                    <option value="SOLICITANTE">SOLICITANTE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail ou Usuário</label>
                <input 
                  type="text" 
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="exemplo@hospital.com ou usuario"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
                <p className="text-[10px] text-gray-400 font-medium ml-1 italic">
                  * Se não for um e-mail, será usado como nome de usuário local.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha Temporária</label>
                  <input 
                    type="password" 
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp (Opcional)</label>
                  <input 
                    type="text" 
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                  {isCreating ? 'CRIANDO...' : 'CADASTRAR AGORA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setEditingProfile(null)}
              className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                <UserCog size={28} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Editar Usuário</h3>
                <p className="text-sm text-gray-500 font-medium">Atualize as informações e permissões do colaborador.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={editingProfile.full_name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, full_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cargo / Nível</label>
                  <select 
                    value={editingProfile.role}
                    onChange={(e) => setEditingProfile({ ...editingProfile, role: e.target.value as UserRole })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700"
                  >
                    <option value="ADMIN">ADMINISTRADOR</option>
                    <option value="GESTOR">GESTOR / TRIAGEM</option>
                    <option value="TECH_TI">TÉCNICO TI</option>
                    <option value="TECH_ENG_CLINICA">TÉCNICO ENG. CLÍNICA</option>
                    <option value="TECH_PREDIAL">TÉCNICO MANUTENÇÃO</option>
                    <option value="DASHBOARD">DASHBOARD / BI</option>
                    <option value="SOLICITANTE">SOLICITANTE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Setor</label>
                  <select 
                    value={editingProfile.sector_id || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, sector_id: e.target.value || null })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700"
                  >
                    <option value="">NÃO ATRIBUÍDO</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                  <input 
                    type="text" 
                    value={editingProfile.phone || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status da Conta</label>
                  <div className="flex items-center gap-4 h-[46px]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={editingProfile.is_active} 
                        onChange={() => setEditingProfile({ ...editingProfile, is_active: true })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-xs font-bold text-gray-700">Ativo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={!editingProfile.is_active} 
                        onChange={() => setEditingProfile({ ...editingProfile, is_active: false })}
                        className="w-4 h-4 text-rose-600"
                      />
                      <span className="text-xs font-bold text-gray-700">Inativo</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showInviteInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowInviteInfo(false)}
              className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
            
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <UsersIcon size={32} className="text-blue-600" />
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 mb-2">Como adicionar usuários?</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Para manter a segurança, os novos usuários devem se cadastrar diretamente na tela de login do sistema.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <p className="text-sm text-gray-600 font-medium">Peça ao funcionário para acessar a tela de login e clicar em <span className="font-bold text-blue-600">"Criar conta"</span>.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <p className="text-sm text-gray-600 font-medium">Após o cadastro, ele aparecerá nesta lista automaticamente.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <p className="text-sm text-gray-600 font-medium">Você poderá então definir o <span className="font-bold text-blue-600">Cargo</span> e o <span className="font-bold text-blue-600">Setor</span> dele aqui.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowInviteInfo(false)}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
            />
          </div>
          <button className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 hover:bg-gray-100 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuário</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nível de Acesso</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Setor</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100">
                        {profile.full_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{profile.full_name}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          {profile.phone || 'SEM TELEFONE'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <select 
                        value={profile.role}
                        disabled={updatingId === profile.id}
                        onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                        className="bg-gray-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-gray-600 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/10 transition-all disabled:opacity-50"
                      >
                        <option value="ADMIN">ADMINISTRADOR</option>
                        <option value="GESTOR">GESTOR / TRIAGEM</option>
                        <option value="TECH_TI">TÉCNICO TI</option>
                        <option value="TECH_ENG_CLINICA">TÉCNICO ENG. CLÍNICA</option>
                        <option value="TECH_PREDIAL">TÉCNICO MANUTENÇÃO</option>
                        <option value="DASHBOARD">DASHBOARD / BI</option>
                        <option value="SOLICITANTE">SOLICITANTE</option>
                      </select>
                      {profile.role === 'ADMIN' && <Shield size={14} className="text-blue-500" />}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-gray-500">
                      {sectors.find(s => s.id === profile.sector_id)?.name || 'NÃO ATRIBUÍDO'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <button 
                      onClick={() => handleStatusToggle(profile.id, profile.is_active)}
                      disabled={updatingId === profile.id}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider transition-all",
                        profile.is_active 
                          ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                          : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                      )}
                    >
                      {profile.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {profile.is_active ? 'ATIVO' : 'INATIVO'}
                    </button>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteUser(profile.id)}
                        disabled={isDeleting === profile.id || updatingId === profile.id}
                        className="p-2 hover:bg-rose-50 rounded-xl transition-colors text-gray-400 hover:text-rose-500 disabled:opacity-50"
                        title="Excluir Usuário"
                      >
                        {isDeleting === profile.id ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                      </button>
                      <button 
                        onClick={() => setEditingProfile(profile)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-blue-600"
                        title="Editar Usuário"
                      >
                        <UserCog size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
