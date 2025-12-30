// src/components/professional/PainelProfissional.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Briefcase,
  ClipboardList,
  Award,
  TrendingUp,
  Star,
  Building2,
  MapPin,
  Hammer,
  ArrowRight,
  Sparkles,
  PlusCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function PainelProfissional({
  profile,
  theme,
  stats,
  setActivePage,
}: any) {
  const { user } = useAuth();
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  const [dadosCarreira, setDadosCarreira] = useState<any>(null);
  const [obrasAtivas, setObrasAtivas] = useState<any[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [nomeProfissional, setNomeProfissional] = useState<string | null>(null);

  /* =========================
     Dados de carreira + nome (profissionais_perfil)
  ========================= */
  useEffect(() => {
    async function buscarDadosCarreira() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profissionais_perfil")
        .select(
          "nivel, progresso, total_obras, media_avaliacoes, dias_ativos, nome"
        )
        .eq("usuario_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setDadosCarreira(data);
        setNomeProfissional(data.nome || null);
      }
    }
    buscarDadosCarreira();
  }, [user?.id]);

  /* =========================
     Obras ativas – mesma lógica do ObrasAtivas.tsx
  ========================= */
  useEffect(() => {
    async function fetchObrasAtivas() {
      if (!user?.id) return;
      setLoadingObras(true);

      try {
        // 1) Resolver qual é o profissionais.id correspondente ao login atual
        let profissionalId: string | null = null;

        console.log(
          "[PainelProfissional] auth.id:",
          user.id,
          "email:",
          user.email
        );

        // 1.a) profissionais.user_id = auth.id (caso padrão)
        try {
          const { data, error } = await supabase
            .from("profissionais")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle<{ id: string }>();

          if (error) {
            console.error(
              "[PainelProfissional] erro profissional via user_id = auth.id:",
              error
            );
          } else if (data?.id) {
            profissionalId = data.id;
            console.log(
              "[PainelProfissional] profissional encontrado (user_id = auth.id):",
              data
            );
          }
        } catch (e) {
          console.error(
            "[PainelProfissional] erro inesperado em user_id = auth.id:",
            e
          );
        }

        // vamos reaproveitar a linha da tabela usuarios se for preciso
        let usuarioRow:
          | { id: string; auth_id: string | null; email: string | null }
          | null = null;

        // 1.b) se não achou ainda, tenta usuarios.auth_id = auth.id
        if (!profissionalId) {
          try {
            const { data, error } = await supabase
              .from("usuarios")
              .select("id, auth_id, email")
              .eq("auth_id", user.id)
              .maybeSingle<{
                id: string;
                auth_id: string | null;
                email: string | null;
              }>();

            if (error) {
              console.error(
                "[PainelProfissional] erro usuario via auth_id:",
                error
              );
            } else if (data?.id) {
              usuarioRow = data;
              console.log(
                "[PainelProfissional] usuario encontrado por auth_id:",
                data
              );
            }
          } catch (e) {
            console.error(
              "[PainelProfissional] erro inesperado usuario.auth_id:",
              e
            );
          }
        }

        // 1.c) se ainda não temos usuarioRow, tenta usuarios.email = user.email
        if (!usuarioRow && user.email) {
          try {
            const { data, error } = await supabase
              .from("usuarios")
              .select("id, auth_id, email")
              .eq("email", user.email)
              .maybeSingle<{
                id: string;
                auth_id: string | null;
                email: string | null;
              }>();

            if (error) {
              console.error(
                "[PainelProfissional] erro usuario via email:",
                error
              );
            } else if (data?.id) {
              usuarioRow = data;
              console.log(
                "[PainelProfissional] usuario encontrado por email:",
                data
              );
            }
          } catch (e) {
            console.error(
              "[PainelProfissional] erro inesperado usuario.email:",
              e
            );
          }
        }

        // 1.d) com usuarioRow em mãos, replica todos os vínculos possíveis
        if (usuarioRow && !profissionalId) {
          // profissionais.user_id = usuarios.id
          try {
            const { data, error } = await supabase
              .from("profissionais")
              .select("id")
              .eq("user_id", usuarioRow.id)
              .maybeSingle<{ id: string }>();

            if (error) {
              console.error(
                "[PainelProfissional] erro profissional via user_id = usuarios.id:",
                error
              );
            } else if (data?.id) {
              profissionalId = data.id;
              console.log(
                "[PainelProfissional] profissional via usuarios.id:",
                data
              );
            }
          } catch (e) {
            console.error(
              "[PainelProfissional] erro inesperado user_id = usuarios.id:",
              e
            );
          }

          // profissionais.user_id = usuarios.auth_id (caso legado)
          if (!profissionalId && usuarioRow.auth_id) {
            try {
              const { data, error } = await supabase
                .from("profissionais")
                .select("id")
                .eq("user_id", usuarioRow.auth_id)
                .maybeSingle<{ id: string }>();

              if (error) {
                console.error(
                  "[PainelProfissional] erro profissional via user_id = usuarios.auth_id:",
                  error
                );
              } else if (data?.id) {
                profissionalId = data.id;
                console.log(
                  "[PainelProfissional] profissional via usuarios.auth_id:",
                  data
                );
              }
            } catch (e) {
              console.error(
                "[PainelProfissional] erro inesperado user_id = usuarios.auth_id:",
                e
              );
            }
          }
        }

        if (!profissionalId) {
          console.warn(
            "[PainelProfissional] nenhum profissional encontrado p/ usuário atual."
          );
          setObrasAtivas([]);
          return;
        }

        console.log(
          "[PainelProfissional] usando profissional_id:",
          profissionalId
        );

        // 2) vínculos do profissional em profissionais_obras
        const { data: vincs, error: ev } = await supabase
          .from("profissionais_obras")
          .select("id, obra_id, funcao, status, progresso, empresa_id")
          .eq("profissional_id", profissionalId);

        if (ev) {
          console.error(
            "[PainelProfissional] erro ao buscar vínculos de obras:",
            ev
          );
          setObrasAtivas([]);
          return;
        }

        if (!vincs || vincs.length === 0) {
          console.log(
            "[PainelProfissional] nenhum vínculo em profissionais_obras."
          );
          setObrasAtivas([]);
          return;
        }

        // considera como "ativos" os status que fazem sentido
        let vincsAtivos =
          vincs.filter((v: any) => {
            const s = (v.status || "").toLowerCase();
            return ["ativo", "convocado", "em andamento", "em_andamento"].includes(
              s
            );
          }) || [];

        // se não sobrou nada, mostra tudo mesmo assim
        if (vincsAtivos.length === 0) {
          vincsAtivos = vincs;
        }

        const obraIds = Array.from(
          new Set(vincsAtivos.map((v: any) => v.obra_id).filter(Boolean))
        );

        if (obraIds.length === 0) {
          console.log(
            "[PainelProfissional] vínculos sem obra_id válido em profissionais_obras."
          );
          setObrasAtivas([]);
          return;
        }

        // 3) dados das obras
        const { data: obras, error: eo } = await supabase
          .from("obras")
          .select(
            `
            id,
            nome,
            cidade,
            data_inicio,
            empresa_id,
            empresa:empresa_id (
              id,
              nome
            )
          `
          )
          .in("id", obraIds);

        if (eo) {
          console.error("[PainelProfissional] erro ao buscar obras:", eo);
          setObrasAtivas([]);
          return;
        }

        const mapaObras = new Map((obras || []).map((o: any) => [o.id, o]));

        const obrasFormatadas =
          vincsAtivos.map((v: any) => {
            const obra = mapaObras.get(v.obra_id);
            const inicio = obra?.data_inicio
              ? new Date(obra.data_inicio).toLocaleDateString("pt-PT", {
                  month: "2-digit",
                  year: "numeric",
                })
              : "-";

            return {
              obraId: v.obra_id,
              empresa: obra?.empresa?.nome || "Empresa não informada",
              nomeObra: obra?.nome || "Obra sem nome",
              local: obra?.cidade || "Local não informado",
              funcao: v.funcao || "-",
              inicio,
              xp: Number(v.progresso) || 0,
              totalXp: 100,
              avaliacao: 0,
              status: v.status || "Ativo",
            };
          }) ?? [];

        setObrasAtivas(obrasFormatadas);
      } catch (e) {
        console.error(
          "[PainelProfissional] erro inesperado ao carregar obras ativas:",
          e
        );
        setObrasAtivas([]);
      } finally {
        setLoadingObras(false);
      }
    }

    fetchObrasAtivas();
  }, [user?.id, user?.email]);

  /* =========================
     Saudação / nome
  ========================= */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const saudacao = getGreeting();

  const displayName =
    nomeProfissional ||
    profile?.nome ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Novo usuário";

  /* =========================
     Animações
  ========================= */
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  /* =========================
     Render
  ========================= */
  return (
    <>
      {/* MODAL DE ONBOARDING */}
      <AnimatePresence>
        {mostrarOnboarding && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-40"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div
                className={`relative rounded-3xl p-8 sm:p-10 shadow-2xl max-w-lg w-full overflow-hidden border ${
                  theme === "dark"
                    ? "bg-gradient-to-b from-slate-800/95 to-slate-900/90 border-slate-700"
                    : "bg-gradient-to-b from-white/95 to-slate-100/90 border-gray-300"
                }`}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 25,
                    ease: "linear",
                  }}
                  className="absolute -top-40îÁ-40 -right-40 w-96 h-96 bg-gradient-to-tr from-blue-500/25 via-cyan-400/15 to-transparent blur-3xl rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 30,
                    ease: "linear",
                  }}
                  className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-indigo-500/25 via-blue-400/15 to-transparent blur-3xl rounded-full"
                />

                <div className="relative z-10 text-center">
                  <Sparkles className="mx-auto w-10 h-10 text-blue-400 mb-3 animate-pulse" />
                  <h2 className="text-2xl font-bold mb-3">
                    👋 Bem-vindo à{" "}
                    <span className="text-blue-500">Acrobatas</span>!
                  </h2>
                  <p className="text-sm opacity-90 text-gray-700 dark:text-gray-300 mb-6">
                    Complete seu perfil para desbloquear obras e oportunidades.
                  </p>
                  <button
                    onClick={() => {
                      setMostrarOnboarding(false);
                      setTimeout(() => setActivePage("perfil"), 300);
                    }}
                    className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all"
                  >
                    🚀 Criar meu perfil agora
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CONTEÚDO PRINCIPAL */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={`transition-all duration-300 ${
          mostrarOnboarding ? "pointer-events-none opacity-70 blur-sm" : ""
        }`}
      >
        {/* CABEÇALHO */}
        <motion.section
          variants={item}
          className={`rounded-2xl p-4 sm:p-6 shadow-sm sm:shadow-md ${
            theme === "dark"
              ? "bg-slate-800/80 border border-slate-700"
              : "bg-white border border-gray-200"
          }`}
        >
          <h2 className="text-xl sm:text-2xl font-bold mb-1">
            {saudacao}, {displayName} 👋
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Bem-vindo de volta à plataforma Acrobatas. Aqui você acompanha suas
            candidaturas, progresso e obras em andamento.
          </p>
        </motion.section>

        {/* CARDS PRINCIPAIS (sem contagem) */}
        <motion.section
          variants={item}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-5 sm:mt-6"
        >
          {[
            {
              label: "Candidaturas",
              icon: FileText,
              color: "from-blue-500 to-blue-400",
              onClick: () => setActivePage("candidaturas"),
            },
            {
              label: "Vagas",
              icon: Briefcase,
              color: "from-emerald-500 to-teal-400",
              onClick: () => setActivePage("vagas"),
            },
            {
              label: "Tarefas",
              icon: ClipboardList,
              color: "from-amber-400 to-yellow-400",
              onClick: () => setActivePage("tarefas"),
            },
            {
              label: "Documentos",
              icon: FileText,
              color: "from-violet-500 to-fuchsia-500",
              // ✅ AQUI: abre "Meus Documentos" no ProfessionalDashboard
              onClick: () => setActivePage("documentos_meus"),
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              variants={item}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={card.onClick}
              className={`rounded-2xl p-4 sm:p-6 text-white shadow-md hover:shadow-lg bg-gradient-to-br ${card.color} cursor-pointer transition-all`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <card.icon className="w-6 sm:w-8 h-6 sm:h-8 opacity-90" />
                <p className="text-sm sm:text-base font-semibold">
                  {card.label}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.section>

        {/* PROGRESSO DE CARREIRA + OBRAS ATIVAS */}
        <motion.section
          variants={container}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mt-8"
        >
          {/* PROGRESSO DE CARREIRA */}
          <motion.div
            variants={item}
            className={`rounded-2xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-all ${
              theme === "dark"
                ? "bg-slate-800/90 border border-slate-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" /> Progresso de
                Carreira
              </h3>
              <span className="px-2.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {dadosCarreira?.nivel || "Aprendiz"}
              </span>
            </div>

            <div className="relative w-full h-3 bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${dadosCarreira?.progresso || 0}%` }}
                transition={{ duration: 1 }}
                className="absolute top-0 left-0 h-3 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full"
              />
            </div>

            <p className="text-xs sm:text-sm mt-3 text-gray-600 dark:text-gray-400">
              Faltam{" "}
              <span className="font-semibold text-blue-500">2 obras</span> e
              média ≥ 4.5 para subir de nível.
            </p>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-5">
              {[
                {
                  label: "Obras",
                  value: dadosCarreira?.total_obras ?? 0,
                  icon: TrendingUp,
                  color: "text-emerald-500",
                },
                {
                  label: "Avaliações",
                  value: dadosCarreira?.media_avaliacoes?.toFixed(1) ?? "—",
                  icon: Star,
                  color: "text-yellow-400",
                },
                {
                  label: "Dias",
                  value: dadosCarreira?.dias_ativos ?? 0,
                  icon: FileText,
                  color: "text-blue-500",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  className={`rounded-xl p-3 sm:p-4 text-center border transition-all ${
                    theme === "dark"
                      ? "border-slate-700"
                      : "border-slate-200"
                  }`}
                >
                  <item.icon
                    className={`mx-auto mb-1.5 w-5 h-5 ${item.color}`}
                  />
                  <h4 className="text-base sm:text-xl font-bold">{item.value}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.label}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActivePage("carreira_progresso")}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-lg shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                Ver minha carreira <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActivePage("perfil")}
                className="flex-1 border border-blue-400 text-blue-600 dark:text-blue-300 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-all text-sm sm:text-base"
              >
                Atualizar perfil
              </motion.button>
            </div>
          </motion.div>

          {/* OBRAS ATIVAS */}
          <motion.div
            variants={item}
            className={`rounded-2xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-all ${
              theme === "dark"
                ? "bg-slate-800/80 border border-slate-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
              🏗️ Obras Ativas
            </h3>

            {loadingObras ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                Carregando obras...
              </p>
            ) : obrasAtivas.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {obrasAtivas.slice(0, 3).map((obra, i) => {
                  const progresso =
                    obra.totalXp > 0 ? (obra.xp / obra.totalXp) * 100 : 0;
                  return (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      className="rounded-xl border border-blue-100 dark:border-slate-700 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/60 transition-all"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2 text-sm sm:text-base">
                          <Building2 className="w-4 h-4" /> {obra.empresa}
                        </h4>
                        <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                          ⭐ {obra.avaliacao.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {obra.local} |{" "}
                        <Hammer className="w-3 h-3" /> {obra.funcao}
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Desde {obra.inicio} — {obra.status}
                      </p>

                      <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full mt-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${progresso}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center mt-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          XP: {obra.xp} / {obra.totalXp}
                        </span>
                        <button
                          className="text-blue-500 hover:underline text-[12px]"
                          onClick={() => {
                            if (obra.obraId) {
                              localStorage.setItem(
                                "prof_obras_ativas_obraId",
                                obra.obraId
                              );
                            }
                            setActivePage("obras_ativas");
                          }}
                        >
                          Ver detalhes →
                        </button>
                      </div>
                    </motion.div>
                  );
                })}

                {obrasAtivas.length >= 3 && (
                  <button
                    onClick={() => setActivePage("obras_ativas")}
                    className="w-full mt-2 text-xs sm:text-sm text-blue-600 dark:text-blue-300 hover:underline font-medium text-right"
                  >
                    Ver todas as obras →
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-6 px-3">
                <PlusCircle className="mx-auto w-10 h-10 text-blue-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Nenhuma obra ativa no momento.
                </p>
                <button
                  onClick={() => setActivePage("vagas")}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg shadow hover:opacity-90"
                >
                  🔍 Procurar novas vagas
                </button>
              </div>
            )}
          </motion.div>
        </motion.section>
      </motion.div>
    </>
  );
}
