import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  Monitor, 
  Stethoscope, 
  Wrench, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../components/Badges';

export function CreateOS() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_sector_type: 'TI',
    priority: 'MEDIA',
    location_detail: '',
    asset_tag: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Usuário não autenticado');

      const insertData = {
        title: formData.title,
        description: formData.description,
        target_sector_type: formData.target_sector_type,
        priority: formData.priority,
        location_detail: formData.location_detail || null,
        asset_tag: formData.asset_tag || null,
        requester_id: user.id,
        status: 'ABERTA'
      };

      const { error: insertError } = await supabase
        .from('service_orders')
        .insert([insertData]);

      if (insertError) throw insertError;

      navigate('/ordens-servico');
    } catch (err: any) {
      console.error('Error creating OS:', err);
      setError(err.message || 'Erro ao criar ordem de serviço');
    } finally {
      setLoading(false);
    }
  };

  const sectors = [
    { id: 'TI', label: 'TI / Tecnologia', icon: Monitor, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'ENG_CLINICA', label: 'Eng. Clínica', icon: Stethoscope, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'MANUTENCAO', label: 'Manutenção', icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 font-semibold text-sm"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-8 border-b border-gray-50 bg-gray-50/30">
          <h1 className="text-2xl font-bold text-gray-900">Abrir Nova Ordem de Serviço</h1>
          <p className="text-gray-500 text-sm mt-1">Preencha os detalhes abaixo para solicitar assistência técnica.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Sector Selection */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Setor de Destino</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sectors.map((sector) => {
                const Icon = sector.icon;
                const isSelected = formData.target_sector_type === sector.id;
                return (
                  <button
                    key={sector.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, target_sector_type: sector.id })}
                    className={cn(
                      "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3",
                      isSelected 
                        ? "border-blue-600 bg-blue-50/50 ring-4 ring-blue-50" 
                        : "border-gray-100 hover:border-gray-200 bg-white"
                    )}
                  >
                    <div className={cn("p-3 rounded-xl", sector.bg, sector.color)}>
                      <Icon size={24} />
                    </div>
                    <span className={cn("text-sm font-bold", isSelected ? "text-blue-700" : "text-gray-600")}>
                      {sector.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Título da Solicitação</label>
              <input
                required
                type="text"
                placeholder="Ex: Computador não liga, Vazamento no banheiro..."
                className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-gray-900 font-medium"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Descrição Detalhada</label>
              <textarea
                required
                rows={4}
                placeholder="Descreva o problema com o máximo de detalhes possível..."
                className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-gray-900 font-medium resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Localização / Sala</label>
              <input
                required
                type="text"
                placeholder="Ex: Bloco A, Sala 204"
                className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-gray-900 font-medium"
                value={formData.location_detail}
                onChange={(e) => setFormData({ ...formData, location_detail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Patrimônio (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: TAG-12345"
                className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-gray-900 font-medium"
                value={formData.asset_tag}
                onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Prioridade</label>
            <div className="flex flex-wrap gap-3">
              {['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: p })}
                  className={cn(
                    "px-6 py-3 rounded-xl text-xs font-bold border-2 transition-all",
                    formData.priority === p
                      ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-8 py-4 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              type="submit"
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              {loading ? 'Enviando...' : 'Abrir Chamado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
