import { createClient } from "@supabase/supabase-js";

/**
 * =============================================
 * ⚙️ CONFIGURAÇÃO SUPABASE — ACROBATAS PLATFORM
 * =============================================
 * Este arquivo centraliza a conexão com o Supabase.
 * É usado por todos os módulos (empresa, profissional e admin).
 * Mantém a sessão ativa e garante logs detalhados no ambiente DEV.
 */

// =========================================================
// 🧩 Leitura das variáveis de ambiente (.env)
// =========================================================
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// =========================================================
// 🛑 Verificação de segurança — impede inicialização sem variáveis
// =========================================================
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `
❌ Variáveis de ambiente do Supabase não configuradas corretamente.
--------------------------------------------------------------
Verifique seu arquivo .env e adicione:
VITE_SUPABASE_URL=<sua_url_aqui>
VITE_SUPABASE_ANON_KEY=<sua_chave_aqui>
--------------------------------------------------------------
  `.trim()
  );
}

// =========================================================
// 🧠 Log amigável (somente em ambiente de desenvolvimento)
// =========================================================
if (import.meta.env.DEV) {
  console.log("🌐 [SUPABASE] URL:", supabaseUrl);
  console.log(
    "🔑 [SUPABASE] Key:",
    supabaseAnonKey
      ? supabaseAnonKey.slice(0, 20) + "... (ocultada)"
      : "❌ não encontrada"
  );
}

// =========================================================
// 🔐 Criação do cliente Supabase
// =========================================================
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // mantém login salvo no localStorage
    autoRefreshToken: true, // renova tokens automaticamente
    detectSessionInUrl: true, // permite login via URL (auth redirect)
  },
  global: {
    headers: {
      "x-client-info": "acrobatas-platform",
    },
  },
});

// =========================================================
// 🚀 Exportação padrão
// =========================================================
export default supabase;
