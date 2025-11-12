import { supabase } from "./supabaseClient";
import { DocumentoAcrobatas } from "../types/documentTypes";

export async function listarDocumentosAcrobatas(): Promise<DocumentoAcrobatas[]> {
  const bucket = "documentos_acrobatas";

  const { data, error } = await supabase.storage.from(bucket).list("", {
    limit: 100,
    offset: 0,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    console.error("Erro ao listar documentos:", error.message);
    return [];
  }

  if (!data) return [];

  return data.map((file) => ({
    id: file.id ?? file.name,
    nome: file.name,
    tamanho: file.metadata?.size ?? 0,
    criadoEm: file.created_at ? new Date(file.created_at) : new Date(),
    url: `${supabase.storage.from(bucket).getPublicUrl(file.name).data.publicUrl}`,
  }));
}
