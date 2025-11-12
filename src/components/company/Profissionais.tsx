// src/components/company/Profissionais.tsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  RefreshCcw,
  PlusCircle,
  Search,
  Filter,
  MapPin,
  Star,
  ClipboardList,
  Building2,
  Eye,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

/* ======================
   Tipos
====================== */
type PerfilUI = {
  id: string;
  nome: string | null;
  funcao: string | null;
  cidade: string | null;
  telefone: string | null;
  anos_experiencia: number | null;
  avaliacao: number | null;
  disponibilidade: boolean | null;
  foto_url?: string | null; // <- importante para avatar
};

type Vinculo = {
  id: string;
  profissional_id: string;
  obra_id: string | null;
  status: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

type Obra = { id: string; nome: string | null };

type Row = {
  id: string;
  nome: string;
  funcao: string;
  obra: string;
  cidade: string;
  experiencia: string;
  telefone: string;
  status: "Disponível" | "Em obra";
  avaliacao: number;
  foto_url?: string | null;
};

/* ======================
   Modal Adicionar à Obra
====================== */
function ModalAdicionarObra({
  open,
  onClose,
  profissional,
  onVincularOK,
}: {
  open: boolean;
  onClose: () => void;
  profissional: Row | null;
  onVincularOK: (obraId: string, obraNome: string) => void;
}) {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(false);
  const [obraId, setObraId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome")
        .order("nome", { ascending: true });
      if (!error && Array.isArray(data)) setObras(data as Obra[]);
      setLoading(false);
    })();
  }, [open]);

  async function handleConfirm() {
    if (!profissional || !obraId) return;
    const obraNome = obras.find((o) => o.id === obraId)?.nome ?? "—";
    const payload: any = {
      profissional_id: profissional.id,
      obra_id: obraId,
      status: "Ativo",
      data_inicio: new Date().toISOString().slice(0, 10),
    };
    const { error } = await supabase.from("profissionais_obras").insert(payload);
    if (!error) {
      onVincularOK(obraId, obraNome);
      onClose();
    } else {
      alert(`Falha ao vincular: ${error.message}`);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Adicionar à Obra
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Selecione a obra para vincular <b>{profissional?.nome}</b>.
          </p>
        </div>

        <div className="p-4 space-y-3">
          <label className="text-sm text-gray-700 dark:text-gray-200 block">
            Obra
          </label>
          <select
            className="w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none"
            disabled={loading}
            value={obraId}
            onChange={(e) => setObraId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome ?? o.id}
              </option>
            ))}
          </select>
        </div>

        <div className="p-4 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!obraId}
            className="px-4 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            Vincular
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================
   Helpers
====================== */
function avatarUrl(nome: string, foto_url?: string | null) {
  if (foto_url && /^https?:\/\//i.test(foto_url)) return foto_url;
  const initials = encodeURIComponent((nome || "U").trim());
  return `https://ui-avatars.com/api/?name=${initials}&background=0D8ABC&color=fff&size=128&bold=true`;
}

/* ======================
   Componente principal
====================== */
export default function Profissionais() {
  const { t } = useTranslation();
  const nav = useNavigate();

  const tt = (keys: string[] | string, fallback: string) => {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      const v = t(k);
      if (typeof v === "string" && v !== k) return v;
    }
    return fallback;
  };

  const [aba, setAba] = useState<"equipa" | "base">("equipa");
  const [busca, setBusca] = useState("");
  const [filtroFuncao, setFiltroFuncao] = useState("todas");
  const [filtroCidade, setFiltroCidade] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [rows, setRows] = useState<Row[]>([]);
  const [ativosEmObra, setAtivosEmObra] = useState(0);
  const [disponiveis, setDisponiveis] = useState(0);
  const [contratadosSemana, setContratadosSemana] = useState(0);
  const [avaliacaoMedia, setAvaliacaoMedia] = useState<number>(0);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProf, setModalProf] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        // 1) Perfis via VIEW (inclui foto_url se existir)
        const { data: perfis, error: ePerfis } = await supabase
          .from("profissionais_perfil_ui")
          .select(
            "id, nome, funcao, cidade, telefone, anos_experiencia, avaliacao, disponibilidade, foto_url"
          );
        if (ePerfis) throw new Error(`profissionais_perfil_ui: ${ePerfis.message}`);

        // 2) Vínculos ativos
        const { data: vincs, error: eV } = await supabase
          .from("profissionais_obras")
          .select("id, profissional_id, obra_id, status, criado_em, atualizado_em")
          .eq("status", "Ativo");
        if (eV) throw new Error(`profissionais_obras: ${eV.message}`);

        const vinculos: Vinculo[] = Array.isArray(vincs) ? vincs : [];
        const obraIds = Array.from(
          new Set(vinculos.map((v) => v.obra_id).filter(Boolean))
        ) as string[];

        // 3) Nomes das obras
        const obrasById = new Map<string, string>();
        if (obraIds.length > 0) {
          const { data: obras, error: eObras } = await supabase
            .from("obras")
            .select("id, nome")
            .in("id", obraIds);
          if (eObras) throw new Error(`obras: ${eObras.message}`);
          (obras as Obra[] ?? []).forEach(
            (o) => o?.id && obrasById.set(o.id, o?.nome ?? "—")
          );
        }

        // mapa profissional -> obra atual
        const obraAtual = new Map<string, string>();
        vinculos.forEach((v) => {
          if (v.profissional_id) {
            const nomeObra = v.obra_id ? obrasById.get(v.obra_id!) ?? "—" : "—";
            obraAtual.set(v.profissional_id, nomeObra);
          }
        });

        const _rows: Row[] = (perfis as PerfilUI[] ?? []).map((p) => {
          const obra = obraAtual.get(p.id) ?? "—";
          const emObra = obraAtual.has(p.id);
          return {
            id: p.id,
            nome: p.nome ?? "—",
            funcao: p.funcao ?? "—",
            cidade: p.cidade ?? "—",
            obra,
            avaliacao: Number(p.avaliacao ?? 0),
            status: emObra ? "Em obra" : "Disponível",
            experiencia:
              p.anos_experiencia != null ? `${p.anos_experiencia} anos` : "—",
            telefone: p.telefone ?? "—",
            foto_url: p.foto_url ?? null,
          };
        });

        setRows(_rows);

        // KPIs
        setAtivosEmObra(_rows.filter((c) => c.status === "Em obra").length);
        setDisponiveis(_rows.filter((c) => c.status === "Disponível").length);

        const media = _rows.length
          ? _rows.reduce((acc, c) => acc + (c.avaliacao || 0), 0) / _rows.length
          : 0;
        setAvaliacaoMedia(Number(media.toFixed(1)));

        // Contratados na semana
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        const contratosSemana = (vinculos ?? []).filter((v) => {
          const d = v.criado_em ?? v.atualizado_em;
          return d ? new Date(d) >= seteDiasAtras : false;
        });
        setContratadosSemana(contratosSemana.length);
      } catch (e: any) {
        console.error("ERRO SUPABASE (Profissionais):", e);
        setErro(e?.message ?? "Falha ao carregar dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // filtros
  const filtrados = useMemo(() => {
    const s = busca.trim().toLowerCase();
    return rows.filter((p) => {
      const buscaOk =
        !s ||
        p.nome.toLowerCase().includes(s) ||
        p.funcao.toLowerCase().includes(s) ||
        p.obra.toLowerCase().includes(s);
      const funcaoOk = filtroFuncao === "todas" || p.funcao === filtroFuncao;
      const cidadeOk = filtroCidade === "todas" || p.cidade === filtroCidade;
      const statusOk = filtroStatus === "todos" || p.status === filtroStatus;
      return buscaOk && funcaoOk && cidadeOk && statusOk;
    });
  }, [rows, busca, filtroFuncao, filtroCidade, filtroStatus]);

  const funcoes = useMemo(
    () => ["todas", ...Array.from(new Set(rows.map((p) => p.funcao))).filter(Boolean)],
    [rows]
  );
  const cidades = useMemo(
    () => ["todas", ...Array.from(new Set(rows.map((p) => p.cidade))).filter(Boolean)],
    [rows]
  );
  const status = ["todos", "Disponível", "Em obra"] as const;

  // callback ao vincular no modal: atualiza a UI
  function handleVincularOK(profId: string, _obraId: string, obraNome: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === profId ? { ...r, obra: obraNome, status: "Em obra" } : r
      )
    );
    setAtivosEmObra((n) => n + 1);
    setDisponiveis((n) => Math.max(0, n - 1));
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-8 sm:space-y-10">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-violet-600 to-blue-500 text-white p-5 sm:p-8 rounded-2xl shadow-[0_10px_30px_-10px_rgba(59,130,246,0.5)]"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Users className="sm:w-6 sm:h-6" />{" "}
              {tt("empresaProfissionais.titulo", "Gestão de Profissionais")}
            </h1>
            <p className="text-sm/5 opacity-90 mt-1">
              {tt(
                "empresaProfissionais.subtitulo",
                "Monitore equipes e filtre por especialidade, cidade ou disponibilidade."
              )}
            </p>
          </div>

          <div className="flex gap-3 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 transition-all px-4 py-2 rounded-lg w-full sm:w-auto text-sm"
            >
              <RefreshCcw size={16} />{" "}
              {tt("empresaProfissionais.sincronizar", "Sincronizar")}
            </button>
            <button className="flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700 transition-all px-4 py-2 rounded-lg w-full sm:w-auto text-sm">
              <PlusCircle size={18} />{" "}
              {tt("empresaProfissionais.novo", "Novo Profissional")}
            </button>
          </div>
        </div>
      </motion.div>

      {/* INDICADORES */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            titulo: tt("empresaProfissionais.indicadores.ativos", "Ativos em Obras"),
            valor: loading ? "—" : ativosEmObra,
            icon: ClipboardList,
            bg: "from-blue-500 to-indigo-600",
          },
          {
            titulo: tt("empresaProfissionais.indicadores.disponiveis", "Disponíveis"),
            valor: loading ? "—" : disponiveis,
            icon: Filter,
            bg: "from-emerald-500 to-green-600",
          },
          {
            titulo: tt(
              "empresaProfissionais.indicadores.contratados",
              "Contratados esta Semana"
            ),
            valor: loading ? "—" : contratadosSemana,
            icon: PlusCircle,
            bg: "from-violet-500 to-fuchsia-600",
          },
          {
            titulo: tt(
              "empresaProfissionais.indicadores.avaliacaoMedia",
              "Avaliação Média"
            ),
            valor: loading ? "—" : `${avaliacaoMedia} ⭐`,
            icon: Star,
            bg: "from-amber-400 to-orange-500",
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            className={`p-4 sm:p-6 rounded-xl shadow-md bg-gradient-to-br ${card.bg} text-white`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm/5 opacity-95">{card.titulo}</p>
                <h2 className="text-lg sm:text-2xl font-bold mt-1">{card.valor}</h2>
              </div>
              <card.icon className="sm:w-7 sm:h-7 opacity-90" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ABAS */}
      <div className="flex gap-3 sm:gap-4 flex-wrap">
        {[
          { id: "equipa", label: tt("empresaProfissionais.abas.equipa", "Equipe") },
          { id: "base", label: tt("empresaProfissionais.abas.base", "Base Acrobatas") },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id as "equipa" | "base")}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-medium text-sm sm:text-base transition-all ${
              aba === tab.id
                ? "bg-blue-600 text-white shadow-[0_8px_20px_-8px_rgba(59,130,246,0.6)]"
                : "bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      <AnimatePresence mode="wait">
        {/* === EQUIPE (DESKTOP: tabela | MOBILE: cards) === */}
        {aba === "equipa" && (
          <motion.div
            key="equipa"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl p-0"
          >
            <div className="px-4 sm:px-6 pt-4 sm:pt-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <ClipboardList className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                {tt("empresaProfissionais.equipaTitulo", "Equipe Atual")}
              </h2>

              {erro && (
                <div className="mb-4 text-sm text-red-500">
                  {tt("erros.comum", "Não foi possível carregar os dados.")}
                </div>
              )}

              {/* FILTROS */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-4">
                {[
                  { icon: Filter, value: filtroFuncao, set: setFiltroFuncao, options: funcoes },
                  { icon: MapPin, value: filtroCidade, set: setFiltroCidade, options: cidades },
                  { icon: null, value: filtroStatus, set: setFiltroStatus, options: status as unknown as string[] },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center w-full sm:w-auto bg-gray-100 dark:bg-slate-800 px-2 sm:px-3 py-1.5 rounded-md border border-gray-200 dark:border-slate-700"
                  >
                    {f.icon && <f.icon size={14} className="text-gray-500 mr-2" />}
                    <select
                      onChange={(e) => f.set(e.target.value)}
                      value={f.value}
                      className="bg-transparent outline-none text-xs sm:text-sm text-gray-700 dark:text-gray-200 w-full"
                    >
                      {f.options.map((opt: any, j: number) => (
                        <option key={j} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <div className="flex items-center w-full bg-gray-100 dark:bg-slate-800 px-2 sm:px-3 py-1.5 rounded-md border border-gray-200 dark:border-slate-700">
                  <Search size={14} className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    placeholder={tt(
                      "empresaProfissionais.filtros.pesquisar",
                      "Pesquisar por nome, função ou obra..."
                    )}
                    className="outline-none text-xs sm:text-sm w-full bg-transparent text-gray-700 dark:text-gray-200"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="overflow-x-auto hidden md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/70 text-gray-600 dark:text-gray-300">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Função</th>
                    <th className="px-4 py-3 font-semibold">Obra</th>
                    <th className="px-4 py-3 font-semibold">Local</th>
                    <th className="px-4 py-3 font-semibold">Experiência</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Telefone</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {(loading ? Array.from({ length: 6 }) : filtrados).map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/60 transition">
                      {loading ? (
                        <td colSpan={8} className="px-4 py-4">
                          <div className="h-4 w-3/4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-3">
                              <img
                                src={avatarUrl(r.nome, r.foto_url)}
                                alt={r.nome}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <span>{r.nome}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.funcao}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.obra}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.cidade}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.experiencia}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 hidden md:table-cell">
                            {r.telefone}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs text-white ${
                                r.status === "Em obra" ? "bg-emerald-600" : "bg-blue-600"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-3">
                              <button
                                onClick={() => nav(`/empresa/profissionais/perfil/${r.id}`)}
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                title="Ver detalhes"
                              >
                                <Eye size={16} /> Ver Detalhes
                              </button>
                              {r.status !== "Em obra" && (
                                <button
                                  onClick={() => {
                                    setModalProf(r);
                                    setModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                                  title="Adicionar à Obra"
                                >
                                  + Obra
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="md:hidden px-4 pb-4 space-y-3">
              {(loading ? Array.from({ length: 4 }) : filtrados).map((r: any, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
                >
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-4 w-2/3 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
                      <div className="h-3 w-1/2 bg-gray-200 dark:bg-slate-700 rounded" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarUrl(r.nome, r.foto_url)}
                          alt={r.nome}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{r.nome}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] text-white ${
                                r.status === "Em obra" ? "bg-emerald-600" : "bg-blue-600"
                              }`}
                            >
                              {r.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{r.funcao}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-gray-600 dark:text-gray-300">
                        <div><span className="opacity-60">Obra:</span> {r.obra}</div>
                        <div><span className="opacity-60">Local:</span> {r.cidade}</div>
                        <div><span className="opacity-60">Exp.:</span> {r.experiencia}</div>
                        <div><span className="opacity-60">Telefone:</span> {r.telefone}</div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <button
                          onClick={() => nav(`/empresa/profissionais/perfil/${r.id}`)}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium"
                        >
                          <Eye size={16} /> Ver Detalhes
                        </button>
                        {r.status !== "Em obra" && (
                          <button
                            onClick={() => {
                              setModalProf(r);
                              setModalOpen(true);
                            }}
                            className="text-emerald-600 dark:text-emerald-400 font-medium"
                          >
                            + Obra
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {!loading && filtrados.length === 0 && (
                <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhum profissional encontrado com os filtros atuais.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* === BASE (CARDS) === */}
        {aba === "base" && (
          <motion.div
            key="base"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl p-4 sm:p-6"
          >
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6 flex items-center gap-2">
              <Building2 className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
              {tt("empresaProfissionais.baseTitulo", "Base Acrobatas Workforce")}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
              {tt(
                "empresaProfissionais.descricaoBase",
                "Explore a base completa de profissionais cadastrados na Acrobatas."
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {(loading ? Array.from({ length: 6 }) : rows).map((p: Row, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 sm:p-5 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm bg-white dark:bg-slate-900 hover:shadow-lg transition-all"
                >
                  {loading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarUrl(p.nome, p.foto_url)}
                          alt={p.nome}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-base sm:text-lg text-gray-800 dark:text-gray-100">
                              {p.nome}
                            </h3>
                            <span
                              className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs text-white rounded-full ${
                                p.status === "Em obra" ? "bg-emerald-500" : "bg-blue-500"
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {p.funcao}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2">
                        📍 {p.cidade}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        ⭐ {p.avaliacao}
                      </p>

                      <div className="mt-3 flex justify-between items-center">
                        <button
                          onClick={() => nav(`/empresa/profissionais/perfil/${p.id}`)}
                          className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium hover:underline"
                        >
                          Ver Perfil
                        </button>
                        {p.status !== "Em obra" && (
                          <button
                            onClick={() => {
                              setModalProf(p);
                              setModalOpen(true);
                            }}
                            className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-medium hover:underline"
                          >
                            Adicionar à Obra
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL */}
      <ModalAdicionarObra
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        profissional={modalProf}
        onVincularOK={(obraId, obraNome) => {
          if (modalProf) handleVincularOK(modalProf.id, obraId, obraNome);
        }}
      />
    </div>
  );
}
