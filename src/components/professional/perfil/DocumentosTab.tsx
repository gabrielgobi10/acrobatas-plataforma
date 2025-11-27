// src/components/professional/documentos/MeusDocumentos.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Eye,
  Upload,
  Filter as FilterIcon,
  Search,
  Calendar,
  Clock4,
  Download,
  RefreshCcw,
  ChevronDown,
  SortAsc,
  SortDesc,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/* ======================
   Tipos
====================== */
type Documento = {
  id: string;
  nome: string;
  categoria: string;
  validade?: string | null; // "dd/mm/yyyy"
  status: "Válido" | "Pendente" | "Vencido";
  atualizado_em?: string | null; // "dd/mm/yyyy"
  url?: string | null;
};

type SortKey = "nome" | "categoria" | "validade" | "atualizado_em" | "status";

/* ======================
   Helpers de data
====================== */
function parsePTDate(d?: string | null): Date | null {
  if (!d) return null;
  const [dd, mm, yyyy] = d.split("/").map((v) => parseInt(v, 10));
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd, 12); // 12h evita timezone edge
}

function daysUntil(dateStr?: string | null): number | null {
  const dt = parsePTDate(dateStr);
  if (!dt) return null;
  const today = new Date();
  const ms = dt.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/* ======================
   Badges e cartões
====================== */
function StatusBadge({ status }: { status: Documento["status"] }) {
  const classes =
    status === "Válido"
      ? "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-400"
      : status === "Pendente"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-400"
      : "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-400";

  return (
    <span className={`px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full ${classes}`}>
      {status}
    </span>
  );
}

function ResumoCard({
  titulo,
  valor,
  cor,
  icone,
}: {
  titulo: string;
  valor: number | string;
  cor: string;
  icone: any;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className="rounded-xl p-3 sm:p-4 text-center shadow-sm hover:shadow-md transition bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700"
    >
      <div className={`flex justify-center mb-1 sm:mb-2 ${cor}`}>{icone}</div>
      <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">{titulo}</p>
      <p className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100">{valor}</p>
    </motion.div>
  );
}

function VencimentoBadge({ validade }: { validade?: string | null }) {
  const d = daysUntil(validade);
  if (d === null) return <span className="text-xs text-gray-500">Sem validade</span>;

  const style =
    d < 0
      ? "text-red-600"
      : d <= 15
      ? "text-yellow-600"
      : "text-gray-600 dark:text-gray-300";

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${style}`}>
      <Calendar size={14} />
      {d < 0 ? `Vencido há ${Math.abs(d)}d` : `Vence em ${d}d`}
    </span>
  );
}

/* ======================
   Modais (visuais)
====================== */
function UploadModal({
  open,
  onClose,
  onConfirm,
  docAlvo,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (fakeUrl: string) => void;
  docAlvo?: Documento | null;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/50 grid place-items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 p-5"
      >
        <h3 className="text-lg font-semibold mb-1">Enviar documento</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {docAlvo ? `Atualizar: ${docAlvo.nome}` : "Adicionar novo documento."}
        </p>

        <div className="space-y-3">
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-6 text-center">
            <Upload className="mx-auto mb-2" />
            <p className="text-sm">Arraste o arquivo aqui ou clique para selecionar</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info size={14} />
              PDF, JPG, PNG — até 10 MB
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar size={14} />
              Se tiver validade, atualize depois
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              onConfirm("https://acrobatas.fake/cdn/documento.pdf");
              onClose();
            }}
          >
            Enviar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ViewModal({ open, onClose, doc }: { open: boolean; onClose: () => void; doc: Documento | null }) {
  if (!open || !doc) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/60 grid place-items-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 p-5"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{doc.nome}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <StatusBadge status={doc.status} />
              <span>•</span>
              <span>Categoria: {doc.categoria}</span>
              <span>•</span>
              <VencimentoBadge validade={doc.validade} />
            </div>
          </div>
          <button
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-gray-50 dark:bg-[#101725] p-6 grid place-items-center min-h-[240px]">
          {doc.url ? (
            <div className="text-center space-y-2">
              <FileText className="mx-auto" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Pré-visualização indisponível aqui.</p>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <Download size={16} /> Abrir/baixar
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nenhum arquivo enviado ainda para este documento.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ======================
   Barra de filtros
====================== */
function FiltroBar({
  categorias,
  query,
  setQuery,
  categoria,
  setCategoria,
  status,
  setStatus,
  sortKey,
  setSortKey,
  sortDir,
  setSortDir,
  onReset,
}: {
  categorias: string[];
  query: string;
  setQuery: (s: string) => void;
  categoria: string;
  setCategoria: (s: string) => void;
  status: "Todos" | Documento["status"];
  setStatus: (s: "Todos" | Documento["status"]) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  sortDir: "asc" | "desc";
  setSortDir: (d: "asc" | "desc") => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
      <div className="flex-1 flex items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar documento..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#101725] outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <div className="relative">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#101725]"
            >
              <option value="Todas">Todas categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
          </div>

          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#101725]"
            >
              <option value="Todos">Todos status</option>
              <option value="Válido">Válidos</option>
              <option value="Pendente">Pendentes</option>
              <option value="Vencido">Vencidos</option>
            </select>
            <FilterIcon size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
          </div>

          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#101725]"
            >
              <option value="validade">Ordenar por validade</option>
              <option value="status">Ordenar por status</option>
              <option value="nome">Ordenar por nome</option>
              <option value="categoria">Ordenar por categoria</option>
              <option value="atualizado_em">Ordenar por atualização</option>
            </select>
            {(sortDir === "asc" ? <SortAsc /> : <SortDesc />) && (
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70">
                {sortDir === "asc" ? <SortAsc size={14} /> : <SortDesc size={14} />}
              </div>
            )}
          </div>

          <button
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            className="px-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Inverter ordem"
          >
            {sortDir === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
          </button>

          <button
            onClick={onReset}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Limpar filtros"
          >
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      <div className="flex justify-center sm:justify-end">
        <button
          className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
          id="btn-upload-top"
        >
          <Plus size={18} />
          Adicionar novo documento
        </button>
      </div>
    </div>
  );
}

/* ======================
   Componente principal
====================== */
export default function MeusDocumentos() {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros/estado UI
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [status, setStatus] = useState<"Todos" | Documento["status"]>("Todos");
  const [sortKey, setSortKey] = useState<SortKey>("validade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // modais
  const [openUpload, setOpenUpload] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [docSelecionado, setDocSelecionado] = useState<Documento | null>(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const dados: Documento[] = [
        {
          id: "1",
          nome: "Cartão de Cidadão",
          categoria: "Identificação",
          validade: "12/12/2025",
          status: "Válido",
          atualizado_em: "10/09/2024",
          url: "https://exemplo.com/cc.pdf",
        },
        {
          id: "2",
          nome: "Certidão Contributiva",
          categoria: "Fiscal",
          validade: null,
          status: "Pendente",
          atualizado_em: null,
          url: null,
        },
        {
          id: "3",
          nome: "Seguro de Responsabilidade Civil",
          categoria: "Segurança",
          validade: "22/03/2024",
          status: "Vencido",
          atualizado_em: "10/03/2024",
          url: "https://exemplo.com/seguro.pdf",
        },
        {
          id: "4",
          nome: "Título de Residência",
          categoria: "Imigração",
          validade: "14/01/2026",
          status: "Válido",
          atualizado_em: "02/02/2025",
          url: "https://exemplo.com/titulo.pdf",
        },
      ];
      // simula fetch
      setTimeout(() => {
        setDocumentos(dados);
        setLoading(false);
      }, 250);
    }
    carregar();
  }, [user?.id]);

  const resumo = useMemo(() => {
    const validos = documentos.filter((d) => d.status === "Válido").length;
    const pendentes = documentos.filter((d) => d.status === "Pendente").length;
    const vencidos = documentos.filter((d) => d.status === "Vencido").length;
    const total = documentos.length;
    const completion = total ? Math.round((validos / total) * 100) : 0;
    return { validos, pendentes, vencidos, total, completion };
  }, [documentos]);

  const categorias = useMemo(
    () =>
      Array.from(new Set(documentos.map((d) => d.categoria))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [documentos],
  );

  const filtrados = useMemo(() => {
    let arr = [...documentos];

    // busca
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (d) =>
          d.nome.toLowerCase().includes(q) ||
          d.categoria.toLowerCase().includes(q) ||
          (d.validade || "").includes(q),
      );
    }

    // categoria
    if (categoria !== "Todas") {
      arr = arr.filter((d) => d.categoria === categoria);
    }

    // status
    if (status !== "Todos") {
      arr = arr.filter((d) => d.status === status);
    }

    // ordenação
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "validade" || sortKey === "atualizado_em") {
        const da = parsePTDate(a[sortKey] || "");
        const db = parsePTDate(b[sortKey] || "");
        const va = da ? da.getTime() : (sortDir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        const vb = db ? db.getTime() : (sortDir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        return va > vb ? dir : va < vb ? -dir : 0;
      }
      const va = String(a[sortKey] ?? "").toLowerCase();
      const vb = String(b[sortKey] ?? "").toLowerCase();
      return va > vb ? dir : va < vb ? -dir : 0;
    });

    return arr;
  }, [documentos, query, categoria, status, sortKey, sortDir]);

  const handleResetFiltros = () => {
    setQuery("");
    setCategoria("Todas");
    setStatus("Todos");
    setSortKey("validade");
    setSortDir("asc");
  };

  const abrirUploadNovo = () => {
    setDocSelecionado(null);
    setOpenUpload(true);
  };

  // liga o botão da FiltroBar
  useEffect(() => {
    const btn = document.getElementById("btn-upload-top");
    if (!btn) return;
    const onClick = () => abrirUploadNovo();
    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center mt-20">
        <FileText className="animate-pulse text-blue-500" size={28} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-2">
        <FileText className="text-blue-500 dark:text-blue-400 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Meus Documentos</h1>
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6">
        Organize e acompanhe seus documentos pessoais, fiscais e de segurança.
      </p>

      {/* Cards resumo + progresso */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <ResumoCard
          titulo="Válidos"
          valor={resumo.validos}
          cor="text-green-500"
          icone={<CheckCircle2 size={18} />}
        />
        <ResumoCard
          titulo="Pendentes"
          valor={resumo.pendentes}
          cor="text-yellow-500"
          icone={<AlertTriangle size={18} />}
        />
        <ResumoCard
          titulo="Vencidos"
          valor={resumo.vencidos}
          cor="text-red-500"
          icone={<XCircle size={18} />}
        />
      </div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Completude do perfil de documentos
          </span>
          <span className="text-sm font-medium">{resumo.completion}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${resumo.completion}%` }}
          />
        </div>
      </div>

      {/* Filtros + ação */}
      <FiltroBar
        categorias={categorias}
        query={query}
        setQuery={setQuery}
        categoria={categoria}
        setCategoria={setCategoria}
        status={status}
        setStatus={setStatus}
        sortKey={sortKey}
        setSortKey={setSortKey}
        sortDir={sortDir}
        setSortDir={setSortDir}
        onReset={handleResetFiltros}
      />

      {/* Lista */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-sm sm:text-lg font-medium mb-4 flex items-center gap-2 text-blue-500 dark:text-blue-400">
          <FileText size={18} /> Documentos
        </h2>

        {/* Empty state */}
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nenhum documento encontrado com os filtros atuais.
            </p>
            <button
              onClick={handleResetFiltros}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <RefreshCcw size={16} /> Limpar filtros
            </button>
          </div>
        ) : (
          <>
            {/* MOBILE – Cards */}
            <div className="space-y-3 sm:hidden">
              {filtrados.map((doc) => (
                <motion.div
                  key={doc.id}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 bg-gray-50 dark:bg-[#232c3d]"
                >
                  <div className="flex justify-between items-start gap-3 mb-1">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                        {doc.nome}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {doc.categoria}
                      </p>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-xs">
                    <VencimentoBadge validade={doc.validade} />
                    <span className="text-gray-500 dark:text-gray-400">
                      <Clock4 size={12} className="inline mr-1" />
                      {doc.atualizado_em ? `Atualizado ${doc.atualizado_em}` : "Nunca atualizado"}
                    </span>
                  </div>

                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => {
                        setDocSelecionado(doc);
                        setOpenView(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-blue-600/90 text-white text-xs hover:bg-blue-700 transition"
                    >
                      <Eye size={14} /> Ver
                    </button>
                    <button
                      onClick={() => {
                        setDocSelecionado(doc);
                        setOpenUpload(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-green-600/90 text-white text-xs hover:bg-green-700 transition"
                    >
                      <Upload size={14} /> Enviar
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* DESKTOP – Tabela */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-zinc-300 dark:border-zinc-700">
                    <th className="py-3 px-2">Documento</th>
                    <th className="py-3 px-2">Categoria</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Validade</th>
                    <th className="py-3 px-2">Atualizado</th>
                    <th className="py-3 px-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((doc) => (
                    <motion.tr
                      key={doc.id}
                      whileHover={{ scale: 1.01 }}
                      className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#243043] transition"
                    >
                      <td className="py-3 px-2 font-medium">{doc.nome}</td>
                      <td className="py-3 px-2">{doc.categoria}</td>
                      <td className="py-3 px-2">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span>{doc.validade || "—"}</span>
                          <VencimentoBadge validade={doc.validade} />
                        </div>
                      </td>
                      <td className="py-3 px-2">{doc.atualizado_em || "—"}</td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex justify-center gap-3">
                          <button
                            title="Ver documento"
                            onClick={() => {
                              setDocSelecionado(doc);
                              setOpenView(true);
                            }}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          >
                            <Eye size={18} className="text-blue-500" />
                          </button>
                          <button
                            title="Enviar/atualizar arquivo"
                            onClick={() => {
                              setDocSelecionado(doc);
                              setOpenUpload(true);
                            }}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          >
                            <Upload size={18} className="text-green-500" />
                          </button>
                          {doc.url && (
                            <a
                              title="Baixar"
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            >
                              <Download size={18} className="text-gray-500" />
                            </a>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Rodapé */}
      <div className="mt-8 sm:mt-10 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
        Os documentos enviados são analisados pela equipe da Acrobatas para garantir conformidade legal e de segurança. 🔒
      </div>

      {/* Modais */}
      <UploadModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        docAlvo={docSelecionado}
        onConfirm={(fakeUrl) => {
          // Atualização visual do item (mock)
          setDocumentos((prev) =>
            prev.map((d) =>
              d.id === (docSelecionado?.id ?? "-1")
                ? {
                    ...d,
                    url: fakeUrl,
                    status: "Válido",
                    atualizado_em: new Intl.DateTimeFormat("pt-PT").format(new Date()),
                  }
                : d,
            ),
          );
        }}
      />
      <ViewModal open={openView} onClose={() => setOpenView(false)} doc={docSelecionado} />
    </div>
  );
}
