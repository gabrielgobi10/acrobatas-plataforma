"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  FileText,
  Download,
  Loader2,
  Filter,
  Euro,
  AlertCircle,
  PlusCircle,
  Building2,
  Calendar,
  Search,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* =======================
   Tipos
======================= */

type FaturaStatus = "emitida" | "enviada" | "paga" | "vencida";

type FaturaRow = {
  id: string;
  numero: string;
  data_emissao: string;
  periodo_referencia: string;
  valor_total: number;
  status: FaturaStatus;
  url_pdf: string | null;
  obra_id: string | null;
  empresa_id: string;
  obras?: { nome: string | null } | null;
  empresas?: {
    nome_comercial: string | null;
    nome_legal?: string | null;
    nif?: string | null;
  } | null;
};

type EmpresaResumo = {
  id: string;
  nome: string;
  nif?: string | null;
  totalPeriodo: number;
  qtdFaturas: number;
  qtdVencidas: number;
};

type EmpresaOption = {
  id: string;
  nome: string;
};

type ObraOption = {
  id: string;
  nome: string;
};

type NovaFaturaForm = {
  empresaId: string;
  obraId: string;
  numero: string;
  dataEmissao: string;
  periodoReferencia: string;
  valorTotal: string;
  status: FaturaStatus;
};

const STATUS_FILTER_OPTIONS = [
  { value: "todas", label: "Todos os estados" },
  { value: "emitida", label: "Emitida" },
  { value: "enviada", label: "Enviada" },
  { value: "paga", label: "Paga" },
  { value: "vencida", label: "Vencida" },
];

const STATUS_EDIT_OPTIONS: { value: FaturaStatus; label: string }[] = [
  { value: "emitida", label: "Emitida" },
  { value: "enviada", label: "Enviada" },
  { value: "paga", label: "Paga" },
  { value: "vencida", label: "Vencida" },
];

const MESES = [
  { value: 0, label: "Todos os meses" },
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const fmtNumber = (v: number, d = 2) =>
  Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(isFinite(v) ? v : 0);

const euro = (v: number) => `${fmtNumber(v, 2)} €`;

/* =======================
   Página principal
======================= */

export default function FaturacaoEmpresasAdmin() {
  const now = dayjs();

  const [ano, setAno] = useState(now.year());
  const [mes, setMes] = useState<number>(0);
  const [status, setStatus] = useState<string>("todas");
  const [searchEmpresaLista, setSearchEmpresaLista] = useState("");
  const [searchTabela, setSearchTabela] = useState("");
  const [loading, setLoading] = useState(false);

  const [rowsAll, setRowsAll] = useState<FaturaRow[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(
    null
  );

  const [novaModalOpen, setNovaModalOpen] = useState(false);
  const [savingNova, setSavingNova] = useState(false);
  const [novaFatura, setNovaFatura] = useState<NovaFaturaForm>({
    empresaId: "",
    obraId: "",
    numero: "",
    dataEmissao: now.format("YYYY-MM-DD"),
    periodoReferencia: now.startOf("month").format("YYYY-MM-01"),
    valorTotal: "",
    status: "emitida",
  });
  const [empresasOptions, setEmpresasOptions] = useState<EmpresaOption[]>([]);
  const [obrasOptions, setObrasOptions] = useState<ObraOption[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ====== Carregar faturas (base) ====== */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        let startDate = dayjs(`${ano}-01-01`).startOf("day");
        let endDate = dayjs(`${ano}-12-31`).endOf("day");

        if (mes > 0) {
          startDate = dayjs(`${ano}-${String(mes).padStart(2, "0")}-01`).startOf(
            "day"
          );
          endDate = startDate.endOf("month");
        }

        const { data, error } = await supabase
          .from("faturas_empresas")
          .select(
            `
            id,
            numero,
            data_emissao,
            periodo_referencia,
            valor_total,
            status,
            url_pdf,
            obra_id,
            empresa_id,
            empresas ( nome_comercial, nome_legal, nif ),
            obras ( nome )
          `
          )
          .gte("data_emissao", startDate.format("YYYY-MM-DD"))
          .lte("data_emissao", endDate.format("YYYY-MM-DD"))
          .order("data_emissao", { ascending: false });

        if (error) {
          console.error(error);
          setRowsAll([]);
          setErrorMsg("Não foi possível carregar as faturas.");
        } else if (data) {
          setRowsAll(data as unknown as FaturaRow[]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [ano, mes]);

  /* ====== Filtro por estado (memória) ====== */
  const rowsByStatus = useMemo(() => {
    if (status === "todas") return rowsAll;
    return rowsAll.filter((r) => r.status === status);
  }, [rowsAll, status]);

  /* ====== Grupos por empresa (lista da esquerda) ====== */
  const empresasResumo: EmpresaResumo[] = useMemo(() => {
    const map = new Map<string, EmpresaResumo>();

    for (const r of rowsByStatus) {
      const id = r.empresa_id;
      if (!id) continue;

      const nome =
        r.empresas?.nome_comercial ||
        r.empresas?.nome_legal ||
        "(Sem nome)";
      const nif = r.empresas?.nif || null;

      if (!map.has(id)) {
        map.set(id, {
          id,
          nome,
          nif,
          totalPeriodo: 0,
          qtdFaturas: 0,
          qtdVencidas: 0,
        });
      }

      const item = map.get(id)!;
      item.totalPeriodo += r.valor_total || 0;
      item.qtdFaturas += 1;
      if (r.status === "vencida") {
        item.qtdVencidas += 1;
      }
    }

    let list = Array.from(map.values());

    if (searchEmpresaLista.trim()) {
      const term = searchEmpresaLista.trim().toLowerCase();
      list = list.filter((e) => e.nome.toLowerCase().includes(term));
    }

    list.sort((a, b) => b.totalPeriodo - a.totalPeriodo);

    return list;
  }, [rowsByStatus, searchEmpresaLista]);

  /* ====== Linhas visíveis (empresa + busca na tabela) ====== */
  const visibleRows = useMemo(() => {
    let base = rowsByStatus;

    if (selectedEmpresaId) {
      base = base.filter((r) => r.empresa_id === selectedEmpresaId);
    }

    if (searchTabela.trim()) {
      const term = searchTabela.trim().toLowerCase();
      base = base.filter((r) => {
        const num = r.numero?.toLowerCase?.() || "";
        const obra = r.obras?.nome?.toLowerCase?.() || "";
        return num.includes(term) || obra.includes(term);
      });
    }

    return base;
  }, [rowsByStatus, selectedEmpresaId, searchTabela]);

  const totalPeriodo = useMemo(
    () => visibleRows.reduce((s, r) => s + (r.valor_total || 0), 0),
    [visibleRows]
  );

  const totalCount = visibleRows.length;

  const selectedEmpresaNome = useMemo(() => {
    if (!selectedEmpresaId) return "todas as empresas";
    const found = empresasResumo.find((e) => e.id === selectedEmpresaId);
    return found?.nome || "empresa";
  }, [empresasResumo, selectedEmpresaId]);

  /* ====== Abrir modal nova fatura (carrega empresas/obras) ====== */
  const openNovaFaturaModal = async () => {
    setNovaModalOpen(true);
    setErrorMsg(null);

    try {
      const [{ data: empData }, { data: obrasData }] = await Promise.all([
        supabase
          .from("empresas")
          .select("id, nome_comercial, nome_legal")
          .order("nome_comercial", { ascending: true }),
        supabase
          .from("obras")
          .select("id, nome")
          .order("nome", { ascending: true }),
      ]);

      if (empData) {
        setEmpresasOptions(
          empData.map((e: any) => ({
            id: e.id,
            nome: e.nome_comercial || e.nome_legal || "Sem nome",
          }))
        );
      }

      if (obrasData) {
        setObrasOptions(
          obrasData.map((o: any) => ({
            id: o.id,
            nome: o.nome || "Sem nome",
          }))
        );
      }

      setNovaFatura((prev) => ({
        ...prev,
        empresaId: selectedEmpresaId || "",
      }));
    } catch (err) {
      console.error(err);
    }
  };

  /* ====== Guardar nova fatura ====== */
  const handleSaveNovaFatura = async () => {
    if (!novaFatura.empresaId || !novaFatura.numero || !novaFatura.valorTotal) {
      setErrorMsg("Preencha pelo menos empresa, número e valor.");
      return;
    }

    const valor = Number(
      novaFatura.valorTotal.replace(/\./g, "").replace(",", ".")
    );
    if (!isFinite(valor) || valor <= 0) {
      setErrorMsg("Valor inválido.");
      return;
    }

    setSavingNova(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from("faturas_empresas").insert({
        empresa_id: novaFatura.empresaId,
        obra_id: novaFatura.obraId || null,
        numero: novaFatura.numero,
        data_emissao: novaFatura.dataEmissao,
        periodo_referencia: novaFatura.periodoReferencia,
        valor_total: valor,
        status: novaFatura.status,
        url_pdf: null,
      });

      if (error) {
        console.error(error);
        setErrorMsg("Erro ao guardar fatura.");
      } else {
        setNovaModalOpen(false);
        setNovaFatura({
          empresaId: selectedEmpresaId || "",
          obraId: "",
          numero: "",
          dataEmissao: now.format("YYYY-MM-DD"),
          periodoReferencia: now.startOf("month").format("YYYY-MM-01"),
          valorTotal: "",
          status: "emitida",
        });

        // recarrega dados do período actual
        let startDate = dayjs(`${ano}-01-01`).startOf("day");
        let endDate = dayjs(`${ano}-12-31`).endOf("day");
        if (mes > 0) {
          startDate = dayjs(`${ano}-${String(mes).padStart(2, "0")}-01`).startOf(
            "day"
          );
          endDate = startDate.endOf("month");
        }

        const { data, error: reloadError } = await supabase
          .from("faturas_empresas")
          .select(
            `
            id,
            numero,
            data_emissao,
            periodo_referencia,
            valor_total,
            status,
            url_pdf,
            obra_id,
            empresa_id,
            empresas ( nome_comercial, nome_legal, nif ),
            obras ( nome )
          `
          )
          .gte("data_emissao", startDate.format("YYYY-MM-DD"))
          .lte("data_emissao", endDate.format("YYYY-MM-DD"))
          .order("data_emissao", { ascending: false });

        if (!reloadError && data) {
          setRowsAll(data as unknown as FaturaRow[]);
        }
      }
    } finally {
      setSavingNova(false);
    }
  };

  /* ====== Atualizar estado inline ====== */
  const handleStatusUpdated = (id: string, newStatus: FaturaStatus) => {
    setRowsAll((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  /* =======================
     UI
  ======================= */

  return (
    <div className="p-4 sm:p-6 text-zinc-900 dark:text-zinc-50">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Faturação de Empresas
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gere as faturas emitidas pela Acrobatas para todas as empresas.
          </p>
        </div>

        <button
          onClick={openNovaFaturaModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-white shadow hover:bg-emerald-600"
        >
          <PlusCircle size={16} />
          Nova fatura
        </button>
      </div>

      {/* Layout principal: lista de empresas + painel de faturas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
        {/* COLUNA ESQUERDA — EMPRESAS */}
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Empresas
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Selecione uma empresa para ver o detalhe das faturas.
              </p>
            </div>
          </div>

          <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-300">
            <Search size={14} />
            <input
              type="text"
              placeholder="Buscar empresa…"
              className="w-full bg-transparent text-xs text-zinc-700 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              value={searchEmpresaLista}
              onChange={(e) => setSearchEmpresaLista(e.target.value)}
            />
          </div>

          <button
            className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-xs font-medium ${
              !selectedEmpresaId
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-slate-900"
            }`}
            onClick={() => setSelectedEmpresaId(null)}
          >
            Ver todas as empresas
          </button>

          <div className="mt-1 max-h-[420px] space-y-1 overflow-y-auto pr-1 text-sm">
            {empresasResumo.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Não existem faturas no período selecionado.
              </p>
            ) : (
              empresasResumo.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEmpresaId(e.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                    selectedEmpresaId === e.id
                      ? "bg-zinc-900 text-zinc-50 shadow-sm dark:bg-zinc-50 dark:text-zinc-900"
                      : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Building2
                          size={13}
                          className="text-zinc-500 dark:text-zinc-400"
                        />
                        <span className="truncate text-[11px] font-semibold">
                          {e.nome}
                        </span>
                      </div>
                      {e.nif && (
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          NIF {e.nif}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">
                        {euro(e.totalPeriodo)}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {e.qtdFaturas} faturas
                        {e.qtdVencidas > 0 && (
                          <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 dark:bg-rose-900/60 dark:text-rose-200">
                            {e.qtdVencidas} vencidas
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* COLUNA DIREITA — PAINEL DE FATURAS */}
        <div className="space-y-3">
          {/* Filtros + resumo */}
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex flex-wrap items-center gap-2">
              <Filter
                size={16}
                className="text-zinc-500 dark:text-zinc-400"
              />

              {/* Ano */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900">
                <Calendar
                  size={13}
                  className="text-zinc-500 dark:text-zinc-400"
                />
                <select
                  className="bg-transparent text-xs text-zinc-800 outline-none dark:text-zinc-100"
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                >
                  {[ano - 1, ano, ano + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mês */}
              <select
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              {/* Estado */}
              <select
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_FILTER_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              {/* Busca na tabela */}
              <div className="ml-auto flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-300">
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Procurar nº fatura / obra…"
                  className="w-40 bg-transparent text-xs text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  value={searchTabela}
                  onChange={(e) => setSearchTabela(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                A ver faturas de{" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                  {selectedEmpresaNome}
                </span>
              </span>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-slate-900 dark:text-zinc-300">
                  <Euro size={14} />
                  Total no período:
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {euro(totalPeriodo)}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-slate-900 dark:text-zinc-300">
                  <FileText size={14} />
                  Faturas:
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {totalCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de faturas */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Faturas emitidas
              </h2>
            </div>

            {errorMsg && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-600/60 dark:bg-rose-950/50 dark:text-rose-100">
                <AlertCircle size={14} />
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-10 text-zinc-500 dark:text-zinc-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                A carregar faturas…
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                <FileText className="h-6 w-6" />
                <span>Não existem faturas para os filtros selecionados.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-[13px] text-zinc-600 dark:border-slate-800 dark:bg-slate-900 dark:text-zinc-300">
                      <th className="px-3 py-2">Nº fatura</th>
                      <th className="px-3 py-2">Empresa</th>
                      <th className="px-3 py-2">Data emissão</th>
                      <th className="px-3 py-2">Período</th>
                      <th className="px-3 py-2">Obra</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => {
                      const data = dayjs(r.data_emissao).format("DD/MM/YYYY");
                      const periodo = dayjs(r.periodo_referencia).format(
                        "MMMM [de] YYYY"
                      );
                      const obraNome = r.obras?.nome || "Várias / Geral";
                      const nomeEmpresa =
                        r.empresas?.nome_comercial ||
                        r.empresas?.nome_legal ||
                        "(Sem nome)";

                      return (
                        <tr
                          key={r.id}
                          className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-slate-800 dark:hover:bg-slate-900"
                        >
                          <td className="px-3 py-2">{r.numero}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Building2
                                size={14}
                                className="text-zinc-500 dark:text-zinc-400"
                              />
                              <span className="truncate text-[13px]">
                                {nomeEmpresa}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2">{data}</td>
                          <td className="px-3 py-2 capitalize">{periodo}</td>
                          <td className="px-3 py-2">{obraNome}</td>
                          <td className="px-3 py-2">{euro(r.valor_total)}</td>
                          <td className="px-3 py-2">
                            <StatusInlineEditor
                              id={r.id}
                              value={r.status}
                              onUpdated={handleStatusUpdated}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            {r.url_pdf ? (
                              <button
                                onClick={() =>
                                  window.open(r.url_pdf!, "_blank")
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
                              >
                                <Download size={14} />
                                Descarregar
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                                <AlertCircle size={14} />
                                Sem ficheiro
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {novaModalOpen && (
        <NovaFaturaModal
          onClose={() => {
            setNovaModalOpen(false);
            setErrorMsg(null);
          }}
          saving={savingNova}
          form={novaFatura}
          setForm={setNovaFatura}
          empresas={empresasOptions}
          obras={obrasOptions}
          onSave={handleSaveNovaFatura}
          errorMsg={errorMsg}
        />
      )}
    </div>
  );
}

/* =======================
   Editor inline de status
======================= */

function StatusInlineEditor({
  id,
  value,
  onUpdated,
}: {
  id: string;
  value: FaturaStatus;
  onUpdated: (id: string, newStatus: FaturaStatus) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<FaturaStatus>(value);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as FaturaStatus;
    setCurrent(newStatus);
    setSaving(true);

    const { error } = await supabase
      .from("faturas_empresas")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      onUpdated(id, newStatus);
    } else {
      // se der erro volta para o valor anterior
      setCurrent(value);
    }

    setSaving(false);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
        value={current}
        onChange={handleChange}
      >
        {STATUS_EDIT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {saving && (
        <Loader2 className="h-3 w-3 animate-spin text-zinc-400 dark:text-zinc-500" />
      )}
    </div>
  );
}

/* =======================
   Modal Nova Fatura
======================= */

function NovaFaturaModal({
  onClose,
  saving,
  form,
  setForm,
  empresas,
  obras,
  onSave,
  errorMsg,
}: {
  onClose: () => void;
  saving: boolean;
  form: NovaFaturaForm;
  setForm: (f: NovaFaturaForm) => void;
  empresas: EmpresaOption[];
  obras: ObraOption[];
  onSave: () => void;
  errorMsg: string | null;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Nova fatura
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-slate-900"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {errorMsg && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-600/60 dark:bg-rose-950/50 dark:text-rose-100">
              <AlertCircle size={14} />
              {errorMsg}
            </div>
          )}

          {/* Empresa */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
              Empresa
            </label>
            <select
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
              value={form.empresaId}
              onChange={(e) =>
                setForm({ ...form, empresaId: e.target.value || "" })
              }
            >
              <option value="">Selecione uma empresa…</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Obra */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
              Obra (opcional)
            </label>
            <select
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
              value={form.obraId}
              onChange={(e) =>
                setForm({ ...form, obraId: e.target.value || "" })
              }
            >
              <option value="">Sem obra específica</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Nº + valor */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                Nº da fatura
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
                value={form.numero}
                onChange={(e) =>
                  setForm({ ...form, numero: e.target.value.slice(0, 50) })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                Valor total (€)
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
                placeholder="0,00"
                value={form.valorTotal}
                onChange={(e) =>
                  setForm({ ...form, valorTotal: e.target.value })
                }
              />
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                Data de emissão
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
                value={form.dataEmissao}
                onChange={(e) =>
                  setForm({ ...form, dataEmissao: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                Período de referência
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
                value={form.periodoReferencia}
                onChange={(e) =>
                  setForm({ ...form, periodoReferencia: e.target.value })
                }
              />
            </div>
          </div>

          {/* Estado */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
              Estado
            </label>
            <select
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as FaturaStatus,
                })
              }
            >
              {STATUS_EDIT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            disabled={saving}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Guardar fatura
          </button>
        </div>
      </div>
    </div>
  );
}
