import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Stethoscope,
  MessageSquare,
  CheckSquare,
  Package,
  Paperclip,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  Wrench,
  Loader2,
  Tag,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { StatusBadge, PriorityBadge, cn } from '../components/Badges';
import { supabase, ServiceOrder } from '../lib/supabase';
import { generateOSPDF } from '../lib/pdfGenerator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type UserRole =
  | 'ADMIN'
  | 'TECH_TI'
  | 'TECH_ENG_CLINICA'
  | 'TECH_PREDIAL'
  | 'SOLICITANTE'
  | 'GESTOR'
  | 'DASHBOARD';

type UserProfile = {
  id: string;
  role: UserRole;
};

export function OSDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [solution, setSolution] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  function applyRoleFilter(query: any, profile: UserProfile, userId: string) {
    if (profile.role === 'ADMIN' || profile.role === 'GESTOR' || profile.role === 'DASHBOARD') {
      return query;
    }

    if (profile.role === 'TECH_TI') {
      return query.eq('target_sector_type', 'TI');
    }

    if (profile.role === 'TECH_ENG_CLINICA') {
      return query.eq('target_sector_type', 'ENG_CLINICA');
    }

    if (profile.role === 'TECH_PREDIAL') {
      return query.eq('target_sector_type', 'MANUTENCAO');
    }

    if (profile.role === 'SOLICITANTE') {
      return query.eq('requester_id', userId);
    }

    return query.eq('id', '__never_match__');
  }

  async function fetchOrderDetails() {
    setLoading(true);
    setAccessDenied(false);

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        setOrder(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single<UserProfile>();

      if (profileError) throw profileError;
      if (!profile) {
        setOrder(null);
        return;
      }

      let query = supabase
        .from('service_orders')
        .select(`
          *,
          requester:profiles!service_orders_requester_id_fkey(full_name),
          technician:profiles!service_orders_technician_id_fkey(full_name),
          category:service_categories(name),
          equipment:equipments(*)
        `)
        .eq('id', id);

      query = applyRoleFilter(query, profile, user.id);

      const { data, error } = await query.single();

      if (error) {
        console.error('Error fetching order:', error);

        if (error.code === 'PGRST116') {
          setAccessDenied(true);
          setOrder(null);
        } else {
          setOrder(null);
        }

        return;
      }

      if (data) {
        setOrder(data);
        setDiagnosis(data.diagnosis || '');
        setSolution(data.solution || '');
      } else {
        setOrder(null);
      }
    } catch (error) {
      console.error('Unexpected error fetching order:', error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  const handleFinishOS = async () => {
    if (!diagnosis || !solution) {
      alert('Por favor, preencha o diagnóstico e a solução antes de finalizar.');
      return;
    }

    if (!window.confirm('Deseja realmente finalizar esta Ordem de Serviço?')) return;

    setIsFinishing(true);

    try {
      const { error } = await supabase
        .from('service_orders')
        .update({
          status: 'CONCLUIDA',
          diagnosis,
          solution,
          finished_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await fetchOrderDetails();
      alert('OS finalizada com sucesso!');
    } catch (err: any) {
      alert('Erro ao finalizar OS: ' + err.message);
    } finally {
      setIsFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <ShieldAlert size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Acesso não permitido</h2>
        <p className="text-gray-500 mt-2">
          Você não tem permissão para visualizar esta Ordem de Serviço.
        </p>
        <button
          onClick={() => navigate('/ordens-servico')}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
        >
          Voltar para a Lista
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <AlertTriangle size={48} className="text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Ordem de Serviço não encontrada</h2>
        <p className="text-gray-500 mt-2">O chamado que você está procurando não existe ou foi removido.</p>
        <button
          onClick={() => navigate('/ordens-servico')}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
        >
          Voltar para a Lista
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">OS-{order.os_number}</h1>
              <StatusBadge status={order.status} />
              <PriorityBadge priority={order.priority} />
            </div>
            <span className="text-sm font-medium text-gray-500 mt-0.5 italic">
              Aberta em {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por{' '}
              {(order as any).requester?.full_name || 'Usuário'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => order && generateOSPDF(order)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <FileText size={18} className="text-blue-500" />
            Imprimir PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            <XCircle size={18} className="text-rose-500" />
            Cancelar
          </button>
          {order.status !== 'CONCLUIDA' && (
            <button
              onClick={handleFinishOS}
              disabled={isFinishing}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
            >
              {isFinishing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Finalizar Atendimento
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                {order.title}
              </h3>
              <div className="p-5 bg-gray-50/50 rounded-xl border border-gray-100 text-gray-700 leading-relaxed font-medium">
                {order.description}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-gray-50">
              <InfoItem icon={MapPin} label="Localização" value={order.location_detail || 'Não informado'} />
              <InfoItem
                icon={Stethoscope}
                label="Setor"
                value={order.target_sector_type ? order.target_sector_type.replace('_', ' ') : 'N/A'}
              />
              <InfoItem icon={Package} label="Equipamento" value={(order as any).equipment?.name || 'N/A'} />
              <InfoItem
                icon={Tag}
                label="Patrimônio"
                value={order.asset_tag || (order as any).equipment?.asset_tag || 'N/A'}
              />
            </div>

            <div className="space-y-6 pt-2">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wrench size={20} className="text-blue-500" />
                Execução Técnica
              </h3>

              <div className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Diagnóstico Técnico</label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  readOnly={order.status === 'CONCLUIDA'}
                  placeholder="Descreva o diagnóstico inicial..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[120px] outline-none disabled:opacity-70"
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Solução Aplicada</label>
                <textarea
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  readOnly={order.status === 'CONCLUIDA'}
                  placeholder="Descreva a solução realizada..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[120px] outline-none disabled:opacity-70"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CheckSquare size={18} className="text-blue-500" />
                Checklist Técnico
              </h3>
              <div className="space-y-3">
                <CheckItem label="Verificação de cabos e conexões" checked={true} />
                <CheckItem label="Teste de calibração com simulador" checked={true} />
                <CheckItem label="Limpeza interna de contatos" checked={false} />
                <CheckItem label="Atualização de firmware" checked={false} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Package size={18} className="text-blue-500" />
                Materiais Utilizados
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700">Cabo de Oximetria</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">1 unidade</span>
                  </div>
                  <span className="text-sm font-black text-gray-900">R$ 145,00</span>
                </div>
                <button className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all">
                  + Adicionar Material
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#151619] p-6 rounded-2xl border border-white/5 shadow-xl text-white space-y-6">
            <h3 className="font-bold flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              Controle de Tempo
            </h3>
            <div className="flex items-center justify-between py-4 border-y border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tempo Decorrido</span>
                <span className="text-3xl font-black tracking-tighter">00:42:15</span>
              </div>
              <button className="p-4 bg-blue-600 rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/40 group">
                <Play size={24} fill="white" className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Início:</span>
                <span className="font-bold">
                  {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Previsão:</span>
                <span className="font-bold text-blue-400">A definir</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[500px]">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare size={18} className="text-blue-500" />
                Interações
              </h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">
                Recentes
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
              <Comment
                user={(order as any).requester?.full_name || 'Solicitante'}
                time={format(new Date(order.created_at), 'HH:mm', { locale: ptBR })}
                content={order.description}
                isSelf={false}
              />
              {(order as any).technician && (
                <Comment
                  user={(order as any).technician.full_name}
                  time="--"
                  content="Chamado atribuído ao técnico."
                  isSelf={true}
                />
              )}
            </div>

            <div className="p-4 border-t border-gray-50">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Escreva um comentário..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-900/20">
                  <Send size={16} />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 px-1">
                <button className="text-[10px] font-bold text-gray-400 hover:text-blue-500 flex items-center gap-1 transition-colors">
                  <Paperclip size={12} />
                  Anexar Arquivo
                </button>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-0" />
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600 transition-colors">
                    Comentário Interno
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, isCritical }: any) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        <Icon size={14} />
        {label}
      </div>
      <span className={cn('text-sm font-bold', isCritical ? 'text-rose-600' : 'text-gray-800')}>
        {value}
      </span>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-3 p-3 bg-gray-50/50 hover:bg-gray-50 rounded-xl border border-gray-100 cursor-pointer transition-all group">
      <div
        className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
          checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white group-hover:border-blue-400'
        )}
      >
        {checked && <CheckCircle2 size={14} />}
      </div>
      <span
        className={cn(
          'text-sm font-medium transition-all',
          checked ? 'text-gray-400 line-through' : 'text-gray-700'
        )}
      >
        {label}
      </span>
    </label>
  );
}

function Comment({ user, time, content, isSelf }: any) {
  return (
    <div className={cn('flex flex-col gap-1.5 max-w-[85%]', isSelf ? 'ml-auto items-end' : 'mr-auto items-start')}>
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-bold text-gray-900">{user}</span>
        <span className="text-[10px] font-medium text-gray-400">{time}</span>
      </div>
      <div
        className={cn(
          'p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm border',
          isSelf
            ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none'
            : 'bg-white text-gray-700 border-gray-100 rounded-tl-none'
        )}
      >
        {content}
      </div>
    </div>
  );
}
