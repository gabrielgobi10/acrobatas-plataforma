// src/components/company/CentralDeNavegacaoEmpresa/Documentos/utils/estruturaAcrobatas.ts
import { supabase } from "./supabaseClient";

/** Bucket onde os arquivos da Acrobatas ficam */
const BUCKET = "documentos_acrobatas";

/* ------------------------------------------------------------------ */
/* Tipos                                                              */
/* ------------------------------------------------------------------ */
type ArquivoInfo = {
  publicUrl: string;
  name: string;
  size: number;
  created_at: string;
};

type TipoItem = {
  tipo: { id: string; nome: string; validade_meses: number | null };
  arquivo?: ArquivoInfo | null;
};

type GrupoBloco = {
  grupo: { id: string; nome: string; descricao: string | null };
  tipos: TipoItem[];
};

/* ------------------------------------------------------------------ */
/* Função principal                                                    */
/* ------------------------------------------------------------------ */

export async function carregarEstrutura(): Promise<GrupoBloco[]> {
  // 1️⃣ Buscar tipos e grupos já unidos pela view
  const { data, error } = await supabase
    .from("tipos_documentos_v")
    .select("*")
    .order("grupo_nome", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao carregar tipos de documentos:", error);
    return [];
  }

  // 2️⃣ Agrupar por grupo_nome
  const gruposMap = new Map<string, GrupoBloco>();

  for (const row of data || []) {
    const grupoId = row.grupo_id || "sem-grupo";
    const grupoNome = row.grupo_nome || "Outros";

    if (!gruposMap.has(grupoId)) {
      gruposMap.set(grupoId, {
        grupo: { id: grupoId, nome: grupoNome, descricao: null },
        tipos: [],
      });
    }

    gruposMap.get(grupoId)!.tipos.push({
      tipo: {
        id: row.id,
        nome: row.nome,
        validade_meses: row.validade_meses ?? null,
      },
      arquivo: null, // preenchido abaixo se houver ficheiro
    });
  }

  // 3️⃣ Buscar arquivos no bucket para cada tipo
  const saida: GrupoBloco[] = [];

  for (const grupo of gruposMap.values()) {
    const tiposComArquivos: TipoItem[] = [];

    for (const t of grupo.tipos) {
      const { data: list } = await supabase.storage.from(BUCKET).list(t.tipo.id, {
        limit: 1,
        sortBy: { column: "created_at", order: "desc" },
      });

      if (list && list.length > 0) {
        const file = list[0];
        const { data: pub } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`${t.tipo.id}/${file.name}`);

        tiposComArquivos.push({
          tipo: t.tipo,
          arquivo: {
            name: file.name,
            size: Number((file as any)?.metadata?.size ?? 0),
            created_at: (file as any)?.created_at ?? new Date().toISOString(),
            publicUrl: pub?.publicUrl ?? "",
          },
        });
      } else {
        tiposComArquivos.push({ tipo: t.tipo, arquivo: null });
      }
    }

    saida.push({
      grupo: grupo.grupo,
      tipos: tiposComArquivos,
    });
  }

  return saida;
}

/* ------------------------------------------------------------------ */
/* Upload e Remoção                                                    */
/* ------------------------------------------------------------------ */

export async function uploadParaTipo(tipoId: string, file: File) {
  const path = `${tipoId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
}

export async function removerArquivoPorPublicUrl(publicUrl: string) {
  if (!publicUrl) return;
  const url = new URL(publicUrl);
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.pathname.indexOf(marker);
  if (idx === -1) return;
  const relative = url.pathname.slice(idx + marker.length);
  if (!relative) return;
  const { error } = await supabase.storage.from(BUCKET).remove([relative]);
  if (error) throw error;
}
