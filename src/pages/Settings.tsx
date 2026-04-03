import { useEffect, useState } from 'react';
import { Save, Building2, Mail, Phone, MapPin, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ClinicSettings } from '../types';

type FormState = {
  clinic_name: string;
  clinic_email: string;
  clinic_phone: string;
  clinic_address: string;
  default_sla_hours: number;
};

const DEFAULTS: FormState = {
  clinic_name: '',
  clinic_email: '',
  clinic_phone: '',
  clinic_address: '',
  default_sla_hours: 24,
};

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export default function Settings() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinic_settings')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[Settings] Erro ao carregar configurações:', error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setSettingsId(data.id);
        setForm({
          clinic_name: data.clinic_name ?? '',
          clinic_email: data.clinic_email ?? '',
          clinic_phone: data.clinic_phone ?? '',
          clinic_address: data.clinic_address ?? '',
          default_sla_hours: data.default_sla_hours ?? 24,
        });
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));

    if (saveStatus !== 'idle') setSaveStatus('idle');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('saving');
    setErrorMessage('');

    if (!form.clinic_name.trim()) {
      setSaveStatus('error');
      setErrorMessage('O nome da clínica é obrigatório.');
      return;
    }

    if (form.default_sla_hours < 1 || form.default_sla_hours > 720) {
      setSaveStatus('error');
      setErrorMessage('O SLA padrão deve ser entre 1 e 720 horas.');
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const payload: Partial<ClinicSettings> = {
      clinic_name: form.clinic_name.trim(),
      clinic_email: form.clinic_email.trim() || null,
      clinic_phone: form.clinic_phone.trim() || null,
      clinic_address: form.clinic_address.trim() || null,
      default_sla_hours: form.default_sla_hours,
      updated_by: session?.user?.id ?? null,
    };

    let error: any;

    if (settingsId) {
      const result = await supabase
        .from('clinic_settings')
        .update(payload)
        .eq('id', settingsId);

      error = result.error;
    } else {
      const result = await supabase
        .from('clinic_settings')
        .insert(payload)
        .select('id')
        .single();

      error = result.error;

      if (!error && result.data) {
        setSettingsId(result.data.id);
      }
    }

    if (error) {
      console.error('[Settings] Erro ao salvar:', error.message);
      setSaveStatus('error');
      setErrorMessage(error.message ?? 'Erro desconhecido ao salvar.');
      return;
    }

    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">
          Informações gerais da clínica e parâmetros do sistema.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Dados da Clínica
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="clinic_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome da clínica / hospital <span className="text-red-500">*</span>
              </label>
              <input
                id="clinic_name"
                name="clinic_name"
                type="text"
                required
                value={form.clinic_name}
                onChange={handleChange}
                placeholder="Ex: Hospital São Lucas"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="clinic_email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                <Mail className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                E-mail de contato
              </label>
              <input
                id="clinic_email"
                name="clinic_email"
                type="email"
                value={form.clinic_email}
                onChange={handleChange}
                placeholder="contato@hospital.com.br"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="clinic_phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                <Phone className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                Telefone
              </label>
              <input
                id="clinic_phone"
                name="clinic_phone"
                type="tel"
                value={form.clinic_phone}
                onChange={handleChange}
                placeholder="(11) 3000-0000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="clinic_address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                Endereço
              </label>
              <input
                id="clinic_address"
                name="clinic_address"
                type="text"
                value={form.clinic_address}
                onChange={handleChange}
                placeholder="Rua das Flores, 100 — São Paulo, SP"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Parâmetros do Sistema
          </h2>

          <div>
            <label
              htmlFor="default_sla_hours"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              SLA padrão (horas) <span className="text-red-500">*</span>
            </label>
            <input
              id="default_sla_hours"
              name="default_sla_hours"
              type="number"
              min={1}
              max={720}
              required
              value={form.default_sla_hours}
              onChange={handleChange}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Prazo padrão para resolução de ordens de serviço quando nenhum prazo específico é
              definido (1–720h).
            </p>
          </div>
        </div>

        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Configurações salvas com sucesso.
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMessage || 'Erro ao salvar. Tente novamente.'}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar configurações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
