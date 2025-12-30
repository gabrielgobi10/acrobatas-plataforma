// src/components/company/FaltasPresencas/PresencasPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  UserCheck,
  UserX,
  Clock,
  Building2,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Trash2,
  Pencil,
  ListChecks,
  Users,
  Loader2,
  Info,
  AlertTriangle,
  Settings2,
} from "lucide-react";

/* ======================
   Tipos
====================== */
type Obra = { id: string; nome: string };
type Profissional = { id: string; nome: string; area?: string | null };
type Vinculo = {
  id: string;
  obra_id?: string;
  profissional_id: string;
  tipo_profissional?: string | null;
  status?: string | null;
  profissional?: Profissional;
};
type AttendanceStatus = "presente" | "falta";
type Presenca = {
  id: string;
  obra_id: string;
  profissional_id: string;
  data: string; // YYYY-MM-DD
  entrada: string | null; // HH:MM
  saida: string | null; // HH:MM
  status: AttendanceStatus;
  motivo_falta: string | null;
  observacoes: string | null;
  horas_trabalhadas: number | null;
  marcado_por?: string | null;
  created_at?: string;
  updated_at?: string;
  profissional?: Profissional;
};

/* ======================
   Utils
====================== */
function todayISO() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}
function toHours(entrada?: string | null, saida?: string | null) {
  if (!entrada || !saida) return 0;
  const [eh, em] = entrada.split(":").map(Number);
  const [sh, sm] = saida.split(":").map(Number);
  const start = eh * 60 + em;
  const end = sh * 60 + sm;
  const diffMin = Math.max(0, end - start);
  return +(diffMin / 60).toFixed(2);
}
function fmtHours(n?: number | null) {
  if (!n) return "0h";
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return `${h}h${m ? String(m).padStart(2, "0") : ""}`;
}
function csvEscape(s: string) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function downloadCSV(filename: string, rows: string[][]) {
  const content = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const csvContent = "\uFEFF" + content; // BOM
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function cx(...arr: (string | false | null | undefined)[]) {
  return arr.filter(Boolean).join(" ");
}

/* ======================
   RPC helper — mesma lógica de Custos Mensais
====================== */
async function getMinhaEmpresaId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("minha_empresa_id");
  if (error) {
    console.error("[PresencasPage] minha_empresa_id ->", error.message || error);
    return null;
  }
  return (data as string) ?? null;
}

/* ======================
   Página
====================== */
export default function PresencasPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState<string>("");

  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [dataRef, setDataRef] = useState<string>(todayISO());
  const [query, setQuery] = useState("");

  const [presencasMap, setPresencasMap] = useState<Record<string, Presenca>>({});
  const [resumo, setResumo] = useState({ presentes: 0, faltas: 0, horas: 0 });

  // Histórico
  const [histLoading, setHistLoading] = useState(false);
  const [histStart, setHistStart] = useState<string>(todayISO());
  const [histEnd, setHistEnd] = useState<string>(todayISO());
  const [hist, setHist] = useState<Presenca[]>([]);
  const [histPage, setHistPage] = useState(1);
  const histPageSize = 10;

  // Edição inline no histórico
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Presenca>>({});

  // Ações em massa (defaults)
  const [horaEntradaPadrao, setHoraEntradaPadrao] = useState("08:00");
  const [horaSaidaPadrao, setHoraSaidaPadrao] = useState("17:00");

  // UI
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [showSheet, setShowSheet] = useState(false); // bottom sheet (mobile)

  const filteredVinculos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vinculos.filter((v) => {
      const n = v.profissional?.nome?.toLowerCase() || "";
      const f = v.profissional?.area?.toLowerCase() || "";
      return !q || n.includes(q) || f.includes(q);
    });
  }, [vinculos, query]);

  const historicoPaginado = useMemo(() => {
    const start = (histPage - 1) * histPageSize;
    return hist.slice(start, start + histPageSize);
  }, [hist, histPage]);

  const deveAtualizarHistoricoHoje = () =>
    dataRef >= histStart && dataRef <= histEnd;

  /* =========================
     Buscar empresa
  ========================= */
  useEffect(() => {
    (async () => {
      try {
        const id = await getMinhaEmpresaId();
        setEmpresaId(id);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  /* =========================
     Carregar obras da empresa
  ========================= */
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: o, error } = await supabase
          .from("obras")
          .select("id, nome")
          .eq("empresa_id", empresaId)
          .order("nome", { ascending: true });

        if (error) throw error;
        setObras(o || []);
        if (o && o.length && !obraId) setObraId(o[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  /* =========================
     Carregar vínculos
  ========================= */
  useEffect(() => {
    if (!obraId) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profissionais_obras")
          .select(
            `
              id,
              obra_id,
              profissional_id,
              status,
              funcao,
              profissional:profissionais (id, nome, area)
            `
          )
          .eq("obra_id", obraId);

        if (error) throw error;
        setVinculos((data || []) as Vinculo[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [obraId]);

  /* ======================
     Carregar presenças do dia
  ====================== */
  useEffect(() => {
    if (!obraId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("faltas_presencas")
          .select(`
            id,
            obra_id,
            profissional_id,
            data,
            entrada,
            saida,
            status,
            motivo_falta,
            observacoes,
            horas_trabalhadas,
            profissional:profissionais(id, nome, area)
          `)
          .eq("obra_id", obraId)
          .eq("data", dataRef);
        if (error) throw error;

        const map: Record<string, Presenca> = {};
        (data || []).forEach((p) => {
          map[p.profissional_id] = p as Presenca;
        });
        setPresencasMap(map);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [obraId, dataRef]);

  /* ======================
     Recalcular resumo
  ====================== */
  useEffect(() => {
    let presentes = 0;
    let faltas = 0;
    let horas = 0;
    vinculos.forEach((v) => {
      const p = presencasMap[v.profissional_id];
      if (p?.status === "presente") {
        presentes++;
        horas += p.horas_trabalhadas ?? toHours(p.entrada, p.saida);
      } else if (p?.status === "falta") {
        faltas++;
      }
    });
    setResumo({ presentes, faltas, horas: +horas.toFixed(2) });
  }, [vinculos, presencasMap]);

  /* ======================
     Histórico
  ====================== */
  async function fetchHistorico() {
    if (!obraId) return;
    setHistLoading(true);
    try {
      const { data, error } = await supabase
        .from("faltas_presencas")
        .select(
          "id, obra_id, profissional_id, data, entrada, saida, status, motivo_falta, observacoes, horas_trabalhadas, profissional:profissionais(id, nome, area)"
        )
        .eq("obra_id", obraId)
        .gte("data", histStart)
        .lte("data", histEnd)
        .order("data", { ascending: false });
      if (error) throw error;
      setHist((data || []) as Presenca[]);
      setHistPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setHistLoading(false);
    }
  }

  /* ======================
     CRUD do dia
  ====================== */
  async function handleMarcarPresenca(
    profissional_id: string,
    entradaLocal: string,
    saidaLocal: string,
    observacoes: string = ""
  ) {
    if (!obraId) return;

    // Normaliza entrada/saída: se vier vazio usa padrão
    const entrada = (entradaLocal || horaEntradaPadrao || "").trim() || null;
    const saida = (saidaLocal || horaSaidaPadrao || "").trim() || null;
    const horas_trabalhadas =
      entrada && saida ? toHours(entrada, saida) : 0;

    const payload = {
      obra_id: obraId,
      profissional_id,
      data: dataRef,
      entrada,
      saida,
      status: "presente" as AttendanceStatus,
      motivo_falta: null,
      observacoes: observacoes || null,
      horas_trabalhadas,
    };

    // Estado otimista
    setPresencasMap((prev) => ({
      ...prev,
      [profissional_id]: {
        id: prev[profissional_id]?.id || `tmp_${profissional_id}`,
        ...payload,
      } as Presenca,
    }));

    setSaving(true);
    const { data, error } = await supabase
      .from("faltas_presencas")
      .upsert(payload, {
        onConflict: "obra_id,profissional_id,data",
        ignoreDuplicates: false,
      })
      .select()
      .single();
    setSaving(false);

    if (error) {
      console.error(error);
      // rollback
      setPresencasMap((prev) => {
        const copy = { ...prev };
        delete copy[profissional_id];
        return copy;
      });
      return;
    }

    setPresencasMap((prev) => ({
      ...prev,
      [profissional_id]: data as Presenca,
    }));

    if (deveAtualizarHistoricoHoje()) {
      fetchHistorico();
    }
  }

  async function handleMarcarFalta(
    profissional_id: string,
    motivo_falta: string = "Não informado",
    observacoes: string = ""
  ) {
    if (!obraId) return;
    const payload = {
      obra_id: obraId,
      profissional_id,
      data: dataRef,
      entrada: null,
      saida: null,
      status: "falta" as AttendanceStatus,
      motivo_falta: (motivo_falta || "Não informado").trim(),
      observacoes: observacoes || null,
      horas_trabalhadas: 0,
    };

    // otimista
    setPresencasMap((prev) => ({
      ...prev,
      [profissional_id]: {
        id: prev[profissional_id]?.id || `tmp_${profissional_id}`,
        ...payload,
      } as Presenca,
    }));

    setSaving(true);
    const { data, error } = await supabase
      .from("faltas_presencas")
      .upsert(payload, {
        onConflict: "obra_id,profissional_id,data",
        ignoreDuplicates: false,
      })
      .select()
      .single();
    setSaving(false);

    if (error) {
      console.error(error);
      setPresencasMap((prev) => {
        const copy = { ...prev };
        delete copy[profissional_id];
        return copy;
      });
      return;
    }

    setPresencasMap((prev) => ({
      ...prev,
      [profissional_id]: data as Presenca,
    }));

    if (deveAtualizarHistoricoHoje()) {
      fetchHistorico();
    }
  }

  async function handleDeletarPresenca(profissional_id: string) {
    const rec = presencasMap[profissional_id];
    if (!rec?.id) return;
    const backup = rec;

    setPresencasMap((prev) => {
      const copy = { ...prev };
      delete copy[profissional_id];
      return copy;
    });

    const { error } = await supabase
      .from("faltas_presencas")
      .delete()
      .eq("id", rec.id);
    if (error) {
      console.error(error);
      setPresencasMap((prev) => ({ ...prev, [profissional_id]: backup }));
      return;
    }

    if (deveAtualizarHistoricoHoje()) {
      fetchHistorico();
    }
  }

  async function marcarTodosFalta(motivo = "Não informado") {
    if (!obraId) return;
    setSaving(true);

    try {
      const motivoTrim = (motivo || "Não informado").trim();

      const payloads = filteredVinculos.map((v) => ({
        obra_id: obraId,
        profissional_id: v.profissional_id,
        data: dataRef,
        entrada: null,
        saida: null,
        status: "falta" as AttendanceStatus,
        motivo_falta: motivoTrim,
        observacoes: null,
        horas_trabalhadas: 0,
      }));

      const optimistic: Record<string, Presenca> = {};
      payloads.forEach((p) => {
        optimistic[p.profissional_id] = {
          id: `tmp_${p.profissional_id}`,
          ...p,
        } as Presenca;
      });
      setPresencasMap((prev) => ({ ...prev, ...optimistic }));

      const { error } = await supabase
        .from("faltas_presencas")
        .upsert(payloads, {
          onConflict: "obra_id,profissional_id,data",
          ignoreDuplicates: false,
        })
        .select();

      if (error) throw error;

      const { data } = await supabase
        .from("faltas_presencas")
        .select(
          "id, obra_id, profissional_id, data, entrada, saida, status, motivo_falta, observacoes, horas_trabalhadas"
        )
        .eq("obra_id", obraId)
        .eq("data", dataRef);

      const map: Record<string, Presenca> = {};
      (data || []).forEach((p) => (map[p.profissional_id] = p as Presenca));
      setPresencasMap((prev) => ({ ...prev, ...map }));

      if (deveAtualizarHistoricoHoje()) {
        fetchHistorico();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function marcarTodosPresentes() {
    if (!obraId) return;
    setSaving(true);

    try {
      const payloads = filteredVinculos.map((v) => {
        const entrada = (horaEntradaPadrao || "").trim() || null;
        const saida = (horaSaidaPadrao || "").trim() || null;
        return {
          obra_id: obraId,
          profissional_id: v.profissional_id,
          data: dataRef,
          entrada,
          saida,
          status: "presente" as AttendanceStatus,
          motivo_falta: null,
          observacoes: null,
          horas_trabalhadas: toHours(entrada ?? undefined, saida ?? undefined),
        };
      });

      const optimistic: Record<string, Presenca> = {};
      payloads.forEach((p) => {
        optimistic[p.profissional_id] = {
          id: `tmp_${p.profissional_id}`,
          ...p,
        } as Presenca;
      });
      setPresencasMap((prev) => ({ ...prev, ...optimistic }));

      const { error } = await supabase
        .from("faltas_presencas")
        .upsert(payloads, {
          onConflict: "obra_id,profissional_id,data",
          ignoreDuplicates: false,
        })
        .select();

      if (error) throw error;

      const { data } = await supabase
        .from("faltas_presencas")
        .select(
          "id, obra_id, profissional_id, data, entrada, saida, status, motivo_falta, observacoes, horas_trabalhadas"
        )
        .eq("obra_id", obraId)
        .eq("data", dataRef);

      const map: Record<string, Presenca> = {};
      (data || []).forEach((p) => (map[p.profissional_id] = p as Presenca));

      setPresencasMap((prev) => ({ ...prev, ...map }));

      if (deveAtualizarHistoricoHoje()) {
        fetchHistorico();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  /* ======================
     Histórico – edição
  ====================== */
  async function salvarEdicaoHist() {
    if (!editingId) return;
    setSaving(true);
    try {
      const payload = { ...editValues } as Partial<Presenca>;
      if (payload.entrada !== undefined || payload.saida !== undefined) {
        const target = hist.find((h) => h.id === editingId);
        const ent = payload.entrada ?? target?.entrada ?? null;
        const sai = payload.saida ?? target?.saida ?? null;
        payload.horas_trabalhadas = toHours(ent || undefined, sai || undefined);
      }
      const { data, error } = await supabase
        .from("faltas_presencas")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (error) throw error;
      setHist((prev) =>
        prev.map((h) => (h.id === editingId ? (data as Presenca) : h))
      );
      setEditingId(null);
      setEditValues({});
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function excluirHist(id: string) {
    const backup = hist;
    setHist((prev) => prev.filter((h) => h.id !== id));
    const { error } = await supabase.from("faltas_presencas").delete().eq("id", id);
    if (error) {
      console.error(error);
      setHist(backup);
    }
  }

  function exportarCSV() {
    const rows: string[][] = [
      [
        "Obra",
        "Data",
        "Profissional",
        "Função",
        "Status",
        "Entrada",
        "Saída",
        "Horas",
        "Motivo Falta",
        "Observações",
      ],
    ];
    hist.forEach((h) => {
      const obraNome = obras.find((o) => o.id === h.obra_id)?.nome || h.obra_id;
      rows.push([
        obraNome,
        h.data,
        h.profissional?.nome || h.profissional_id,
        h.profissional?.area || "",
        h.status,
        h.entrada || "",
        h.saida || "",
        String(h.horas_trabalhadas ?? toHours(h.entrada, h.saida)),
        h.motivo_falta || "",
        h.observacoes || "",
      ]);
    });
    const obraNome = obras.find((o) => o.id === obraId)?.nome || "obra";
    downloadCSV(`presencas_${obraNome}_${histStart}_a_${histEnd}.csv`, rows);
  }

  /* ======================
     Linha do profissional
  ====================== */
  function LinhaProfissional({ v }: { v: Vinculo }) {
    const rec = presencasMap[v.profissional_id];
    const [entrada, setEntrada] = useState(rec?.entrada || horaEntradaPadrao);
    const [saida, setSaida] = useState(rec?.saida || horaSaidaPadrao);
    const [motivo, setMotivo] = useState(rec?.motivo_falta || "");
    const [obs, setObs] = useState(rec?.observacoes || "");
    const status = rec?.status;

    useEffect(() => {
      setEntrada(rec?.entrada || horaEntradaPadrao);
      setSaida(rec?.saida || horaSaidaPadrao);
      setMotivo(rec?.motivo_falta || "");
      setObs(rec?.observacoes || "");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rec?.id, horaEntradaPadrao, horaSaidaPadrao]);

    const open = !!openCards[v.profissional_id];

    return (
      <div
        className={cx(
          "rounded-xl border p-3 shadow-sm",
          "bg-white border-slate-200",
          "dark:bg-slate-900 dark:border-slate-700"
        )}
      >
        {/* Cabeçalho */}
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-left">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Users className="h-5 w-5 text-slate-600 dark:text-slate-200" />
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-50">
                {v.profissional?.nome}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {v.profissional?.area || "—"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cx(
                "rounded-full px-2 py-1 text-xs border",
                status === "presente" &&
                  "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
                status === "falta" &&
                  "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800",
                !status &&
                  "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
              )}
            >
              {status ? (status === "presente" ? "Presente" : "Falta") : "—"}
            </span>

            {/* Detalhes */}
            <button
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              onClick={() =>
                setOpenCards((prev) => ({ ...prev, [v.profissional_id]: !open }))
              }
              aria-expanded={open}
              title="Detalhes"
            >
              <ChevronDown
                className={cx(
                  "h-4 w-4 text-slate-500 dark:text-slate-300 transition-transform",
                  open ? "rotate-180" : ""
                )}
              />
            </button>
          </div>
        </div>

        {/* Botões rápidos (mobile) */}
        <div className="mt-3 flex items-center gap-2 md:hidden">
          <button
            onClick={() => handleMarcarPresenca(v.profissional_id, entrada, saida, obs)}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 active:scale-[0.99]"
          >
            <UserCheck className="h-4 w-4" />
            Presença
          </button>
          <button
            onClick={() =>
              handleMarcarFalta(v.profissional_id, motivo || "Não informado", obs)
            }
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 active:scale-[0.99]"
          >
            <UserX className="h-4 w-4" />
            Falta
          </button>
          {status && (
            <button
              onClick={() => handleDeletarPresenca(v.profissional_id)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              title="Remover"
            >
              <Trash2 className="h-4 w-4 text-slate-500 dark:text-slate-300" />
            </button>
          )}
        </div>

        {/* Detalhes */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="mt-3"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Entrada
                  </label>
                  <input
                    type="time"
                    value={entrada || ""}
                    onChange={(e) => setEntrada(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                    disabled={status === "falta"}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Saída
                  </label>
                  <input
                    type="time"
                    value={saida || ""}
                    onChange={(e) => setSaida(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                    disabled={status === "falta"}
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Motivo Falta
                  </label>
                  <select
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                    disabled={status === "presente"}
                  >
                    <option value="">—</option>
                    <option value="Doença">Doença</option>
                    <option value="Atestado">Atestado</option>
                    <option value="Falta injustificada">Falta injustificada</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Observações
                  </label>
                  <input
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    placeholder="Opcional"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50 placeholder:text-slate-400"
                  />
                </div>

                <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {status === "presente" && (
                      <>
                        {entrada}–{saida} • {fmtHours(toHours(entrada, saida))}
                      </>
                    )}
                  </div>
                  {/* Desktop: botões aqui */}
                  <div className="hidden md:flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        handleMarcarPresenca(v.profissional_id, entrada, saida, obs)
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      <UserCheck className="h-4 w-4" />
                      Marcar Presença
                    </button>
                    <button
                      onClick={() =>
                        handleMarcarFalta(
                          v.profissional_id,
                          motivo || "Não informado",
                          obs
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                    >
                      <UserX className="h-4 w-4" />
                      Marcar Falta
                    </button>
                    {status && (
                      <button
                        onClick={() => handleDeletarPresenca(v.profissional_id)}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        title="Remover marcação do dia"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ======================
     Render
  ====================== */
  return (
    <div className="mx-auto max-w-7xl p-3 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50">
            Faltas & Presenças
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 md:block">
            Marque presença/falta, registre entrada/saída e acompanhe o histórico por
            obra.
          </p>
        </div>
        {saving && (
          <span className="inline-flex items-center gap-2 self-start rounded-lg bg-amber-100 px-3 py-1.5 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando...
          </span>
        )}
      </div>

      {/* Filtros principais — sticky no mobile */}
      <div className="sticky top-0 z-20 mb-4 md:mb-8 rounded-xl border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/90 dark:border-slate-700 p-3 md:p-4">
        <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Obra
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <select
                className="w-full rounded-lg border px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                value={obraId}
                onChange={(e) => setObraId(e.target.value)}
              >
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Data
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <input
                type="date"
                className="w-full rounded-lg border px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                value={dataRef}
                onChange={(e) => setDataRef(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Buscar
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border px-2 focus-within:ring-2 focus-within:ring-slate-400 dark:focus-within:ring-slate-500 dark:bg-slate-900 dark:border-slate-700">
              <Search className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome ou função"
                className="w-full py-2 text-base md:text-sm outline-none bg-transparent text-slate-900 dark:text-slate-50 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Chips mobile + botão de ações */}
        <div className="mt-3 md:hidden">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Presentes
              </span>
              <span className="text-lg font-bold text-emerald-600">
                {resumo.presentes}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Faltas
              </span>
              <span className="text-lg font-bold text-rose-600">
                {resumo.faltas}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 bg-white dark:bg-slate-900 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Horas
              </span>
              <span className="text-lg font-bold">
                {fmtHours(resumo.horas)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowSheet(true)}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700"
            title="Ações em massa"
          >
            <Settings2 className="h-4 w-4" />
            Ações em massa
          </button>
        </div>

        {/* Desktop: cartões de estatística */}
        <div className="hidden md:grid mt-4 mb-2 grid-cols-1 gap-4 md:grid-cols-12">
          <div className="rounded-xl border p-4 md:col-span-4 bg-white dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 dark:text-slate-50">
                Presentes
              </div>
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              {resumo.presentes}
            </div>
          </div>
          <div className="rounded-xl border p-4 md:col-span-4 bg-white dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 dark:text-slate-50">
                Faltas
              </div>
              <UserX className="h-5 w-5 text-rose-600" />
            </div>
            <div className="mt-2 text-3xl font-bold text-rose-700 dark:text-rose-400">
              {resumo.faltas}
            </div>
          </div>
          <div className="rounded-xl border p-4 md:col-span-4 bg-white dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 dark:text-slate-50">
                Horas do dia
              </div>
              <Clock className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
              {fmtHours(resumo.horas)}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Ações em massa */}
      <div className="hidden md:block mb-8 rounded-xl border p-4 bg-white dark:bg-slate-900 dark:border-slate-700">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Entrada padrão
              </label>
              <input
                type="time"
                value={horaEntradaPadrao}
                onChange={(e) => setHoraEntradaPadrao(e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Saída padrão
              </label>
              <input
                type="time"
                value={horaSaidaPadrao}
                onChange={(e) => setHoraSaidaPadrao(e.target.value)}
                className="mt-1 w-full rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
              />
            </div>
            <div className="col-span-2 flex items-end gap-2">
              <button
                onClick={marcarTodosPresentes}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <ListChecks className="h-4 w-4" />
                Marcar todos como Presente
              </button>
              <button
                onClick={() => marcarTodosFalta("Falta injustificada")}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                <X className="h-4 w-4" />
                Marcar todos como Falta
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-[rgba(251,191,36,0.3)] dark:bg-amber-900/10 dark:text-amber-200">
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4" />
              Dica: ajuste os horários padrão antes de “Marcar todos”.
            </div>
          </div>
        </div>
      </div>

      {/* Lista de profissionais */}
      <div className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold text-slate-700 dark:text-slate-50">
            Profissionais da obra ({filteredVinculos.length})
          </div>
          {loading && (
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </span>
          )}
        </div>

        <div className="space-y-3">
          {filteredVinculos.length === 0 && (
            <div className="rounded-xl border p-6 text-center text-slate-600 bg-white dark:bg-slate-900 dark:border-slate-700">
              Nenhum profissional encontrado nesta obra.
            </div>
          )}

          <AnimatePresence initial={false}>
            {filteredVinculos.map((v) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <LinhaProfissional v={v} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Histórico — header */}
      <div className="mt-4 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Histórico
        </h2>
        <button
          onClick={exportarCSV}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros do histórico */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <label className="text-xs text-slate-500 dark:text-slate-400">
            De
          </label>
          <input
            type="date"
            value={histStart}
            onChange={(e) => setHistStart(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
          />
        </div>
        <div className="md:col-span-3">
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Até
          </label>
          <input
            type="date"
            value={histEnd}
            onChange={(e) => setHistEnd(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
          />
        </div>
        <div className="md:col-span-6 flex items-end">
          <button
            onClick={fetchHistorico}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700"
          >
            <Filter className="h-4 w-4" />
            Aplicar Filtro
          </button>
          {histLoading && (
            <span className="ml-3 inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando histórico...
            </span>
          )}
        </div>
      </div>

      {/* Mobile: cards do histórico */}
      <div className="md:hidden space-y-3">
        {historicoPaginado.length === 0 ? (
          <div className="rounded-xl border p-4 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Nenhum registro no período.
          </div>
        ) : (
          historicoPaginado.map((h) => {
            const editing = editingId === h.id;
            return (
              <div
                key={h.id}
                className="rounded-xl border p-3 bg-white dark:bg-slate-900 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium dark:text-slate-50">
                      {h.profissional?.nome}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {h.profissional?.area || "—"}
                    </div>
                  </div>
                  <span
                    className={cx(
                      "rounded-full px-2 py-0.5 text-xs border",
                      h.status === "presente"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800"
                    )}
                  >
                    {h.status}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Data
                    </div>
                    <div className="font-medium dark:text-slate-50">
                      {h.data}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Entrada
                    </div>
                    {editing ? (
                      <input
                        type="time"
                        defaultValue={h.entrada || ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            entrada: e.target.value || null,
                          }))
                        }
                        className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                        disabled={h.status === "falta"}
                      />
                    ) : (
                      <div className="font-medium dark:text-slate-50">
                        {h.entrada || "—"}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Saída
                    </div>
                    {editing ? (
                      <input
                        type="time"
                        defaultValue={h.saida || ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            saida: e.target.value || null,
                          }))
                        }
                        className="mt-0.5 w-full rounded border px-2 py-1 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                        disabled={h.status === "falta"}
                      />
                    ) : (
                      <div className="font-medium dark:text-slate-50">
                        {h.saida || "—"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <div className="text-slate-600 dark:text-slate-300">
                    Horas:{" "}
                    {fmtHours(
                      h.horas_trabalhadas ?? toHours(h.entrada, h.saida)
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editing ? (
                      <>
                        <button
                          onClick={salvarEdicaoHist}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditValues({});
                          }}
                          className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-medium dark:bg-slate-900 dark:text-slate-50 dark:border dark:border-slate-700"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(h.id);
                            setEditValues({});
                          }}
                          className="rounded-lg border px-2 py-1 text-xs dark:border-slate-700 dark:hover:bg-slate-800"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => excluirHist(h.id)}
                          className="rounded-lg border px-2 py-1 text-xs dark:border-slate-700 dark:hover:bg-rose-900/20"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  {h.status === "falta" ? (
                    <>
                      <span className="font-medium">Motivo:</span>{" "}
                      {h.motivo_falta || "—"}
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Observações:</span>{" "}
                      {h.observacoes || "—"}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop: tabela com scroll-x */}
      <div className="hidden md:block overflow-x-auto rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-12 border-b bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:border-slate-700">
            <div className="col-span-3">Profissional</div>
            <div className="col-span-2">Data</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Entrada</div>
            <div className="col-span-2">Saída</div>
            <div className="col-span-1">Horas</div>
            <div className="col-span-1 text-right">Ações</div>
          </div>

          {historicoPaginado.length === 0 ? (
            <div className="px-4 py-6 text-center text-slate-600 dark:text-slate-300">
              Nenhum registro no período.
            </div>
          ) : (
            historicoPaginado.map((h) => {
              const editing = editingId === h.id;
              return (
                <div
                  key={h.id}
                  className="grid grid-cols-12 items-center border-b px-4 py-2 text-sm dark:border-slate-700"
                >
                  <div className="col-span-3">
                    <div className="font-medium text-slate-900 dark:text-slate-50">
                      {h.profissional?.nome}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {h.profissional?.area || "—"}
                    </div>
                  </div>
                  <div className="col-span-2 text-slate-800 dark:text-slate-200">
                    {h.data}
                  </div>
                  <div className="col-span-1">
                    <span
                      className={cx(
                        "rounded-full px-2 py-0.5 text-xs border",
                        h.status === "presente"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800"
                      )}
                    >
                      {h.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {editing ? (
                      <input
                        type="time"
                        defaultValue={h.entrada || ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            entrada: e.target.value || null,
                          }))
                        }
                        className="w-full rounded-lg border px-2 py-1 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                        disabled={h.status === "falta"}
                      />
                    ) : (
                      <span className="text-slate-800 dark:text-slate-200">
                        {h.entrada || "—"}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2">
                    {editing ? (
                      <input
                        type="time"
                        defaultValue={h.saida || ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            saida: e.target.value || null,
                          }))
                        }
                        className="w-full rounded-lg border px-2 py-1 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                        disabled={h.status === "falta"}
                      />
                    ) : (
                      <span className="text-slate-800 dark:text-slate-200">
                        {h.saida || "—"}
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 text-slate-800 dark:text-slate-200">
                    {fmtHours(
                      h.horas_trabalhadas ?? toHours(h.entrada, h.saida)
                    )}
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    {editing ? (
                      <>
                        <button
                          onClick={salvarEdicaoHist}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditValues({});
                          }}
                          className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-50 dark:border dark:border-slate-700"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(h.id);
                            setEditValues({});
                          }}
                          className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => excluirHist(h.id)}
                          className="rounded-lg border px-2 py-1 text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 dark:border-slate-700"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="col-span-12 pb-2 pl-2 pr-2 text-xs text-slate-600 dark:text-slate-300">
                    {h.status === "falta" ? (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Motivo:</span>
                        {editing ? (
                          <input
                            defaultValue={h.motivo_falta || ""}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                motivo_falta: e.target.value || null,
                              }))
                            }
                            className="ml-1 rounded border px-2 py-0.5 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                          />
                        ) : (
                          h.motivo_falta || "—"
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Observações:</span>
                        {editing ? (
                          <input
                            defaultValue={h.observacoes || ""}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                observacoes: e.target.value || null,
                              }))
                            }
                            className="ml-1 w-[50%] min-w-56 rounded border px-2 py-0.5 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                            placeholder="Opcional"
                          />
                        ) : (
                          h.observacoes || "—"
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Paginação histórico */}
      {hist.length > histPageSize && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Mostrando {Math.min(hist.length, histPage * histPageSize)} de{" "}
            {hist.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={histPage === 1}
              onClick={() => setHistPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800 dark:border-slate-700"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <button
              disabled={histPage * histPageSize >= hist.length}
              onClick={() =>
                setHistPage((p) =>
                  p * histPageSize >= hist.length ? p : p + 1
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800 dark:border-slate-700"
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Nota legal */}
      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-[rgba(251,191,36,0.3)] dark:bg-amber-900/10 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <p>
            Registos de presenças são sensíveis. Certifique-se de que os dados
            inseridos refletem a realidade em obra e mantenha justificativas de
            faltas arquivadas.
          </p>
        </div>
      </div>

      {/* Bottom sheet de ações em massa (mobile) */}
      <AnimatePresence>
        {showSheet && (
          <motion.div
            className="fixed inset-0 z-[9999] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t bg-white p-4 dark:bg-slate-900 dark:border-slate-700"
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 mb-3" />
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="h-5 w-5" />
                <div className="font-semibold">Ações em massa</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Entrada padrão
                  </label>
                  <input
                    type="time"
                    value={horaEntradaPadrao}
                    onChange={(e) => setHoraEntradaPadrao(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-base dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Saída padrão
                  </label>
                  <input
                    type="time"
                    value={horaSaidaPadrao}
                    onChange={(e) => setHoraSaidaPadrao(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-base dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
                  />
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setShowSheet(false);
                    marcarTodosPresentes();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                >
                  <ListChecks className="h-4 w-4" />
                  Todos Presente
                </button>
                <button
                  onClick={() => {
                    setShowSheet(false);
                    marcarTodosFalta("Falta injustificada");
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
                >
                  <X className="h-4 w-4" />
                  Todos Falta
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
