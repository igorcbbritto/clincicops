// api/delete-user.ts
// Vercel Serverless Function — POST /api/delete-user

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
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
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await verifyAdmin(req.headers.authorization);
  if ('error' in auth) return res.status(auth.status).json({ error: auth.error });

  const { userId } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: 'Campo obrigatório: userId' });

  if (userId === auth.userId) {
    return res.status(400).json({ error: 'Um admin não pode excluir a própria conta' });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return res.status(400).json({ error: error.message });

    // Garantia extra (cascade FK já faz isso, mas por segurança)
    await admin.from('profiles').delete().eq('id', userId);

    return res.json({ message: 'Usuário excluído com sucesso' });
  } catch (err: any) {
    console.error('[delete-user]', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
