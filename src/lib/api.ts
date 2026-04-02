// src/lib/api.ts
// No Vercel, os endpoints são relativos: /api/create-user, /api/delete-user
// Funciona automaticamente em localhost (vite dev proxy) e em produção.

import { supabase } from './supabase';

async function getAuthToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return session.access_token;
}

async function authFetch(path: string, body: object): Promise<Response> {
  const token = await getAuthToken();
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

export interface ApiResult<T = void> {
  data?: T;
  error?: string;
}

export async function apiCreateUser(payload: {
  email: string;
  password: string;
  fullName: string;
  role: string;
  phone?: string;
}): Promise<ApiResult<{ id: string; email: string }>> {
  try {
    const res = await authFetch('/api/create-user', payload);
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? `Erro ${res.status}` };
    return { data: json.user };
  } catch (err: any) {
    return { error: err.message ?? 'Erro de conexão' };
  }
}

export async function apiDeleteUser(userId: string): Promise<ApiResult> {
  try {
    const res = await authFetch('/api/delete-user', { userId });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? `Erro ${res.status}` };
    return {};
  } catch (err: any) {
    return { error: err.message ?? 'Erro de conexão' };
  }
}
