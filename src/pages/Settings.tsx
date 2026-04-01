import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Globe, 
  Smartphone, 
  Mail, 
  Save, 
  CheckCircle2,
  Building2,
  Palette,
  Database,
  Lock,
  Loader2
} from 'lucide-react';
import { cn } from '../components/Badges';

export function Settings() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1500);
  };

  const tabs = [
    { id: 'general', label: 'Geral', icon: SettingsIcon },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'integrations', label: 'Integrações', icon: Globe },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configurações do <span className="text-blue-600">Sistema</span></h1>
          <p className="text-gray-500 font-medium mt-1">Personalize o ClinicOps para atender às necessidades do seu hospital.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {loading ? 'SALVANDO...' : saved ? 'SALVO COM SUCESSO' : 'SALVAR ALTERAÇÕES'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="p-8 border-b border-gray-50">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
              Gerencie as configurações de {tabs.find(t => t.id === activeTab)?.label.toLowerCase()}
            </p>
          </div>

          <div className="p-8 space-y-8">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Hospital / Unidade</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        defaultValue="Hospital Central ClinicOps"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CNPJ</label>
                    <input 
                      type="text" 
                      defaultValue="00.000.000/0001-00"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail de Suporte Técnico</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      defaultValue="suporte@clinicops.com.br"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-700"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
                    <Database className="text-blue-600 shrink-0" size={24} />
                    <div>
                      <h4 className="text-sm font-black text-blue-900">Armazenamento de Dados</h4>
                      <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                        Seus dados estão sendo armazenados em servidores de alta performance com backup automático a cada 24 horas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <NotificationToggle title="Alertas de OS Crítica" description="Receber notificações imediatas para chamados de prioridade crítica." defaultChecked />
                <NotificationToggle title="Atualização de Status" description="Notificar o solicitante quando o status da OS for alterado." defaultChecked />
                <NotificationToggle title="Relatórios Semanais" description="Enviar resumo de produtividade por e-mail toda segunda-feira." />
                <NotificationToggle title="Alertas de WhatsApp" description="Integrar notificações via WhatsApp para técnicos de plantão." />
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="p-6 border border-gray-100 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3 text-rose-600">
                    <Lock size={20} />
                    <h4 className="text-sm font-black uppercase tracking-wider">Políticas de Senha</h4>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">Configure as exigências mínimas para as senhas dos colaboradores.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-700">Mínimo 8 caracteres</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs font-bold text-gray-700">Letras e números</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({ title, description, defaultChecked }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
      <div className="space-y-1">
        <h4 className="text-sm font-black text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 font-medium">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
}
