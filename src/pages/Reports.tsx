import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  Download, 
  Filter, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateReportPDF } from '../lib/pdfGenerator';
import { cn } from '../components/Badges';

export function Reports() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[]>([]);
  const [allOS, setAllOS] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgResolutionTime: '4.2h',
    slaCompliance: '94%',
    totalCost: 'R$ 12.450',
    efficiency: '+12.5%'
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          requester:profiles!requester_id(full_name),
          technician:profiles!technician_id(full_name),
          equipment:equipments(name, asset_tag)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setAllOS(data);
        // Process data for charts
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dateStr = d.toISOString().split('T')[0];
          const dayOrders = data.filter(o => o.created_at?.startsWith(dateStr));
          
          return {
            name: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
            total: dayOrders.length,
            completed: dayOrders.filter(o => o.status === 'CONCLUIDA').length,
            ti: dayOrders.filter(o => o.target_sector_type === 'TI').length,
            eng: dayOrders.filter(o => o.target_sector_type === 'ENG_CLINICA').length,
            manut: dayOrders.filter(o => o.target_sector_type === 'MANUTENCAO').length,
          };
        });
        setReportData(last7Days);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleExport = () => {
    // Simple CSV export simulation
    const headers = ['Data', 'Total', 'Concluídas', 'TI', 'Eng. Clínica', 'Manutenção'];
    const rows = reportData.map(d => [d.name, d.total, d.completed, d.ti, d.eng, d.manut]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "relatorio_clinicops.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const columns = ['Data', 'Total', 'Concluídas', 'TI', 'Eng. Clínica', 'Manutenção'];
    const data = reportData.map(d => [d.name, d.total, d.completed, d.ti, d.eng, d.manut]);
    generateReportPDF('Relatório de Produtividade Semanal', data, columns);
  };

  const handleExportSpecific = (type: string) => {
    let title = '';
    let filteredData: any[] = [];
    let columns: string[] = [];
    let rows: any[] = [];

    switch (type) {
      case 'ABERTA':
        title = 'Relatório de OS Abertas / Pendentes';
        filteredData = allOS.filter(os => os.status === 'ABERTA' || os.status === 'EM_ANALISE');
        columns = ['Nº OS', 'Título', 'Prioridade', 'Setor', 'Solicitante', 'Data'];
        rows = filteredData.map(os => [
          os.os_number,
          os.title,
          os.priority,
          os.target_sector_type,
          os.requester?.full_name || 'N/A',
          new Date(os.created_at).toLocaleDateString('pt-BR')
        ]);
        break;
      case 'CONCLUIDA':
        title = 'Relatório de OS Concluídas';
        filteredData = allOS.filter(os => os.status === 'CONCLUIDA');
        columns = ['Nº OS', 'Título', 'Técnico', 'Setor', 'Conclusão', 'Equipamento'];
        rows = filteredData.map(os => [
          os.os_number,
          os.title,
          os.technician?.full_name || 'N/A',
          os.target_sector_type,
          os.finished_at ? new Date(os.finished_at).toLocaleDateString('pt-BR') : 'N/A',
          os.equipment?.name || 'N/A'
        ]);
        break;
      case 'BY_SECTOR':
        title = 'Relatório de OS por Setor';
        columns = ['Setor', 'Total', 'Abertas', 'Concluídas', 'Aguardando'];
        const sectors = ['TI', 'ENG_CLINICA', 'MANUTENCAO'];
        rows = sectors.map(s => {
          const sectorOS = allOS.filter(os => os.target_sector_type === s);
          return [
            s,
            sectorOS.length,
            sectorOS.filter(os => os.status === 'ABERTA').length,
            sectorOS.filter(os => os.status === 'CONCLUIDA').length,
            sectorOS.filter(os => os.status === 'AGUARDANDO_PECA').length
          ];
        });
        break;
    }

    if (rows.length === 0) {
      alert('Nenhum dado encontrado para este relatório.');
      return;
    }

    generateReportPDF(title, rows, columns);
  };

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
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Relatórios & <span className="text-blue-600">BI</span></h1>
          <p className="text-gray-500 font-medium mt-1">Análise de desempenho, produtividade e métricas operacionais.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            <Calendar size={16} />
            Últimos 30 Dias
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            <FileText size={16} className="text-rose-500" />
            PDF
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Tempo Médio de Resolução" value={stats.avgResolutionTime} icon={Clock} color="blue" />
        <MetricCard title="Conformidade SLA" value={stats.slaCompliance} icon={CheckCircle2} color="emerald" />
        <MetricCard title="Custo Estimado Manutenção" value={stats.totalCost} icon={TrendingUp} color="orange" />
        <MetricCard title="Eficiência Operacional" value={stats.efficiency} icon={TrendingUp} color="blue" />
      </div>

      {/* Specific Reports Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Relatórios Específicos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportActionCard 
            title="OS Abertas (Pendentes)" 
            description="Lista completa de chamados que ainda não foram iniciados ou estão em análise."
            icon={AlertCircle}
            color="amber"
            onClick={() => handleExportSpecific('ABERTA')}
          />
          <ReportActionCard 
            title="OS Concluídas" 
            description="Relatório de produtividade com todos os chamados finalizados no período."
            icon={CheckCircle2}
            color="emerald"
            onClick={() => handleExportSpecific('CONCLUIDA')}
          />
          <ReportActionCard 
            title="OS por Setor (TI/Eng/Manut)" 
            description="Distribuição de carga de trabalho entre as equipes técnicas."
            icon={Filter}
            color="blue"
            onClick={() => handleExportSpecific('BY_SECTOR')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Productivity Chart */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Produtividade por Setor</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Volume de chamados atendidos</p>
            </div>
            <Filter size={18} className="text-gray-400" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData}>
                <defs>
                  <linearGradient id="colorTi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="ti" stroke="#2563eb" fillOpacity={1} fill="url(#colorTi)" strokeWidth={3} />
                <Area type="monotone" dataKey="eng" stroke="#10b981" fillOpacity={0} strokeWidth={3} />
                <Area type="monotone" dataKey="manut" stroke="#f59e0b" fillOpacity={0} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resolution Rate Chart */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Taxa de Resolução</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Chamados abertos vs concluídos</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Bar dataKey="total" name="Abertos" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="completed" name="Concluídos" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl border ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</h4>
          <p className="text-xl font-black text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ReportActionCard({ title, description, icon: Icon, color, onClick }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <button 
      onClick={onClick}
      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110", colors[color])}>
          <Icon size={24} />
        </div>
        <div>
          <h4 className="text-sm font-black text-gray-900 mb-1">{title}</h4>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{description}</p>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest">
            <Download size={12} />
            Gerar PDF Agora
          </div>
        </div>
      </div>
    </button>
  );
}
