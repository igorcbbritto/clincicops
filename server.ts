import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Log global para ver se a requisição chega no Express
  app.use((req, res, next) => {
    console.log(`[SERVER LOG] ${req.method} ${req.url}`);
    next();
  });

  // Health check for API
  app.get("/api-health", (req, res) => {
    res.json({ status: "ok", message: "API is running" });
  });

  // API Route to create a user (Caminho ultra-simples para evitar bloqueio)
  app.post("/create-user-v2", async (req, res) => {
    console.log("Recebida requisição para criar usuário...");
    const { email, password, fullName, role, phone } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.error("Erro: Authorization header ausente");
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Configuração do Supabase (URL ou Service Role Key) ausente no servidor.");
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // 1. Verify the requester is an ADMIN
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        console.error("Erro de autenticação do Admin:", authError);
        return res.status(401).json({ error: "Invalid session" });
      }

      // Check profile role
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "ADMIN") {
        console.error("Tentativa de acesso não autorizado por:", user.email);
        return res.status(403).json({ error: "Forbidden: Only admins can create users" });
      }

      console.log(`Admin ${user.email} criando usuário ${email}`);

      // 2. Create the user using Supabase Admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
          role: role,
          phone: phone
        }
      });

      if (createError) {
        console.error("Erro ao criar usuário no Supabase Auth:", createError);
        return res.status(400).json({ error: createError.message });
      }

      console.log("Usuário criado com sucesso no Auth!");

      res.json({ message: "User created successfully", user: newUser.user });
    } catch (error: any) {
      console.error("Erro fatal na API de criação de usuário:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to delete a user
  app.post("/delete-user", async (req, res) => {
    console.log("Recebida requisição para excluir usuário...");
    const { userId } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Configuração do Supabase ausente.");
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // 1. Verify requester is ADMIN
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: "Invalid session" });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden" });
      }

      // 2. Delete the user (this also deletes the profile due to cascade or manual delete)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) throw deleteError;

      // 3. Ensure profile is deleted (Supabase Auth delete doesn't always trigger profile delete if not set up with FK cascade)
      await supabaseAdmin.from("profiles").delete().eq("id", userId);

      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
