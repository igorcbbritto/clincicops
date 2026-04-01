-- CLINICOPS - SUPABASE SQL SCHEMA
-- Sistema SaaS de Ordens de Serviço Hospitalar

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('ADMIN', 'GESTOR', 'TECH_TI', 'TECH_ENG_CLINICA', 'TECH_PREDIAL', 'DASHBOARD', 'SOLICITANTE');
CREATE TYPE os_status AS ENUM ('ABERTA', 'EM_ANALISE', 'EM_ANDAMENTO', 'AGUARDANDO_PECA', 'AGUARDANDO_TERCEIRO', 'CONCLUIDA', 'CANCELADA');
CREATE TYPE os_priority AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE sector_type AS ENUM ('TI', 'ENG_CLINICA', 'MANUTENCAO', 'SOLICITANTE');

-- 2. TABLES

-- Setores do Hospital
CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type sector_type NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Perfis de Usuário (vinculado ao Auth do Supabase)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'SOLICITANTE',
  sector_id UUID REFERENCES sectors(id),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categorias de Serviço
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector_type sector_type NOT NULL,
  estimated_hours INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Equipamentos (Engenharia Clínica / TI)
CREATE TABLE equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_tag TEXT UNIQUE NOT NULL, -- Patrimônio
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  sector_id UUID REFERENCES sectors(id),
  criticality os_priority DEFAULT 'MEDIA',
  last_maintenance TIMESTAMPTZ,
  next_preventive TIMESTAMPTZ,
  status TEXT DEFAULT 'OPERACIONAL',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ordens de Serviço (OS)
CREATE TABLE service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_number SERIAL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status os_status DEFAULT 'ABERTA',
  priority os_priority DEFAULT 'MEDIA',
  
  requester_id UUID REFERENCES profiles(id) NOT NULL,
  technician_id UUID REFERENCES profiles(id),
  
  target_sector_type sector_type NOT NULL, -- TI, ENG_CLINICA ou MANUTENCAO
  category_id UUID REFERENCES service_categories(id),
  equipment_id UUID REFERENCES equipments(id),
  
  location_detail TEXT, -- Sala, Leito, Bloco
  
  sla_deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  diagnosis TEXT,
  solution TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Histórico de Status (Auditoria)
CREATE TABLE os_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  status_from os_status,
  status_to os_status,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comentários
CREATE TABLE os_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Anexos
CREATE TABLE os_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Registro de Tempo Técnico
CREATE TABLE os_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Materiais e Peças
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'un',
  unit_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notificações
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- Exemplo de Políticas RLS:
-- 1. Perfis: Usuário vê seu próprio perfil, Admin vê todos.
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- 2. Ordens de Serviço:
-- Solicitantes veem as suas. Técnicos veem as do seu setor. Admins veem todas.
CREATE POLICY "View OS based on role" ON service_orders FOR SELECT USING (
  auth.uid() = requester_id OR 
  auth.uid() = technician_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text LIKE 'TECH_%')
);

CREATE POLICY "Users can insert their own OS" ON service_orders FOR INSERT WITH CHECK (
  auth.uid() = requester_id
);

CREATE POLICY "Users and techs can update OS" ON service_orders FOR UPDATE USING (
  auth.uid() = requester_id OR 
  auth.uid() = technician_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text LIKE 'TECH_%')
);

-- 3. Equipamentos, Setores e Categorias:
-- Leitura pública para usuários autenticados, escrita apenas para Admin.
CREATE POLICY "Authenticated users can view sectors" ON sectors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage sectors" ON sectors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Authenticated users can view categories" ON service_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage categories" ON service_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Authenticated users can view equipments" ON equipments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage equipments" ON equipments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- 4. TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para criar perfil automaticamente ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'SOLICITANTE'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_equipments_updated_at BEFORE UPDATE ON equipments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON service_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. SEED DATA (EXEMPLOS)
INSERT INTO sectors (name, type, location) VALUES 
('UTI Adulto', 'SOLICITANTE', 'Bloco A, 2º Andar'),
('Centro Cirúrgico', 'SOLICITANTE', 'Bloco B, 1º Andar'),
('TI Central', 'TI', 'Administrativo'),
('Engenharia Clínica', 'ENG_CLINICA', 'Subsolo'),
('Manutenção Predial', 'MANUTENCAO', 'Anexo C');

INSERT INTO service_categories (name, sector_type) VALUES
('Suporte Software', 'TI'),
('Hardware/Desktop', 'TI'),
('Rede/Conectividade', 'TI'),
('Manutenção Ventilador Pulmonar', 'ENG_CLINICA'),
('Calibração Monitor', 'ENG_CLINICA'),
('Elétrica/Iluminação', 'MANUTENCAO'),
('Hidráulica/Vazamento', 'MANUTENCAO'),
('Climatização/Ar-condicionado', 'MANUTENCAO');
