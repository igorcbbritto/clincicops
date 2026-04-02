// api/create-user.ts
// Vercel Serverless Function — POST /api/create-user
// Executa server-side com acesso à SUPABASE_SERVICE_ROLE_KEY

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const VALID_ROLES = [
  'ADMIN', 'GESTOR', 'TECH_TI', 'TECH_ENG_CLINICA',
  'TECH_PREDIAL', 'DASHBOARD', 'SOLICITANTE',
];

function createAdminClient() {
  const url = process.env.VITE_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyAdmin(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authorization header ausente', status: 401 };
  }
  const token = authHeader.replace('Bearer ', '');
  const admin = createAdminClient();

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { error: 'Sessão inválida', status: 401 };

  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role !== 'ADMIN') {
    return { error: 'Apenas ADMINs podem executar esta ação', status: 403 };
  }
  return { userId: user.id };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyAdmin(req.headers.authorization);
  if ('error' in auth) return res.status(auth.status).json({ error: auth.error });

  const { email, password, fullName, role, phone } = req.body ?? {};

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Campos obrigatórios: email, password, fullName, role' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role inválida: ${role}` });
  }

  try {
    const admin = createAdminClient();

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role, phone: phone ?? null },
    });

    if (createError) return res.status(400).json({ error: createError.message });

    // Fallback: garante que o profile existe mesmo se o trigger falhar
    if (newUser?.user) {
      await admin.from('profiles').upsert(
        { id: newUser.user.id, full_name: fullName, role },
        { onConflict: 'id' }
      );
    }

    return res.status(201).json({ message: 'Usuário criado com sucesso', user: newUser.user });
  } catch (err: any) {
    console.error('[create-user]', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
