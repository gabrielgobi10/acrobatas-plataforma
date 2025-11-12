// src/utils/supaSafe.ts
import { supabase } from "@/lib/supabase";

/**
 * Retorna o id da empresa vinculada ao usuário logado.
 * Requer a RPC no Supabase:
 *   create or replace function public.minha_empresa_id() returns uuid ...
 * (security definer, checa "usuarios" com RLS)
 */
export async function getEmpresaId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("minha_empresa_id");
  if (error) {
    console.error("[supaSafe.getEmpresaId] ->", error);
    return null;
  }
  return (data as string | null) ?? null;
}

type OrderSpec = { column?: string; ascending?: boolean };
type EqSpec = [column: string, value: any];

type SelectWithOrderOpts = {
  columns?: string;       // default "*"
  order?: OrderSpec;      // tenta created_at -> criado_em -> id se não vier
  eq?: EqSpec[];          // filtros .eq
  limit?: number;
};

/**
 * Select com ordenação "à prova de coluna" (fallbacks):
 * - tenta order by created_at
 * - se 400/404, tenta criado_em
 * - se 400/404, cai para id
 */
export async function selectWithOrder<T = any>(
  table: string,
  opts: SelectWithOrderOpts = {}
): Promise<{ data: T[] | null; error: any | null }> {
  const cols = opts.columns ?? "*";
  const eqs = opts.eq ?? [];
  const limit = opts.limit;
  const requested = opts.order?.column;
  const asc = opts.order?.ascending ?? false;

  // ordem de tentativas
  const candidates = requested
    ? [requested, "created_at", "criado_em", "id"]
    : ["created_at", "criado_em", "id"];

  for (const col of candidates) {
    try {
      let q = supabase.from(table).select(cols);
      for (const [c, v] of eqs) q = q.eq(c, v);
      if (limit) q = q.limit(limit);
      q = q.order(col as any, { ascending: asc });

      const { data, error } = await q;
      if (error) {
        // só tenta fallback quando for erro de coluna inválida (400/404)
        if (error.status === 400 || error.status === 404) continue;
        return { data: null, error };
      }
      return { data: (data as T[]) ?? [], error: null };
    } catch (e: any) {
      // se for erro de coluna, tenta próximo; senão, retorna
      if (e?.status === 400 || e?.status === 404) continue;
      return { data: null, error: e };
    }
  }
  // se todas falharem, retorna último erro genérico
  return { data: [], error: null };
}
