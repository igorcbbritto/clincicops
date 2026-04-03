import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Calendar,
  MapPin,
  ChevronRight,
  Download,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Package
} from 'lucide-react';
import { StatusBadge, PriorityBadge, cn } from '../components/Badges';
import { supabase, ServiceOrder } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

type ProfileRole =
  | 'ADMIN'
  | 'TECH_TI'
  | 'TECH_ENG_CLINICA'
  | 'TECH_PREDIAL'
  | 'SOLICITANTE'
  | 'GESTOR'
  | 'DASHBOARD';

export function OSList() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setOrders([]);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setOrders([]);
        return;
      }

      let query = supabase
        .from('service_orders')
        .select(`
          *,
          requester:profiles!service_orders_requester_id_fkey(full_name),
          technician:profiles!service_orders_technician_id_fkey(full_name),
          category:service_categories(name)
        `);

      const role = profile?.role as ProfileRole | undefined;

      if (role) {
        if (role === 'TECH_TI') {
          query = query.eq('target_sector_type', 'TI');
        } else if (role === 'TECH_ENG_CLINICA') {
          query = query.eq('target_sector_type', 'ENG_CLINICA');
        } else if (role === 'TECH_PREDIAL') {
          query = query.eq('target_sector_type', 'MANUTENCAO');
        } else if (role === 'SOLICITANTE') {
          query = query.eq('requester_id', user.id);
        }
        // ADMIN, GESTOR e DASHBOARD veem tudo por enquanto
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ordens de Serviço</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">Gerencie e acompanhe todos os chamados abertos.</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="text-sm font-bold text-blue-600">{orders.length} total</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            <Download size={18} className="text-gray-400" />
            Exportar
          </button>
          <Link
            to="/ordens-servico/nova"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus size={18} />
            Nova OS
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por título, ID ou solicitante..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            />
          </div>
          <button className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
            <Filter size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <ListIcon size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          <select className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none">
            <option>Mais recentes</option>
            <option>Prioridade Alta</option>
            <option>SLA Crítico</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4 border border-gray-100">
              <ListIcon size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Nenhuma OS encontrada</h3>
            <p className="text-sm text-gray-500 mt-1">Não existem ordens de serviço registradas no momento.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">OS ID</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Informações da OS</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Setor / Local</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Prioridade</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Solicitante</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((os) => (
                <tr key={os.id} className="hover:bg-gray-50/50 transition-all cursor-pointer group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-blue-600">#{os.os_number}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                        {os.target_sector_type?.replace('_', ' ') || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col max-w-xs">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {os.title}
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 font-medium">
                        <Calendar size={12} />
                        {format(new Date(os.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        {os.asset_tag && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <Package size={12} />
                            {os.asset_tag}
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-700">{os.location_detail || 'Não informado'}</span>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
                        <MapPin size={12} />
                        Hospital Central
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <PriorityBadge priority={os.priority} />
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={os.status} />
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200 uppercase">
                        {os.requester?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </div>
                      <span className="text-xs font-semibold text-gray-600">
                        {os.requester?.full_name || 'Desconhecido'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/ordens-servico/${os.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight size={18} />
                      </Link>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-gray-500 font-medium">
          Mostrando {orders.length} de {orders.length} ordens
        </span>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-bold text-gray-400 bg-white border border-gray-200 rounded-xl cursor-not-allowed">
            Anterior
          </button>
          <button className="px-4 py-2 text-sm font-bold text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
