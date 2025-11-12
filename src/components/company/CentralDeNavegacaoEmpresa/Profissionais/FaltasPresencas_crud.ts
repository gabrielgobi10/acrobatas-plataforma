import { supabase } from "../../../../../lib/supabase";

export async function marcarPresenca(
  obraId: string,
  dataRef: string,
  profissional_id: string,
  entrada: string,
  saida: string,
  toHours: (a: string, b: string) => number,
  setPresencasMap: Function,
  setSaving: Function
) {
  if (!obraId) return;
  const horas_trabalhadas = toHours(entrada, saida);
  const payload = {
    obra_id: obraId,
    profissional_id,
    data: dataRef,
    entrada,
    saida,
    status: "presente",
    motivo_falta: null,
    observacoes: null,
    horas_trabalhadas,
  };

  // Atualiza otimisticamente
  setPresencasMap((prev: any) => ({
    ...prev,
    [profissional_id]: {
      id: prev[profissional_id]?.id || `tmp_${profissional_id}`,
      ...payload,
    },
  }));

  setSaving(true);
  try {
    const { data, error } = await supabase
      .from("faltas_presencas")
      .upsert(payload, {
        onConflict: "obra_id,profissional_id,data",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;

    setPresencasMap((prev: any) => ({
      ...prev,
      [profissional_id]: data,
    }));

    console.log("✅ Presença registrada com sucesso:", data);
  } catch (error) {
    console.error("❌ Erro ao registrar presença:", error);
    setPresencasMap((prev: any) => {
      const copy = { ...prev };
      delete copy[profissional_id];
      return copy;
    });
  } finally {
    setSaving(false);
  }
}

export async function marcarFalta(
  obraId: string,
  dataRef: string,
  profissional_id: string,
  motivo_falta: string,
  setPresencasMap: Function,
  setSaving: Function
) {
  if (!obraId) return;

  const payload = {
    obra_id: obraId,
    profissional_id,
    data: dataRef,
    entrada: null,
    saida: null,
    status: "falta",
    motivo_falta: motivo_falta || "Não informado",
    observacoes: null,
    horas_trabalhadas: 0,
  };

  setPresencasMap((prev: any) => ({
    ...prev,
    [profissional_id]: {
      id: prev[profissional_id]?.id || `tmp_${profissional_id}`,
      ...payload,
    },
  }));

  setSaving(true);
  try {
    const { data, error } = await supabase
      .from("faltas_presencas")
      .upsert(payload, {
        onConflict: "obra_id,profissional_id,data",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;

    setPresencasMap((prev: any) => ({
      ...prev,
      [profissional_id]: data,
    }));

    console.log("✅ Falta registrada com sucesso:", data);
  } catch (error) {
    console.error("❌ Erro ao registrar falta:", error);
    setPresencasMap((prev: any) => {
      const copy = { ...prev };
      delete copy[profissional_id];
      return copy;
    });
  } finally {
    setSaving(false);
  }
}

export async function deletarPresenca(
  profissional_id: string,
  presencasMap: any,
  setPresencasMap: Function
) {
  const rec = presencasMap[profissional_id];
  if (!rec?.id) return;

  const backup = rec;
  setPresencasMap((prev: any) => {
    const copy = { ...prev };
    delete copy[profissional_id];
    return copy;
  });

  const { error } = await supabase
    .from("faltas_presencas")
    .delete()
    .eq("id", rec.id);

  if (error) {
    console.error("❌ Erro ao deletar presença:", error);
    setPresencasMap((prev: any) => ({ ...prev, [profissional_id]: backup }));
  }
}
