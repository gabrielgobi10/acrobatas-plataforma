
// src/components/company/CentralDeNavegacaoEmpresa/Documentos/Acrobatas.tsx
import { useEffect, useState } from "react";
import { FileText, Download, CheckCircle2, Clock3, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { carregarEstrutura } from "./utils/estruturaAcrobatas";
import type { GrupoComTipos } from "./types/docAcrobatas";
import { PreviewModal } from "./components/PreviewModal";

/* ================================
   CHIP DE STATUS — pronto para dark
================================ */
function Chip({ kind, children }: { kind: "ok" | "warn" | "idle"; children: string }) {
  const Icon = kind === "ok" ? CheckCircle2 : kind === "warn" ? AlertCircle : Clock3;

  const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ring-1";
  const styles =
    kind === "ok"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-500/20"
      : kind === "warn"
      ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-500/20"
      : "bg-gray-50 text-gray-600 ring-gray-200 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10";

  return (
    <span className={`${base} ${styles}`}>
      <Icon className="w-3.5 h-3.5" />
      {children}
    </span>
  );
}

/* ================================
   PÁGINA
================================ */
export default function AcrobatasEmpresa() {
  const [estrutura, setEstrutura] = useState<GrupoComTipos[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado do modal de preview (mantido)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    validade?: string | number | null;
    dataEnvio?: string | null;
  } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await carregarEstrutura();
        setEstrutura(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400/90" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Documentação da Acrobatas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Documentos institucionais da Acrobatas — disponíveis para consulta e download.
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">Carregando…</div>
      ) : (
        estrutura.map((grupo, gi) => (
          <motion.section
            key={grupo.grupo.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.04 }}
            className="rounded-2xl border bg-white shadow-sm
                       border-gray-200
                       dark:bg-[#0f1520]/95 dark:border-zinc-800 dark:shadow-none"
          >
            {/* Cabeçalho do grupo */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {grupo.grupo.nome}
                </h2>
                {grupo.grupo.descricao && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {grupo.grupo.descricao}
                  </p>
                )}
              </div>
            </div>

            {/* Cards */}
            <div className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grupo.tipos.length ? (
                grupo.tipos.map(({ tipo, arquivo }) => {
                  const temArquivo = !!arquivo?.publicUrl;
                  const status: "ok" | "idle" = temArquivo ? "ok" : "idle";

                  return (
                    <div
                      key={tipo.id}
                      className="group rounded-xl border p-4 transition relative
                                 border-gray-200 hover:border-blue-300
                                 dark:border-zinc-800 dark:hover:border-blue-400/40
                                 bg-white dark:bg-white/5
                                 hover:bg-gray-50 dark:hover:bg-white/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {tipo.nome || "—"}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            <Chip kind={status}>
                              {temArquivo ? "Disponível" : "Não enviado"}
                            </Chip>

                            {tipo.validade_meses && arquivo?.created_at && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {(() => {
                                  const validade = tipo.validade_meses ?? 0;
                                  const dataEnvio = new Date(arquivo.created_at);
                                  const dataVenc = new Date(dataEnvio);
                                  dataVenc.setMonth(dataEnvio.getMonth() + validade);

                                  const diffMeses =
                                    (dataVenc.getFullYear() - new Date().getFullYear()) * 12 +
                                    (dataVenc.getMonth() - new Date().getMonth());

                                  if (diffMeses > 1) return `Vence em ${diffMeses} meses`;
                                  if (diffMeses === 1) return `Vence em 1 mês`;
                                  if (diffMeses === 0) return `Vence este mês`;
                                  return `Expirado há ${Math.abs(diffMeses)} mês${
                                    Math.abs(diffMeses) > 1 ? "es" : ""
                                  }`;
                                })()}
                              </span>
                            )}
                          </div>

                          {arquivo && (
                            <p className="text-[11px] mt-1 text-gray-400 dark:text-gray-500">
                              Enviado em: {new Date(arquivo.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {/* Ação: download/preview */}
                        {temArquivo && (
                          <a
                            href={arquivo.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700
                                       dark:text-blue-400 dark:hover:text-blue-300
                                       transition"
                            title="Baixar documento"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  Nenhum tipo de documento disponível
                </p>
              )}
            </div>
          </motion.section>
        ))
      )}

      {/* Modal (mantido) */}
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileUrl={previewFile?.url}
        fileName={previewFile?.name}
        validade={previewFile?.validade}
        dataEnvio={previewFile?.dataEnvio}
      />

      {/* Rodapé */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-600 pt-4">
        Sistema de Documentação • Acrobatas © {new Date().getFullYear()}
      </div>
    </div>
  );
}
