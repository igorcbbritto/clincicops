# ClinicOps

Sistema SaaS de gestão de **Ordens de Serviço Hospitalar**, desenvolvido para hospitais e clínicas que precisam organizar chamados entre equipes de TI, Engenharia Clínica, Manutenção Predial e outros setores.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Backend | Node.js + Express (`server.ts`) |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (JWT) |
| Deploy | Render / Railway / Fly.io (backend + frontend juntos) ou Vercel (só frontend) |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    Usuário (Browser)                │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
          ┌──────────▼──────────┐
          │   Express (server.ts)│
          │  ┌───────────────┐  │
          │  │  /dist        │  │  ← Frontend React (vite build)
          │  │  (estático)   │  │
          │  └───────────────┘  │
          │  ┌───────────────┐  │
          │  │ /create-user-v2│  │  ← Admin API (Service Role Key)
          │  │ /delete-user  │  │
          │  │ /api/health   │  │
          │  └───────────────┘  │
          └──────────┬──────────┘
                     │ Supabase SDK (Service Role Key — nunca exposta ao browser)
          ┌──────────▼──────────┐
          │      Supabase        │
          │  Auth + PostgreSQL   │
          │  RLS + Triggers      │
          └─────────────────────┘
```

> O frontend também acessa o Supabase diretamente via `anon key` para operações de leitura/escrita cobertas pelas políticas RLS (ex: listar OS, criar OS, comentários). O backend só é necessário para operações que exigem a `service_role key` (criar/excluir usuários via Admin API).

---

## Pré-requisitos

- Node.js 20+
- Uma conta no [Supabase](https://supabase.com) com um projeto criado

---

## Rodando localmente

### 1. Clone e instale as dependências

```bash
git clone https://github.com/igorcbbritto/clincicops.git
cd clincicops
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com os valores do seu projeto Supabase:

| Variável | Onde encontrar |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role secret |
| `PORT` | Qualquer porta livre (ex: `3000`) |
| `NODE_ENV` | `development` |
| `ALLOWED_ORIGIN` | Deixe vazio em desenvolvimento |

### 3. Configure o banco de dados

No painel do Supabase, acesse **SQL Editor** e execute:

- **Banco novo:** execute `supabase-schema.sql` (schema completo)
- **Banco existente:** execute `supabase-migration.sql` (migration segura e idempotente)

### 4. Rode o projeto

```bash
# Terminal 1 — Backend Express (porta 3000)
npm run dev

# Terminal 2 — Frontend Vite (porta 5173)
# O vite.config.ts já faz proxy das chamadas de API para localhost:3000
npx vite
```

Acesse em `http://localhost:5173`

---

## Deploy em produção

### Opção A — Monorepo (recomendado): Render / Railway / Fly.io

O Express serve tanto o frontend estático quanto as rotas de API em um único processo.

**Configuração na plataforma:**

```
Build command:  npm run build:all
Start command:  npm start
```

**Variáveis de ambiente na plataforma:**

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ALLOWED_ORIGIN=https://seu-dominio.com
NODE_ENV=production
PORT=               # deixe vazio — a plataforma define automaticamente
```

> ⚠️ `PORT` deve ser lida de `process.env.PORT` (já implementado no `server.ts`). Nunca fixe a porta em produção.

### Opção B — Separado: Vercel (frontend) + Render (backend)

Se quiser separar frontend e backend:

1. **Backend (Render):** deploy do `server.ts` como Web Service Node.js com `npm run build:all && npm start`
2. **Frontend (Vercel):** adicione a variável `VITE_API_URL=https://sua-api.render.com` no Vercel

O `src/lib/api.ts` lê `VITE_API_URL` automaticamente.

---

## Estrutura do projeto

```
clinicops/
├── server.ts                  # Servidor Express (Admin API)
├── tsconfig.server.json       # tsconfig exclusivo para compilar o server
├── vite.config.ts             # Vite (frontend) com proxy para dev
├── supabase-schema.sql        # Schema completo do banco (banco novo)
├── supabase-migration.sql     # Migration incremental (banco existente)
├── .env.example               # Modelo de variáveis de ambiente
└── src/
    ├── lib/
    │   ├── supabase.ts        # Cliente Supabase (anon key)
    │   ├── api.ts             # Chamadas ao backend Express
    │   └── database.types.ts  # Tipos TypeScript gerados do schema
    ├── types/
    │   └── index.ts           # Tipos de domínio (Profile, OS, etc.)
    ├── components/
    │   └── AuthGuard.tsx      # Proteção de rotas por role
    └── pages/
        ├── Login.tsx          # Tela de login (e-mail real)
        └── Settings.tsx       # Configurações com persistência real
```

---

## Dependências do Supabase

### Autenticação

O sistema usa **Supabase Auth** com e-mail e senha. Não há transformação de username para e-mail — o login é feito com e-mail real.

### Trigger: `on_auth_user_created`

Ao criar um usuário em `auth.users`, o trigger `handle_new_user` cria automaticamente uma linha na tabela `profiles`. O trigger é **resiliente**: se falhar (ex: role inválida em `raw_user_meta_data`), loga um aviso mas não impede o cadastro.

O backend (`/create-user-v2`) também faz um `upsert` no profile após criar o usuário no Auth, como fallback extra.

### RLS (Row Level Security)

Todas as tabelas têm RLS habilitado. As políticas seguem estas regras gerais:

| Role | Acesso |
|---|---|
| `ADMIN` | Leitura e escrita em tudo |
| `GESTOR` | Leitura e atualização de OS e equipamentos |
| `TECH_*` | Leitura de todas as OS, escrita nas atribuídas a eles |
| `SOLICITANTE` | Apenas suas próprias OS |
| `DASHBOARD` | Leitura somente |

### Tabela `clinic_settings`

Tabela singleton (máximo 1 linha, garantida por índice único). Usada pela tela de Settings para persistir configurações da clínica. Qualquer usuário autenticado pode ler; apenas `ADMIN` pode escrever.

### Enum `sector_type`

Valores: `TI`, `ENG_CLINICA`, `MANUTENCAO`, `ADMINISTRATIVO`, `SOLICITANTE`.

> ⚠️ O valor `ADMINISTRATIVO` foi adicionado na v2. Se você tem um banco da v1, execute `supabase-migration.sql` antes de usar esta versão do frontend.

---

## Variáveis de ambiente — referência completa

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | URL do projeto Supabase (exposta ao browser) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Chave anônima do Supabase (exposta ao browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Chave de serviço — **nunca exponha no frontend** |
| `PORT` | — | Porta do servidor (padrão: 3000; em produção, definida pela plataforma) |
| `NODE_ENV` | — | `development` ou `production` |
| `ALLOWED_ORIGIN` | Prod | Domínio do frontend em produção para restrição CORS |
| `VITE_API_URL` | Opção B | URL do backend separado (deixe vazio na Opção A) |

---

## Scripts disponíveis

```bash
npm run dev          # Inicia o servidor Express em modo dev (tsx watch)
npm run build        # Compila o frontend com Vite → dist/
npm run build:server # Compila o server.ts com tsc → dist-server/
npm run build:all    # Compila frontend + backend
npm start            # Inicia o servidor de produção (node dist-server/server.js)
npm run lint         # Verificação de tipos TypeScript
npm run clean        # Remove dist/ e dist-server/
```
