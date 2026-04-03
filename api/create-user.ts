import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const VALID_ROLES = [
  'ADMIN',
  'GESTOR',
  'TECH_TI',
  'TECH_ENG_CLINICA',
  'TECH_PREDIAL',
  'DASHBOARD',
  'SOLICITANTE',
] as const;

type ValidRole = (typeof VALID_ROLES)[number];

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifyAdmin(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authorization header ausente', status: 401 as const };
  }

  const token = authHeader.replace('Bearer ', '');
  const admin = createAdminClient();

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user) {
    return { error: 'Sessão inválida', status: 401 as const };
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'Perfil do administrador não encontrado', status: 403 as const };
  }

  if (profile.role !== 'ADMIN') {
    return { error: 'Apenas ADMINs podem executar esta ação', status: 403 as const };
  }

  return { userId: user.id };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      receivedMethod: req.method,
    });
  }

  try {
    const auth = await verifyAdmin(req.headers.authorization);

    if ('error' in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { email, password, fullName, role, phone, sector_id } = req.body ?? {};

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        error: 'Campos obrigatórios: email, password, fullName, role',
      });
    }

    if (!VALID_ROLES.includes(role as ValidRole)) {
      return res.status(400).json({
        error: `Role inválida: ${role}`,
      });
    }

    const admin = createAdminClient();

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      email_confirm: true,
      user_metadata: {
        full_name: String(fullName).trim(),
        role,
        phone: phone ?? null,
      },
    });

    if (createError || !newUser?.user) {
      return res.status(400).json({
        error: createError?.message || 'Erro ao criar usuário no auth',
      });
    }

    const profilePayload: Record<string, unknown> = {
      id: newUser.user.id,
      full_name: String(fullName).trim(),
      role,
      phone: phone ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (sector_id) {
      profilePayload.sector_id = sector_id;
    }

    const { error: profileError } = await admin.from('profiles').upsert(profilePayload, {
      onConflict: 'id',
    });

    if (profileError) {
      console.error('[create-user] erro ao criar profile:', profileError);

      await admin.auth.admin.deleteUser(newUser.user.id);

      return res.status(400).json({
        error: profileError.message || 'Erro ao criar perfil do usuário',
      });
    }

    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
      },
    });
  } catch (err: any) {
    console.error('[create-user] erro interno:', err);
    return res.status(500).json({
      error: err?.message || 'Erro interno do servidor',
    });
  }
}
