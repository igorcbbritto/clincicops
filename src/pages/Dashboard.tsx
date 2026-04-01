import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StatusBadge, PriorityBadge, cn } from '../components/Badges';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    console.log('Dashboard mounted, fetching data...');
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // Fetch stats
      const { data: allOrders, error: statsError } = await supabase
        .from('service_orders')
        .select('status, priority, target_sector_type, created_at');

      if (statsError) {
        console.error('Stats fetch error:', statsError);
        throw statsError;
      }

      console.log('Orders fetched:', allOrders?.length || 0);

      if (allOrders) {
        setStats({
          total: allOrders.length,
          open: allOrders.filter(o => o.status === 'ABERTA').length,
          inProgress: allOrders.filter(o => o.status === 'EM_ANDAMENTO').length,
          completed: allOrders.filter(o => o.status === 'CONCLUIDA').length,
          urgent: allOrders.filter(o => o.priority === 'URGENTE' || o.priority === 'ALTA' || o.priority === 'CRITICA').length,
        });

        // Dynamic Pie Data
        const sectors = ['TI', 'ENG_CLINICA', 'MANUTENCAO'];
        const colors = ['#2563eb', '#10b981', '#f59e0b'];
        const distribution = sectors.map((s, i) => {
          const count = allOrders.filter(o => o.target_sector_type === s).length;
          const percentage = allOrders.length > 0 ? Math.round((count / allOrders.length) * 100) : 0;
          return { 
            name: s === 'ENG_CLINICA' ? 'Eng. Clínica' : s === 'MANUTENCAO' ? 'Manutenção' : s, 
            value: percentage || 0, // Ensure it's at least 0
            color: colors[i] 
          };
        });
        
        // Dynamic Chart Data (Last 7 days)
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            name: days[d.getDay()],
            date: d.toISOString().split('T')[0],
            ti: 0,
            eng: 0,
            pred: 0
          };
        });

        if (allOrders && allOrders.length > 0) {
          allOrders.forEach(o => {
            try {
              if (!o.created_at) return;
              const orderDate = new Date(o.created_at).toISOString().split('T')[0];
              const dayData = last7Days.find(d => d.date === orderDate);
              if (dayData) {
                if (o.target_sector_type === 'TI') dayData.ti++;
                if (o.target_sector_type === 'ENG_CLINICA') dayData.eng++;
                if (o.target_sector_type === 'MANUTENCAO') dayData.pred++;
              }
            } catch (e) {
              console.warn('Error processing order date:', e);
            }
          });
          setPieData(distribution);
          setChartData(last7Days);
        } else {
          setPieData([{ name: 'Sem dados', value: 100, color: '#f3f4f6' }]);
          setChartData(last7Days);
        }
      } else {
        // Handle case where allOrders is null
        setPieData([{ name: 'Sem dados', value: 100, color: '#f3f4f6' }]);
        // Initialize last7Days with zeros
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
            name: days[d.getDay()],
            date: d.toISOString().split('T')[0],
            ti: 0,
            eng: 0,
            pred: 0
          };
        });
        setChartData(last7Days);
      }

      // Fetch recent orders - simpler join syntax
      const { data: recent, error: recentError } = await supabase
        .from('service_orders')
        .select(`
          *,
          requester:profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Recent orders fetch error:', recentError);
        throw recentError;
      }
      setRecentOrders(recent || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
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
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard <span className="text-blue-600">Geral</span></h1>
          <p className="text-gray-500 font-medium mt-1">Bem-vindo ao centro de operações do ClinicOps.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Sistema Online</span>
          </div>
          <button onClick={fetchDashboardData} className="p-2 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-all">
            <Activity size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total de Chamados" 
          value={stats.total.toString()} 
          icon={FileText} 
          trend="+12%" 
          trendUp={true}
          color="blue"
        />
        <StatCard 
          title="Em Aberto" 
          value={stats.open.toString()} 
          icon={Clock} 
          trend="-5%" 
          trendUp={false}
          color="orange"
        />
        <StatCard 
          title="Concluídos" 
          value={stats.completed.toString()} 
          icon={CheckCircle2} 
          trend="+18%" 
          trendUp={true}
          color="emerald"
        />
        <StatCard 
          title="Críticos / Urgentes" 
          value={stats.urgent.toString()} 
          icon={AlertCircle} 
          trend="+2" 
          trendUp={true}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Volume de Atendimentos</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Comparativo semanal por setor</p>
            </div>
            <select className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-gray-600 outline-none cursor-pointer">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="ti" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="eng" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="pred" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
          <h3 className="text-lg font-black text-gray-900 tracking-tight mb-8">Distribuição por Setor</h3>
          <div className="h-[220px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-gray-900">100%</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-bold text-gray-600">{item.name}</span>
                </div>
                <span className="text-xs font-black text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Chamados Recentes</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Últimas movimentações no sistema</p>
          </div>
          <button className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">Ver todos</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">OS ID</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Título / Descrição</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prioridade</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Solicitante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((os) => (
                <tr key={os.id} className="hover:bg-gray-50/30 transition-colors group cursor-pointer">
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-blue-600">#{os.os_number}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{os.title}</span>
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
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black text-gray-500 border border-gray-200">
                        {os.requester?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </div>
                      <span className="text-xs font-bold text-gray-600">{os.requester?.full_name || 'Desconhecido'}</span>
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

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 group hover:border-blue-200 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl border transition-colors", colors[color])}>
          <Icon size={24} />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black",
          trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{title}</h4>
        <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
