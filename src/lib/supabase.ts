import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

type GlobalWithSupabase = typeof globalThis & {
  __supabase?: ReturnType<typeof createClient>;
};

const g = globalThis as GlobalWithSupabase;

export const supabase =
  g.__supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
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

if (!g.__supabase) g.__supabase = supabase;

export default supabase;
