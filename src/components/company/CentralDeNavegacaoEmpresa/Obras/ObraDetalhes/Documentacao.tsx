// src/components/company/CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/DocumentacaoObra.tsx
import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileCheck2,
  FileWarning,
  Users,
  Eye,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

type DocStatus = "valido" | "pendente" | "vencido";

type Documento = {
  id: string;
  nome?: string | null;
  status: DocStatus;
  validade?: string | null;
  arquivo_url?: string | null;
};

type Profissional = {
  id: string;
  nome: string;
  funcao?: string | null;
  foto_url?: string | null;
  documentos: Documento[];
  counters: { validos: number; pendentes: number; vencidos: number };
};

export default function DocumentacaoObra({ obraId }: { obraId: string }) {
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!obraId) return;
    carregarDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId]);

  async function carregarDocumentos() {
    if (!obraId) return;
    setLoading(true);
    setReloading(true);

    try {
      // 🔹 Profissionais vinculados à obra
      const { data: vinculos, error: errVinc } = await supabase
        .from("profissionais_obras")
        .select(
          `
          id,
          profissional_id,
          funcao,
          profissionais!fk_profissional_obra (
            id,
            nome,
            foto_url
          )
        `
        )
        .eq("obra_id", obraId);

      if (errVinc) throw errVinc;

      const profIds =
        vinculos?.map((v: any) => v.profissional_id).filter(Boolean) || [];

      if (!profIds.length) {
        setProfissionais([]);
        setLoading(false);
        setReloading(false);
        return;
      }

      // 🔹 Documentos desses profissionais (mesma view da página geral)
      const { data: docsDb, error: errDocs } = await supabase
        .from("admin_docs_prof_v")
        .select(
          "doc_id, profissional_id, documento_nome, status, validade, arquivo_url"
        )
        .in("profissional_id", profIds)
        .order("profissional_id", { ascending: true })
        .order("documento_nome", { ascending: true });

      if (errDocs) throw errDocs;

      // 🔹 Normaliza status vindo da view
      function normalizeStatus(s: any): DocStatus {
        const raw = String(s ?? "").toLowerCase();
        if (raw.startsWith("vencid")) return "vencido";
        if (raw.startsWith("válid") || raw.startsWith("valid")) return "valido";
        // inclui pendente / reprovado / por validar etc
        return "pendente";
      }

      function countStatuses(arr: Documento[]) {
        return arr.reduce(
          (acc, d) => {
            if (d.status === "valido") acc.validos++;
            else if (d.status === "pendente") acc.pendentes++;
            else acc.vencidos++;
            return acc;
          },
          { validos: 0, pendentes: 0, vencidos: 0 }
        );
      }

      // 🔹 Agrupa docs por profissional
      const docsByProf = new Map<string, Documento[]>();

      (docsDb || []).forEach((d: any) => {
        const originalNome: string = d.documento_nome || "";

        // mesma regra da página geral: ignora contactos de emergência
        if (originalNome.toLowerCase().startsWith("contactos de emergência")) {
          return;
        }

        const nomeNormalizado = originalNome;
        const arr = docsByProf.get(d.profissional_id) ?? [];

        arr.push({
          id: d.doc_id,
          nome: nomeNormalizado,
          status: normalizeStatus(d.status),
          validade: d.validade,
          arquivo_url: d.arquivo_url,
        });

        docsByProf.set(d.profissional_id, arr);
      });

      // 🔹 Monta cards de profissionais
      const result: Profissional[] = (vinculos || []).map((v: any) => {
        const p = v.profissionais;
        const docsP = docsByProf.get(p.id) ?? [];
        return {
          id: p.id,
          nome: p.nome || "Sem nome",
          funcao: v.funcao,
          foto_url: p.foto_url,
          documentos: docsP,
          counters: countStatuses(docsP),
        };
      });

      setProfissionais(result);
    } catch (err) {
      console.error("❌ Erro ao carregar documentação da obra:", err);
      setProfissionais([]);
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }

  const total = useMemo(() => {
    const all = profissionais.flatMap((p) => p.documentos);
    const validos = all.filter((d) => d.status === "valido").length;
    const pendentes = all.filter((d) => d.status === "pendente").length;
    const vencidos = all.filter((d) => d.status === "vencido").length;
    return { validos, pendentes, vencidos };
  }, [profissionais]);

  return (
    <div className="space-y-8">
      {/* ================= RESUMO (cards de cima) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ResumoCard
          icon={<FileCheck2 className="w-5 h-5 text-emerald-500" />}
          titulo="Documentos Válidos"
          valor={total.validos}
        />
        <ResumoCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          titulo="Pendentes"
          valor={total.pendentes}
        />
        <ResumoCard
          icon={<FileWarning className="w-5 h-5 text-red-500" />}
          titulo="Vencidos"
          valor={total.vencidos}
        />
      </div>

      {/* ================= LISTA DE PROFISSIONAIS ================= */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-800 dark:text-white">
            <Users className="w-5 h-5 text-blue-500" />
            Profissionais da Obra
          </h2>
          <button
            onClick={carregarDocumentos}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-60"
            disabled={reloading}
          >
            {reloading && <Loader2 className="w-4 h-4 animate-spin" />}
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-zinc-500 dark:text-zinc-400">
            Carregando documentos...
          </div>
        ) : profissionais.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 dark:text-zinc-400">
            Nenhum profissional vinculado a esta obra.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {profissionais.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 p-4 shadow-sm hover:shadow-md transition-all"
              >
                {/* Header do profissional */}
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={
                      p.foto_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        p.nome
                      )}`
                    }
                    alt={p.nome}
                    className="w-12 h-12 rounded-full border-2 border-blue-500/30 object-cover"
                  />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white leading-tight">
                      {p.nome}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {p.funcao || "Função não informada"}
                    </p>
                  </div>
                </div>

                {/* Contadores de status */}
                <div className="flex gap-2 text-[12px] mb-3">
                  <Badge color="green" label={`${p.counters.validos} válidos`} />
                  <Badge
                    color="amber"
                    label={`${p.counters.pendentes} pendentes`}
                  />
                  <Badge
                    color="red"
                    label={`${p.counters.vencidos} vencidos`}
                  />
                </div>

                {/* Lista rápida de documentos */}
                <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                  {p.documentos.slice(0, 4).map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{d.nome}</span>
                      <StatusChip status={d.status} />
                    </div>
                  ))}
                  {p.documentos.length > 4 && (
                    <p className="opacity-70 text-right">
                      +{p.documentos.length - 4} outros
                    </p>
                  )}
                  {p.documentos.length === 0 && (
                    <p className="opacity-70">
                      Nenhum documento registado para este profissional.
                    </p>
                  )}
                </div>

                {/* Botão ver documentação completa */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() =>
                      navigate(`/empresa/documentacao/profissionais/${p.id}`)
                    }
                    className="px-3 py-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 text-sm flex items-center gap-1 transition"
                  >
                    <Eye className="w-4 h-4" /> Ver documentação
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==============================
   COMPONENTES AUXILIARES
============================== */
function ResumoCard({
  icon,
  titulo,
  valor,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/70 dark:bg-white/5 border border-zinc-200 dark:border-zinc-700 p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          {icon}
        </div>
        <div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {titulo}
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-white">
            {valor}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatusChip({ status }: { status: DocStatus }) {
  const styles =
    status === "valido"
      ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      : status === "pendente"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";

  const label =
    status === "valido"
      ? "válido"
      : status === "pendente"
      ? "pendente"
      : "vencido";

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] border font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

function Badge({
  label,
  color,
}: {
  label: string;
  color: "green" | "amber" | "red";
}) {
  const styles: Record<string, string> = {
    green:
      "bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400",
    amber:
      "bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md font-medium ${styles[color]}`}>
      {label}
    </span>
  );
}
