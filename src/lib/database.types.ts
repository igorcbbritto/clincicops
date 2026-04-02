// ============================================================
// ClinicOps — Database Types
// Gerado manualmente a partir do supabase-schema.sql v2
// Para atualizar automaticamente: npx supabase gen types typescript --local
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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

export type SectorType =
  | 'TI'
  | 'ENG_CLINICA'
  | 'MANUTENCAO'
  | 'ADMINISTRATIVO'
  | 'SOLICITANTE';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          sector_id: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: UserRole;
          sector_id?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          role?: UserRole;
          sector_id?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      clinic_settings: {
        Row: {
          id: string;
          clinic_name: string;
          clinic_email: string | null;
          clinic_phone: string | null;
          clinic_address: string | null;
          default_sla_hours: number;
          logo_url: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          clinic_name?: string;
          clinic_email?: string | null;
          clinic_phone?: string | null;
          clinic_address?: string | null;
          default_sla_hours?: number;
          logo_url?: string | null;
          updated_by?: string | null;
        };
        Update: {
          clinic_name?: string;
          clinic_email?: string | null;
          clinic_phone?: string | null;
          clinic_address?: string | null;
          default_sla_hours?: number;
          logo_url?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      sectors: {
        Row: {
          id: string;
          name: string;
          type: SectorType;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: SectorType;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          type?: SectorType;
          location?: string | null;
        };
      };
      service_orders: {
        Row: {
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
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status?: OsStatus;
          priority?: OsPriority;
          requester_id: string;
          technician_id?: string | null;
          target_sector_type: SectorType;
          category_id?: string | null;
          equipment_id?: string | null;
          location_detail?: string | null;
          sla_deadline?: string | null;
        };
        Update: {
          title?: string;
          description?: string;
          status?: OsStatus;
          priority?: OsPriority;
          technician_id?: string | null;
          target_sector_type?: SectorType;
          category_id?: string | null;
          equipment_id?: string | null;
          location_detail?: string | null;
          sla_deadline?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          diagnosis?: string | null;
          solution?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          link: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          link?: string | null;
          read?: boolean;
        };
        Update: {
          read?: boolean;
        };
      };
    };
  };
}
