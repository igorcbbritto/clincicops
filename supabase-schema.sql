-- ============================================================
-- CLINICOPS — SUPABASE SQL SCHEMA (v2 — corrigido)
-- Sistema SaaS de Ordens de Serviço Hospitalar
-- ============================================================
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Acesse o SQL Editor no painel do Supabase
-- 2. Execute este script completo em um banco VAZIO
-- 3. Para migrar um banco existente, use supabase-migration.sql
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'ADMIN',
  'GESTOR',
  'TECH_TI',
  'TECH_ENG_CLINICA',
  'TECH_PREDIAL',
  'DASHBOARD',
  'SOLICITANTE'
);

CREATE TYPE os_status AS ENUM (
  'ABERTA',
  'EM_ANALISE',
  'EM_ANDAMENTO',
  'AGUARDANDO_PECA',
  'AGUARDANDO_TERCEIRO',
  'CONCLUIDA',
  'CANCELADA'
);

CREATE TYPE os_priority AS ENUM (
  'BAIXA',
  'MEDIA',
  'ALTA',
  'CRITICA'
);

-- sector_type: inclui ADMINISTRATIVO para alinhar com o frontend
CREATE TYPE sector_type AS ENUM (
  'TI',
  'ENG_CLINICA',
  'MANUTENCAO',
  'ADMINISTRATIVO',
  'SOLICITANTE'
);

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Setores do Hospital
CREATE TABLE sectors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        sector_type NOT NULL,
  location    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Perfis de Usuário (vinculado ao Auth do Supabase)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'SOLICITANTE',
  sector_id   UUID REFERENCES sectors(id),
  phone       TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Configurações da clínica/sistema (singleton por instalação)
CREATE TABLE clinic_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name         TEXT NOT NULL DEFAULT 'ClinicOps',
  clinic_email        TEXT,
  clinic_phone        TEXT,
  clinic_address      TEXT,
  default_sla_hours   INTEGER DEFAULT 24,
  logo_url            TEXT,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  updated_by          UUID REFERENCES profiles(id)
);

-- Garantir que exista no máximo 1 linha de configurações
CREATE UNIQUE INDEX clinic_settings_singleton ON clinic_settings ((true));

-- Categorias de Serviço
CREATE TABLE service_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  sector_type     sector_type NOT NULL,
  estimated_hours INTEGER DEFAULT 2,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Equipamentos (Engenharia Clínica / TI)
CREATE TABLE equipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  asset_tag         TEXT UNIQUE NOT NULL,
  manufacturer      TEXT,
  model             TEXT,
  serial_number     TEXT,
  sector_id         UUID REFERENCES sectors(id),
  criticality       os_priority DEFAULT 'MEDIA',
  last_maintenance  TIMESTAMPTZ,
  next_preventive   TIMESTAMPTZ,
  status            TEXT DEFAULT 'OPERACIONAL',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Ordens de Serviço (OS)
CREATE TABLE service_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_number           SERIAL UNIQUE,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  status              os_status DEFAULT 'ABERTA',
  priority            os_priority DEFAULT 'MEDIA',
  requester_id        UUID REFERENCES profiles(id) NOT NULL,
  technician_id       UUID REFERENCES profiles(id),
  target_sector_type  sector_type NOT NULL,
  category_id         UUID REFERENCES service_categories(id),
  equipment_id        UUID REFERENCES equipments(id),
  location_detail     TEXT,
  sla_deadline        TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  finished_at         TIMESTAMPTZ,
  diagnosis           TEXT,
  solution            TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Histórico de Status (Auditoria)
CREATE TABLE os_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id       UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  status_from os_status,
  status_to   os_status,
  changed_by  UUID REFERENCES profiles(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Comentários
CREATE TABLE os_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id       UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id),
  content     TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Anexos
CREATE TABLE os_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id       UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_type   TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Registro de Tempo Técnico
CREATE TABLE os_time_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id             UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  technician_id     UUID REFERENCES profiles(id),
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ,
  duration_minutes  INTEGER,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Materiais e Peças
CREATE TABLE materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id       UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    NUMERIC DEFAULT 1,
  unit        TEXT DEFAULT 'un',
  unit_price  NUMERIC DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Notificações
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  link        TEXT,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger ao criar usuário: cria profile automaticamente
-- Resiliente: usa INSERT ... ON CONFLICT para não falhar se o profile já existir
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'SOLICITANTE'::user_role
    )
  )
  ON CONFLICT (id) DO NOTHING;  -- Idempotente: não falha se já existir
  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Nunca impedir o cadastro de auth.users por falha no profile
  RAISE WARNING 'handle_new_user: falha ao criar profile para %. Erro: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Triggers de updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_equipments_updated_at
  BEFORE UPDATE ON equipments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON service_orders
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_clinic_settings_updated_at
  BEFORE UPDATE ON clinic_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function para verificar role do usuário logado
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── Profiles ───────────────────────────────────────────────
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (auth_user_role() = 'ADMIN');

-- ─── Ordens de Serviço ──────────────────────────────────────
CREATE POLICY "os_select_by_role"
  ON service_orders FOR SELECT
  USING (
    auth.uid() = requester_id OR
    auth.uid() = technician_id OR
    auth_user_role() IN ('ADMIN', 'GESTOR', 'DASHBOARD') OR
    auth_user_role() LIKE 'TECH_%'
  );

CREATE POLICY "os_insert_own"
  ON service_orders FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "os_update_by_role"
  ON service_orders FOR UPDATE
  USING (
    auth.uid() = requester_id OR
    auth.uid() = technician_id OR
    auth_user_role() IN ('ADMIN', 'GESTOR') OR
    auth_user_role() LIKE 'TECH_%'
  );

-- ─── Setores ────────────────────────────────────────────────
CREATE POLICY "sectors_select_authenticated"
  ON sectors FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "sectors_all_admin"
  ON sectors FOR ALL USING (auth_user_role() = 'ADMIN');

-- ─── Categorias ─────────────────────────────────────────────
CREATE POLICY "categories_select_authenticated"
  ON service_categories FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "categories_all_admin"
  ON service_categories FOR ALL USING (auth_user_role() = 'ADMIN');

-- ─── Equipamentos ────────────────────────────────────────────
CREATE POLICY "equipments_select_authenticated"
  ON equipments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "equipments_all_admin"
  ON equipments FOR ALL USING (auth_user_role() IN ('ADMIN', 'GESTOR'));

-- ─── Configurações da clínica ────────────────────────────────
CREATE POLICY "settings_select_authenticated"
  ON clinic_settings FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "settings_all_admin"
  ON clinic_settings FOR ALL USING (auth_user_role() = 'ADMIN');

-- ─── Histórico de OS ────────────────────────────────────────
CREATE POLICY "os_history_select_by_role"
  ON os_history FOR SELECT
  USING (
    auth_user_role() IN ('ADMIN', 'GESTOR', 'DASHBOARD') OR
    auth_user_role() LIKE 'TECH_%' OR
    EXISTS (SELECT 1 FROM service_orders so WHERE so.id = os_id AND so.requester_id = auth.uid())
  );

-- ─── Comentários ────────────────────────────────────────────
CREATE POLICY "comments_select"
  ON os_comments FOR SELECT
  USING (
    NOT is_internal OR
    auth_user_role() IN ('ADMIN', 'GESTOR') OR
    auth_user_role() LIKE 'TECH_%'
  );

CREATE POLICY "comments_insert_authenticated"
  ON os_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Notificações ────────────────────────────────────────────
CREATE POLICY "notifications_own"
  ON notifications FOR ALL
  USING (auth.uid() = user_id);

-- ─── Histórico de OS (insert) ─────────────────────────────────
CREATE POLICY "os_history_insert"
  ON os_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 5. SEED DATA
-- ============================================================

INSERT INTO sectors (name, type, location) VALUES
  ('UTI Adulto',         'SOLICITANTE',   'Bloco A, 2º Andar'),
  ('Centro Cirúrgico',   'SOLICITANTE',   'Bloco B, 1º Andar'),
  ('TI Central',         'TI',            'Administrativo'),
  ('Engenharia Clínica', 'ENG_CLINICA',   'Subsolo'),
  ('Manutenção Predial', 'MANUTENCAO',    'Anexo C'),
  ('RH',                 'ADMINISTRATIVO','Bloco Admin');

INSERT INTO service_categories (name, sector_type) VALUES
  ('Suporte Software',               'TI'),
  ('Hardware/Desktop',               'TI'),
  ('Rede/Conectividade',             'TI'),
  ('Manutenção Ventilador Pulmonar', 'ENG_CLINICA'),
  ('Calibração Monitor',             'ENG_CLINICA'),
  ('Elétrica/Iluminação',            'MANUTENCAO'),
  ('Hidráulica/Vazamento',           'MANUTENCAO'),
  ('Climatização/Ar-condicionado',   'MANUTENCAO');

-- Inserir configurações padrão da clínica (singleton)
INSERT INTO clinic_settings (clinic_name, default_sla_hours)
VALUES ('ClinicOps', 24)
ON CONFLICT DO NOTHING;
