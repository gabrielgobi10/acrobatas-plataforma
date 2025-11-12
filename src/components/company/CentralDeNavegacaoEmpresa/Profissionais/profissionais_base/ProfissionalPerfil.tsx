import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  HelpCircle, 
  Clock,
  FolderOpen,
  Info,
  Loader2,
  MapPin,
  Medal,
  MessageSquare,
  Star,
  Target,
  Trophy,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { classBadge, statusLabel, formatMoney } from "./utils";


type Profissional = {
  id: string;
  nome: string;
  funcao: string;
  cidade: string | null;
  distrito?: string | null;
  rating_media?: number | null;
  status?: "disponivel" | "em_obra" | "indisponivel";
  habilidades?: string[] | null;
  experiencia_anos?: number | null;
  valor_ref_hora?: number | null;
  foto_url?: string | null;
  bio?: string | null; // texto escrito pelo profissional
  obras_concluidas?: number | null; // se existir na view
  created_at?: string | null;
  updated_at?: string | null;
};

type ObraItem = {
  id: string;
  nome: string;
  empresa?: string | null; // se sua tabela tiver
  cidade?: string | null;
  funcao?: string | null; // armazenada na pivot
  data_inicio?: string | null;
  data_fim?: string | null;
  status?: string | null;
  avaliacao?: number | null; // se existir em uma view de feedback
};

type Feedback = {
  id: string;
  rating: number | null;
  comentario: string | null;
  empresa: string | null;
  created_at: string | null;
};

export default function ProfissionalPerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [p, setP] = useState<Profissional | null>(null);
  const [obras, setObras] = useState<ObraItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalAdd, setModalAdd] = useState(false);
  const [obrasEmpresa, setObrasEmpresa] = useState<{ id: string; nome: string; cidade?: string | null }[]>([]);
  const [obraSel, setObraSel] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [valorHora, setValorHora] = useState("");
  const [inserindo, setInserindo] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);

        // 1) profissional principal (vista consolidada)
        const { data: prof, error: e1 } = await supabase
          .from("profissionais_view")
          .select(
            "id, nome, funcao, cidade, distrito, rating_media, status, habilidades, experiencia_anos, valor_ref_hora, foto_url, bio, obras_concluidas, created_at, updated_at"
          )
          .eq("id", id)
          .single();

        if (!active) return;
        if (e1) throw e1;
        setP(prof as unknown as Profissional);

        // 2) histórico (pivot + obras) — tudo opcional/defensivo
        // tente primeiro uma view; se não houver, recupere da pivot e junte parcialmente
        let fetchedObras: ObraItem[] = [];

        const { data: hv, error: hvErr } = await supabase
          .from("historico_profissional_view")
          .select("id, nome, empresa, cidade, funcao, data_inicio, data_fim, status, avaliacao")
          .eq("profissional_id", id)
          .order("data_inicio", { ascending: false })
          .limit(6);

        if (!hvErr && hv && hv.length) {
          fetchedObras = hv as unknown as ObraItem[];
        } else {
          // fallback manual simples
          const { data: piv, error: pivErr } = await supabase
            .from("profissionais_obras")
            .select("obra_id, funcao, data_inicio, data_fim, status")
            .eq("profissional_id", id)
            .order("data_inicio", { ascending: false })
            .limit(6);

          if (!pivErr && piv?.length) {
            const obraIds = piv.map((r) => r.obra_id);
            const { data: obrasBase } = await supabase
              .from("obras")
              .select("id, nome, cidade, status")
              .in("id", obraIds);

            fetchedObras =
              piv.map((row) => {
                const ob = obrasBase?.find((o) => o.id === row.obra_id);
                return {
                  id: row.obra_id,
                  nome: ob?.nome ?? "Obra",
                  cidade: ob?.cidade ?? null,
                  status: row.status ?? ob?.status ?? null,
                  funcao: row.funcao ?? null,
                  data_inicio: row.data_inicio ?? null,
                  data_fim: row.data_fim ?? null,
                  avaliacao: null,
                  empresa: null,
                } as ObraItem;
              }) ?? [];
          }
        }
        if (active) setObras(fetchedObras);

        // 3) feedbacks (se existir)
        const { data: fb } = await supabase
          .from("feedbacks_profissionais")
          .select("id, rating, comentario, empresa, created_at")
          .eq("profissional_id", id)
          .order("created_at", { ascending: false })
          .limit(6);
        if (active) setFeedbacks((fb as Feedback[]) || []);

        // 4) obras da empresa logada (para adicionar à obra)
        const { data: obrasEmp } = await supabase
          .from("obras")
          .select("id, nome, cidade, status")
          .order("created_at", { ascending: false })
          .limit(50);
        if (active) setObrasEmpresa(((obrasEmp || []) as any).map((o: any) => ({ id: o.id, nome: o.nome, cidade: o.cidade })));
      } catch (e) {
        // silencioso, UI tem fallbacks
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const stats = useMemo(
    () => [
      {
        label: "Avaliação média",
        value: p?.rating_media ? `${p.rating_media.toFixed(1)} / 5` : "—",
        icon: Star,
      },
      {
        label: "Experiência",
        value: p?.experiencia_anos ? `${p.experiencia_anos} anos` : "—",
        icon: Trophy,
      },
      {
        label: "Valor hora",
        value: formatMoney(p?.valor_ref_hora ?? undefined),
        icon: Medal,
      },
      {
        label: "Obras concluídas",
        value: (p?.obras_concluidas ?? p?.obras.filter((o) => o.status?.includes("conclu")).length) || 0,
        icon: FolderOpen,
      },
    ],
    [p, obras]
  );

  const openAddModal = () => {
    if (!p) return;
    setObraSel("");
    setDataInicio("");
    setValorHora(p.valor_ref_hora ? String(p.valor_ref_hora) : "");
    setModalAdd(true);
  };

  const confirmarAdicionar = async () => {
    if (!p?.id || !obraSel) return;
    setInserindo(true);
    try {
      const valor = valorHora ? Number(valorHora.replace(",", ".")) : null;
      const payload = {
        profissional_id: p.id,
        obra_id: obraSel,
        funcao: p.funcao,
        status: "alocado" as const,
        data_inicio: dataInicio || null,
        tipo_profissional: "externo",
        valor_hora: valor,
      };
      const { error } = await supabase.from("profissionais_obras").insert(payload);
      if (error) throw error;
      setModalAdd(false);
    } catch {
      // notificar se quiser
    } finally {
      setInserindo(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Topbar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="text-sm text-zinc-500">ID: {id?.slice(0, 8)}…</div>
      </div>

      {/* Cabeçalho */}
      <div className="rounded-2xl border border-zinc-200 bg-white bg-gray-100 p-5 shadow-sm">
        {loading ? (
          <HeaderSkeleton />
        ) : p ? (
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full ring-1 ring-zinc-200">
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-xl font-semibold text-zinc-500">
                    {p.nome?.[0]?.toUpperCase() ?? "P"}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold">{p.nome}</h1>
                  {Number(p.experiencia_anos) >= 5 && <BadgeCheck className="h-5 w-5 text-emerald-600" />}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">{p.funcao}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${classBadge(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {p.cidade ?? "—"} {p.distrito ? `— ${p.distrito}` : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Nenhum contato direto — apenas ações internas */}
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                <PlusIcon /> Adicionar à obra
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                title="Solicitar informações internas"
              >
                <MessageSquare className="h-4 w-4" />
                Solicitar detalhes
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Info className="h-4 w-4" /> Profissional não encontrado.
          </div>
        )}
      </div>

      {/* Resumo de indicadores */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-zinc-200 bg-white bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-zinc-100 p-2">
                <s.icon className="h-4 w-4 text-zinc-600" />
              </div>
              <div>
                <div className="text-sm text-zinc-500">{s.label}</div>
                <div className="text-base font-semibold">{s.value}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Conteúdo em 2 colunas */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Competências */}
          <section className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Competências & especializações</h3>
              <span className="text-xs text-zinc-500">Principais áreas de atuação</span>
            </div>
            {loading ? (
              <BadgeSkeleton />
            ) : p?.habilidades?.length ? (
              <div className="flex flex-wrap gap-2">
                {p.habilidades.slice(0, 12).map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                  >
                    {h}
                  </span>
                ))}
                {p.habilidades.length > 12 && (
                  <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs text-zinc-500">
                    +{p.habilidades.length - 12}
                  </span>
                )}
              </div>
            ) : (
              <EmptyLine text="Sem competências listadas." />
            )}
          </section>

          {/* Bio / Apresentação */}
          <section className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Apresentação</h3>
              <span className="text-xs text-zinc-500">Texto escrito pelo profissional</span>
            </div>
            {loading ? (
              <ParagraphSkeleton lines={3} />
            ) : p?.bio ? (
              <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-line">{p.bio}</p>
            ) : (
              <EmptyLine text="O profissional ainda não adicionou uma apresentação." />
            )}
          </section>

          {/* Histórico de obras */}
          <section className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Histórico recente de obras</h3>
              <span className="text-xs text-zinc-500">Até 6 registros</span>
            </div>
            {loading ? (
              <ListSkeleton items={3} />
            ) : obras.length ? (
              <div className="grid gap-3">
                {obras.map((o) => (
                  <div
                    key={o.id + (o.data_inicio ?? "")}
                    className="flex items-start justify-between rounded-xl border border-zinc-200 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-semibold">{o.nome}</h4>
                        {o.avaliacao ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                            <Star className="h-3 w-3" /> {o.avaliacao.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {o.empresa ?? "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          {o.funcao ?? p?.funcao ?? "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {o.cidade ?? "—"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-zinc-600">
                      <div className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {fmtDateRange(o.data_inicio, o.data_fim)}
                      </div>
                      <div className="mt-1">{o.status ?? "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyLine text="Sem histórico de obras disponível." />
            )}
          </section>

          {/* Avaliações */}
          <section className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Avaliações de empresas</h3>
              <span className="text-xs text-zinc-500">Feedbacks após obras</span>
            </div>
            {loading ? (
              <ListSkeleton items={2} />
            ) : feedbacks.length ? (
              <div className="grid gap-3">
                {feedbacks.map((f) => (
                  <div key={f.id} className="rounded-xl border border-zinc-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                          <div className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5" /> {f.rating?.toFixed(1) ?? "—"}
                          </div>
                        </div>
                        <span className="text-sm text-zinc-600">{f.empresa ?? "Empresa"}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{fmtDate(f.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-700">{f.comentario ?? "Sem comentário."}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyLine text="Ainda não há avaliações registradas." />
            )}
          </section>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Disponibilidade */}
          <section className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Disponibilidade</h3>
              <span className="text-xs text-zinc-500">Resumo</span>
            </div>
            {loading ? (
              <ParagraphSkeleton lines={2} />
            ) : (
              <div className="space-y-2 text-sm text-zinc-700">
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-zinc-600" />
                    Estado
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${classBadge(p?.status)}`}>
                    {statusLabel(p?.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-center gap-2">
                    <Medal className="h-4 w-4 text-zinc-600" />
                    Valor hora
                  </div>
                  <span className="font-medium">{formatMoney(p?.valor_ref_hora ?? undefined)}</span>
                </div>
              </div>
            )}
          </section>

          {/* Chamada para ação */}
          <section className="rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <h3 className="text-base font-semibold">Contratar este profissional</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Faça a alocação em uma das suas obras. Você poderá definir data de início e valor hora negociado.
            </p>
            <button
              onClick={openAddModal}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              <PlusIcon /> Adicionar à obra
            </button>
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <HelpCircle className="h-3.5 w-3.5" />

              Contato direto é bloqueado — toda comunicação passa pela plataforma.
            </div>
          </section>
        </div>
      </div>

      {/* Modal Adicionar à obra */}
      <AnimatePresence>
        {modalAdd && p && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-xl"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold">Adicionar à obra</h4>
                  <p className="text-sm text-zinc-600">
                    {p.nome} — {p.funcao}
                  </p>
                </div>
                <button onClick={() => setModalAdd(false)} className="rounded-lg p-1 hover:bg-zinc-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <span className="mb-1 block text-xs font-medium text-zinc-600">Obra</span>
                  <select
                    value={obraSel}
                    onChange={(e) => setObraSel(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">Selecione uma obra…</option>
                    {obrasEmpresa.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nome} {o.cidade ? `— ${o.cidade}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="mb-1 block text-xs font-medium text-zinc-600">Data de início</span>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-medium text-zinc-600">Valor hora (€)</span>
                    <div className="relative">
                      <Medal className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <input
                        inputMode="decimal"
                        value={valorHora}
                        onChange={(e) => setValorHora(e.target.value)}
                        placeholder="ex: 14.50"
                        className="w-full rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setModalAdd(false)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50">
                  Cancelar
                </button>
                <button
                  disabled={!obraSel || inserindo}
                  onClick={confirmarAdicionar}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {inserindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =========================
   Helpers & UI bits
========================= */

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}
function fmtDateRange(i?: string | null, f?: string | null) {
  const a = fmtDate(i);
  const b = fmtDate(f);
  if (a === "—" && b === "—") return "—";
  if (b === "—") return `${a} • atual`;
  return `${a} • ${b}`;
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">
      <Info className="h-4 w-4" />
      {text}
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 animate-pulse rounded-full bg-zinc-100" />
      <div className="space-y-2">
        <div className="h-4 w-44 animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-60 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="ml-auto h-9 w-40 animate-pulse rounded-xl bg-zinc-100" />
    </div>
  );
}
function BadgeSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-zinc-100" />
      ))}
    </div>
  );
}
function ParagraphSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 w-full animate-pulse rounded bg-zinc-100" />
      ))}
    </div>
  );
}
function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />
      ))}
    </div>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
      <path d="M9 3h2v14H9z" />
      <path d="M3 9h14v2H3z" />
    </svg>
  );
}
