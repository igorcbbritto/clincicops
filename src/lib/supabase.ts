import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'ADMIN' | 'TECH_TI' | 'TECH_ENG_CLINICA' | 'TECH_PREDIAL' | 'SOLICITANTE' | 'GESTOR' | 'DASHBOARD';
export type OSStatus = 'ABERTA' | 'EM_ANALISE' | 'EM_ANDAMENTO' | 'AGUARDANDO_PECA' | 'AGUARDANDO_TERCEIRO' | 'CONCLUIDA' | 'CANCELADA';
export type OSPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type SectorType = 'TI' | 'ENG_CLINICA' | 'MANUTENCAO' | 'SOLICITANTE' | 'ADMINISTRATIVO';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  sector_id?: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface Sector {
  id: string;
  name: string;
  type: SectorType;
  location?: string;
}

export interface Equipment {
  id: string;
  name: string;
  asset_tag: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  sector_id?: string;
  criticality: OSPriority;
  last_maintenance?: string;
  next_preventive?: string;
  status: string;
}

export interface ServiceOrder {
  id: string;
  os_number: number;
  title: string;
  description: string;
  status: OSStatus;
  priority: OSPriority;
  requester_id: string;
  technician_id?: string;
  target_sector_type: SectorType;
  category_id?: string;
  equipment_id?: string;
  asset_tag?: string;
  location_detail?: string;
  sla_deadline?: string;
  started_at?: string;
  finished_at?: string;
  diagnosis?: string;
  solution?: string;
  created_at: string;
  updated_at: string;
  
  // Joins
  requester?: Profile;
  technician?: Profile;
  equipment?: Equipment;
  category?: { name: string };
}
