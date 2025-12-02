import { createClient } from "@supabase/supabase-js";

/**
 * Configuração central do Supabase (front)
 */

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// 🔐 Segurança básica: não sobe app sem variáveis
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    [
      "❌ Variáveis de ambiente do Supabase não configuradas.",
      "Verifique seu .env e adicione:",
      "VITE_SUPABASE_URL=<sua_url_aqui>",
      "VITE_SUPABASE_ANON_KEY=<sua_chave_anon_public_aqui>",
    ].join("\n")
  );
}

// 🌐 Log só da URL em ambiente de desenvolvimento
if (import.meta.env.DEV) {
  console.log("🌐 [SUPABASE] URL:", supabaseUrl);
  // não precisa logar a chave
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      "x-client-info": "acrobatas-platform",
    },
  },
});

export default supabase;
