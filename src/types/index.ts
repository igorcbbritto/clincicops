// ============================================================
// ClinicOps — Tipos TypeScript
// Mantidos em sincronia com os enums do supabase-schema.sql
// ============================================================

export type UserRole =
  | 'ADMIN'
  | 'GESTOR'
  | 'TECH_TI'
  | 'TECH_ENG_CLINICA'
  | 'TECH_PREDIAL'
  | 'DASHBOARD'
  | 'SOLICITANTE';

export type OsStatus =
  | 'ABERTA'
  | 'EM_ANALISE'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_PECA'
  | 'AGUARDANDO_TERCEIRO'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type OsPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

// Alinhado com o enum sector_type do banco (inclui ADMINISTRATIVO)
export type SectorType =
  | 'TI'
  | 'ENG_CLINICA'
  | 'MANUTENCAO'
  | 'ADMINISTRATIVO'
  | 'SOLICITANTE';

// ─── Entidades ───────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  sector_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sector {
  id: string;
  name: string;
  type: SectorType;
  location: string | null;
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  sector_type: SectorType;
  estimated_hours: number;
  created_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  asset_tag: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  sector_id: string | null;
  criticality: OsPriority;
  last_maintenance: string | null;
  next_preventive: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrder {
  id: string;
  os_number: number;
  title: string;
  description: string;
  status: OsStatus;
  priority: OsPriority;
  requester_id: string;
  technician_id: string | null;
  target_sector_type: SectorType;
  category_id: string | null;
  equipment_id: string | null;
  location_detail: string | null;
  sla_deadline: string | null;
  started_at: string | null;
  finished_at: string | null;
  diagnosis: string | null;
  solution: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionais
  requester?: Profile;
  technician?: Profile;
  category?: ServiceCategory;
  equipment?: Equipment;
}

export interface ClinicSettings {
  id: string;
  clinic_name: string;
  clinic_email: string | null;
  clinic_phone: string | null;
  clinic_address: string | null;
  default_sla_hours: number;
  logo_url: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

// ─── Constantes de Labels ─────────────────────────────────────

export const SECTOR_TYPE_LABELS: Record<SectorType, string> = {
  TI: 'Tecnologia da Informação',
  ENG_CLINICA: 'Engenharia Clínica',
  MANUTENCAO: 'Manutenção Predial',
  ADMINISTRATIVO: 'Administrativo',
  SOLICITANTE: 'Solicitante',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  TECH_TI: 'Técnico de TI',
  TECH_ENG_CLINICA: 'Técnico de Eng. Clínica',
  TECH_PREDIAL: 'Técnico Predial',
  DASHBOARD: 'Dashboard (Read-only)',
  SOLICITANTE: 'Solicitante',
};

export const OS_STATUS_LABELS: Record<OsStatus, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em Análise',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_PECA: 'Aguardando Peça',
  AGUARDANDO_TERCEIRO: 'Aguardando Terceiro',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export const OS_PRIORITY_LABELS: Record<OsPriority, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};
