import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Stethoscope, 
  Monitor, 
  Wrench,
  Tag,
  MapPin,
  Calendar,
  X
} from 'lucide-react';
import { supabase, Equipment, Sector, OSPriority } from '../lib/supabase';
import { cn } from '../components/Badges';

export function Equipments() {
  const [loading, setLoading] = useState(true);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    asset_tag: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    sector_id: '',
    criticality: 'MEDIA' as OSPriority,
    status: 'OPERACIONAL'
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: equipData, error: equipError } = await supabase
        .from('equipments')
        .select('*, sector:sectors(name)')
        .order('name');
      
      const { data: sectorData } = await supabase
        .from('sectors')
        .select('*')
        .order('name');

      if (equipError) throw equipError;
      if (equipData) setEquipments(equipData);
      if (sectorData) setSectors(sectorData);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (equip?: Equipment) => {
    if (equip) {
      setEditingEquipment(equip);
      setFormData({
        name: equip.name,
        asset_tag: equip.asset_tag,
        manufacturer: equip.manufacturer || '',
        model: equip.model || '',
        serial_number: equip.serial_number || '',
        sector_id: equip.sector_id || '',
        criticality: equip.criticality,
        status: equip.status
      });
    } else {
      setEditingEquipment(null);
      setFormData({
        name: '',
        asset_tag: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        sector_id: '',
        criticality: 'MEDIA',
        status: 'OPERACIONAL'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (editingEquipment) {
        const { error: updateError } = await supabase
          .from('equipments')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEquipment.id);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('equipments')
          .insert([formData]);
        
        if (insertError) throw insertError;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este equipamento?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('equipments')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const filteredEquipments = equipments.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.asset_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Inventário de Equipamentos</h1>
          <p className="text-gray-500 font-medium mt-1">Gerencie os ativos de TI, Engenharia Clínica e Manutenção.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          CADASTRAR EQUIPAMENTO
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Ativos', value: equipments.length, icon: Tag, color: 'blue' },
          { label: 'Operacionais', value: equipments.filter(e => e.status === 'OPERACIONAL').length, icon: CheckCircle2, color: 'emerald' },
          { label: 'Em Manutenção', value: equipments.filter(e => e.status === 'MANUTENCAO').length, icon: Wrench, color: 'amber' },
          { label: 'Críticos', value: equipments.filter(e => e.criticality === 'CRITICA').length, icon: AlertCircle, color: 'rose' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", `bg-${stat.color}-50 text-${stat.color}-600`)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por nome, patrimônio ou série..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
          />
        </div>
        <button className="px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-all">
          <Filter size={18} />
          Filtros Avançados
        </button>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Equipamento</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Patrimônio</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Setor</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Criticidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
                    <p className="text-sm text-gray-500 font-medium mt-4">Carregando inventário...</p>
                  </td>
                </tr>
              ) : filteredEquipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                      <Tag size={32} />
                    </div>
                    <p className="text-gray-500 font-bold">Nenhum equipamento encontrado.</p>
                  </td>
                </tr>
              ) : (
                filteredEquipments.map((equip) => (
                  <tr key={equip.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <Monitor size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{equip.name}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{equip.manufacturer} {equip.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black tracking-wider">
                        {equip.asset_tag}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={14} />
                        <span className="text-xs font-bold">{(equip as any).sector?.name || 'Não definido'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black tracking-wider",
                        equip.criticality === 'CRITICA' ? "bg-rose-50 text-rose-600" :
                        equip.criticality === 'ALTA' ? "bg-orange-50 text-orange-600" :
                        "bg-blue-50 text-blue-600"
                      )}>
                        {equip.criticality}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          equip.status === 'OPERACIONAL' ? "bg-emerald-500" :
                          equip.status === 'MANUTENCAO' ? "bg-amber-500" : "bg-gray-400"
                        )} />
                        <span className="text-xs font-bold text-gray-700">{equip.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(equip)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(equip.id)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="bg-[#151619] p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black italic shadow-lg shadow-blue-900/40">
                  {editingEquipment ? 'E' : 'C'}
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">
                    {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
                  </h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {editingEquipment ? 'Atualize os dados do ativo' : 'Cadastre um novo ativo no sistema'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-hide">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-rose-500 shrink-0" size={20} />
                  <p className="text-xs font-bold text-rose-600 leading-tight">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome do Equipamento</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Monitor Multiparamétrico, Servidor Dell R740..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Patrimônio (Asset Tag)</label>
                  <input
                    required
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                    placeholder="Ex: PAT-12345"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Número de Série</label>
                  <input
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="Ex: SN987654321"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Fabricante</label>
                  <input
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="Ex: Philips, Dell, GE..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Modelo</label>
                  <input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Ex: G30, Latitude 5420..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Setor de Alocação</label>
                  <select
                    value={formData.sector_id}
                    onChange={(e) => setFormData({ ...formData, sector_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold"
                  >
                    <option value="">Selecione um setor...</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Criticidade</label>
                  <select
                    value={formData.criticality}
                    onChange={(e) => setFormData({ ...formData, criticality: e.target.value as OSPriority })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold"
                  >
                    <option value="BAIXA">BAIXA</option>
                    <option value="MEDIA">MÉDIA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="CRITICA">CRÍTICA</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Status Operacional</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold"
                  >
                    <option value="OPERACIONAL">OPERACIONAL</option>
                    <option value="MANUTENCAO">EM MANUTENÇÃO</option>
                    <option value="FORA_DE_USO">FORA DE USO</option>
                    <option value="BAIXADO">BAIXADO / SUCATA</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={18} /> {editingEquipment ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR AGORA'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
