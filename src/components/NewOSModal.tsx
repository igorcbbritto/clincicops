import { useState, useEffect, FormEvent } from 'react';
import { X, Send, AlertCircle, Loader2, Paperclip, Stethoscope, Monitor, Wrench } from 'lucide-react';
import { supabase, Sector, SectorType, Equipment } from '../lib/supabase';
import { cn } from '../components/Badges';

interface NewOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewOSModal({ isOpen, onClose, onSuccess }: NewOSModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_sector_type: 'TI' as SectorType,
    priority: 'MEDIA',
    location_detail: '',
    asset_tag: '',
    equipment_id: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchSectors();
      fetchEquipments();
    }
  }, [isOpen]);

  async function fetchSectors() {
    const { data } = await supabase.from('sectors').select('*');
    if (data) setSectors(data);
  }

  async function fetchEquipments() {
    const { data } = await supabase.from('equipments').select('*').order('name');
    if (data) setEquipments(data);
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Prepare data for insertion, ensuring empty strings are null for optional fields
      const insertData = {
        title: formData.title,
        description: formData.description,
        target_sector_type: formData.target_sector_type,
        priority: formData.priority,
        location_detail: formData.location_detail || null,
        asset_tag: formData.asset_tag || null,
        equipment_id: formData.equipment_id || null,
        requester_id: user.id,
        status: 'ABERTA',
      };

      const { error } = await supabase.from('service_orders').insert([insertData]);

      if (error) throw error;
      
      onSuccess();
      onClose();
      setFormData({
        title: '',
        description: '',
        target_sector_type: 'TI',
        priority: 'MEDIA',
        location_detail: '',
        asset_tag: '',
        equipment_id: '',
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao abrir ordem de serviço.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
        <div className="bg-[#151619] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black italic shadow-lg shadow-blue-900/40">C</div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Nova Ordem de Serviço</h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Preencha os detalhes do chamado técnico</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-hide">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-rose-500 shrink-0" size={20} />
              <p className="text-xs font-bold text-rose-600 leading-tight">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Título do Chamado</label>
              <input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Monitor não liga, Vazamento no banheiro..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Setor Responsável</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'TI', icon: Monitor, label: 'TI' },
                  { id: 'ENG_CLINICA', icon: Stethoscope, label: 'Eng. Clínica' },
                  { id: 'MANUTENCAO', icon: Wrench, label: 'Manutenção' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, target_sector_type: type.id as SectorType })}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5",
                      formData.target_sector_type === type.id 
                        ? "bg-blue-50 border-blue-600 text-blue-600 shadow-sm" 
                        : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    <type.icon size={20} />
                    <span className="text-[10px] font-black uppercase">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Prioridade</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold"
              >
                <option value="BAIXA">BAIXA</option>
                <option value="MEDIA">MÉDIA</option>
                <option value="ALTA">ALTA</option>
                <option value="CRITICA">CRÍTICA</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Localização (Sala/Leito)</label>
              <input
                required
                value={formData.location_detail}
                onChange={(e) => setFormData({ ...formData, location_detail: e.target.value })}
                placeholder="Ex: UTI 02, Leito 05"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Equipamento (Opcional)</label>
              <select
                value={formData.equipment_id}
                onChange={(e) => {
                  const equip = equipments.find(eq => eq.id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    equipment_id: e.target.value,
                    asset_tag: equip?.asset_tag || formData.asset_tag
                  });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold"
              >
                <option value="">Selecione um equipamento...</option>
                {equipments.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.asset_tag})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Patrimônio (Opcional)</label>
              <input
                value={formData.asset_tag}
                onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                placeholder="Ex: PAT-12345"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Descrição Detalhada</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o problema com o máximo de detalhes possível..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all min-h-[120px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <button type="button" className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors">
              <Paperclip size={16} />
              Anexar Foto ou Documento
            </button>
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> ABRIR CHAMADO</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
