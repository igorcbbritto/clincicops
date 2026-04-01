import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { Loader2, FileText, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface SectorDashboardProps {
  title: string;
  sectorType: 'TI' | 'ENG_CLINICA' | 'MANUTENCAO';
}

export function SectorDashboard({ title, sectorType }: SectorDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0
  });

  useEffect(() => {
    fetchData();
  }, [sectorType]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          requester:profiles!service_orders_requester_id_fkey(full_name)
        `)
        .eq('target_sector_type', sectorType)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setOrders(data);
        setStats({
          total: data.length,
          open: data.filter(o => o.status === 'ABERTA').length,
          inProgress: data.filter(o => o.status === 'EM_ANDAMENTO').length,
          completed: data.filter(o => o.status === 'CONCLUIDA').length
        });
      }
    } catch (error) {
      console.error('Error fetching sector data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{title}</h1>
        <p className="text-gray-500 font-medium mt-1">Gestão de chamados e ativos do setor.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total do Setor" value={stats.total} icon={FileText} color="blue" />
        <StatCard title="Pendentes" value={stats.open} icon={Clock} color="orange" />
        <StatCard title="Em Execução" value={stats.inProgress} icon={AlertCircle} color="blue" />
        <StatCard title="Finalizados" value={stats.completed} icon={CheckCircle2} color="emerald" />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-8 border-b border-gray-50">
          <h3 className="text-lg font-black text-gray-900 tracking-tight">Fila de Trabalho</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">OS ID</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Título</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prioridade</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Solicitante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-medium">
                    Nenhuma ordem de serviço encontrada para este setor.
                  </td>
                </tr>
              ) : (
                orders.map((os) => (
                  <tr key={os.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="text-sm font-black text-blue-600">#{os.os_number}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{os.title}</span>
                        <span className="text-xs text-gray-400 font-medium mt-0.5">{os.location_detail}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <StatusBadge status={os.status} />
                    </td>
                    <td className="px-8 py-5">
                      <PriorityBadge priority={os.priority} />
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-gray-600">{os.requester?.full_name || 'Desconhecido'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl border ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</h4>
          <p className="text-2xl font-black text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
