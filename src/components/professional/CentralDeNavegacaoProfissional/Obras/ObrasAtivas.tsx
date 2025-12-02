"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  MapPin,
  Users,
  Search,
  BarChart3,
  UserCheck,
  Eye,
  Loader2,
  MessageSquare,
  CalendarCheck2,
  BadgeCheck,
  Waypoints,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

import ChatObra from "@/components/professional/CentralDeNavegacaoProfissional/Obras/ObrasAtivasDetalhes/ChatObra";
import MapaObra from "@/components/professional/CentralDeNavegacaoProfissional/Obras/ObrasAtivasDetalhes/MapaObra";
import PresencaObra from "@/components/professional/CentralDeNavegacaoProfissional/Obras/ObrasAtivasDetalhes/PresencaObra";
import RelatorioDoDiaForm from "@/components/professional/CentralDeNavegacaoProfissional/Obras/ObrasAtivasDetalhes/RelatorioDoDiaForm";
import VerDetalhesObra from "@/components/professional/CentralDeNavegacaoProfissional/Obras/ObrasAtivasDetalhes/VerDetalhesObra";

type Obra = {
  id: string;
  nome?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  empresa_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  descricao?: string | null;
  status?: string | null;
  progresso_total?: number | null;
};

type Vinculo = {
  id: string;
  obra_id: string;
  funcao?: string | null;
  status?: string | null;
  criado_em?: string | null;
  empresa_id?: string | null;
  progresso?: number | null;
};

type ObrasAtivasProfissionalProps = {
  /** Chamado quando o usuário clica em "Ver vagas disponíveis" no estado vazio */
  onIrParaVagas?: () => void;
};

export default function ObrasAtivasProfissional({
  onIrParaVagas,
}: ObrasAtivasProfissionalProps) {
  const { user } = useAuth();

  // lê o id da obra vindo do painel (se existir)
  const [obraIdInicial, setObraIdInicial] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prof_obras_ativas_obraId");
    }
    return null;
  });

  const [minhasObras, setMinhasObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todas");
  const [filtroCidade, setFiltroCidade] = useState("Todas");
  const [filtroEmpresa, setFiltroEmpresa] = useState("Todas");

  const [abaAtiva, setAbaAtiva] = useState<
    "lista" | "chat" | "mapa" | "presenca" | "relatorio" | "detalhes"
  >(obraIdInicial ? "detalhes" : "lista"); // se veio do painel, já começa em "detalhes"

  const [obraSelecionada, setObraSelecionada] = useState<any | null>(null);

  const statusCores: Record<string, string> = {
    "A iniciar":
      "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    "Em andamento":
      "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    Concluída:
      "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    Atrasada:
      "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  };

  useEffect(() => {
    if (!user?.id) return;

    const carregar = async () => {
      setLoading(true);
      try {
        // 1) Buscar profissional pelo user_id (AUTH)
        const { data: prof, error: ep } = await supabase
          .from("profissionais")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (ep) {
          console.error("Erro ao buscar profissional:", ep);
          setMinhasObras([]);
          return;
        }

        if (!prof) {
          console.warn("Profissional não encontrado para user_id:", user.id);
          setMinhasObras([]);
          return;
        }

        // 2) Buscar vínculos desse profissional com obras
        const { data: vincs, error: ev } = await supabase
          .from("profissionais_obras")
          .select("id, obra_id, funcao, status, progresso, empresa_id")
          .eq("profissional_id", prof.id);

        if (ev) {
          console.error("Erro ao carregar vínculos de obras:", ev);
          setMinhasObras([]);
          return;
        }

        if (!vincs || vincs.length === 0) {
          setMinhasObras([]);
          return;
        }

        const obraIds = Array.from(
          new Set(vincs.map((v: any) => v.obra_id).filter(Boolean))
        );

        if (obraIds.length === 0) {
          setMinhasObras([]);
          return;
        }

        // 3) Buscar dados das obras
        const { data: obras, error: eo } = await supabase
          .from("obras")
          .select(
            `
            id,
            nome,
            endereco,
            cidade,
            empresa_id,
            data_inicio,
            data_fim,
            descricao,
            empresa:empresa_id (
              id,
              nome
            )
          `
          )
          .in("id", obraIds);

        if (eo) {
          console.error("Erro ao carregar obras:", eo);
          setMinhasObras([]);
          return;
        }

        const mapaObras = new Map((obras || []).map((o: any) => [o.id, o]));

        const mapStatus = (s?: string | null) => {
          const dict: Record<string, string> = {
            Ativo: "Em andamento",
            Convocado: "A iniciar",
            Inativo: "Concluída",
          };
          return s && dict[s] ? dict[s] : "Em andamento";
        };

        const obrasComDados =
          vincs?.map((v: any) => {
            const obra = mapaObras.get(v.obra_id);
            return {
              id: obra?.id ?? v.obra_id,
              nome: obra?.nome ?? "Obra sem nome",
              cidade: obra?.cidade ?? null,
              endereco:
                obra?.endereco ??
                (obra?.cidade ? obra.cidade : "Endereço não informado"),
              empresa: obra?.empresa
                ? { id: obra.empresa.id, nome: obra.empresa.nome }
                : null,
              funcao: v.funcao || "Profissional",
              status: mapStatus(v.status),
              progresso: v.progresso ?? 42, // placeholder
            };
          }) ?? [];

        setMinhasObras(obrasComDados);

        // 4) Se veio do painel com uma obra específica, seleciona e mantém na aba "detalhes"
        if (obraIdInicial) {
          const obra = obrasComDados.find((o: any) => o.id === obraIdInicial);
          if (obra) {
            setObraSelecionada(obra);
            setAbaAtiva("detalhes");
          } else {
            // se não achar a obra, volta para lista
            setAbaAtiva("lista");
          }

          if (typeof window !== "undefined") {
            localStorage.removeItem("prof_obras_ativas_obraId");
          }
          setObraIdInicial(null);
        }
      } catch (e) {
        console.error("Erro inesperado ao carregar obras:", e);
        setMinhasObras([]);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [user?.id, obraIdInicial]);

  const cidades = useMemo(
    () => ["Todas", ...new Set(minhasObras.map((o) => o.cidade).filter(Boolean))],
    [minhasObras]
  );

  const empresas = useMemo(() => {
    const nomes = minhasObras.map((o) => o.empresa?.nome).filter(Boolean);
    return ["Todas", ...new Set(nomes)];
  }, [minhasObras]);

  const obrasFiltradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return minhasObras.filter((o) => {
      const byBusca =
        !b ||
        o.nome?.toLowerCase().includes(b) ||
        o.endereco?.toLowerCase().includes(b) ||
        o.empresa?.nome?.toLowerCase().includes(b);

      const byStatus = filtroStatus === "Todas" ? true : o.status === filtroStatus;
      const byCidade = filtroCidade === "Todas" ? true : o.cidade === filtroCidade;
      const byEmpresa =
        filtroEmpresa === "Todas" ? true : o.empresa?.nome === filtroEmpresa;

      return byBusca && byStatus && byCidade && byEmpresa;
    });
  }, [busca, filtroStatus, filtroCidade, filtroEmpresa, minhasObras]);

  const kpiTotal = obrasFiltradas.length;
  const kpiMediaProgresso =
    obrasFiltradas.length > 0
      ? Math.round(
          obrasFiltradas.reduce((a: number, o: any) => a + (o.progresso || 0), 0) /
            obrasFiltradas.length
        )
      : 0;

  const voltarLista = () => {
    setAbaAtiva("lista");
    setObraSelecionada(null);
  };

  const renderConteudo = () => {
    switch (abaAtiva) {
      case "chat":
        return <ChatObra obra={obraSelecionada} onVoltar={voltarLista} />;
      case "mapa":
        return <MapaObra obraId={obraSelecionada?.id} onVoltar={voltarLista} />;
      case "presenca":
        return (
          <PresencaObra
            obraId={obraSelecionada?.id}
            obra={obraSelecionada}
            onVoltar={voltarLista}
          />
        );
      case "relatorio":
        return <RelatorioDoDiaForm obra={obraSelecionada} onVoltar={voltarLista} />;
      case "detalhes":
        return <VerDetalhesObra obra={obraSelecionada} onVoltar={voltarLista} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-8 relative w-full">
      <AnimatePresence mode="wait">
        {abaAtiva === "lista" ? (
          <motion.div
            key="lista"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Minhas Obras
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Aqui estão as obras onde você está alocado.
                  </p>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                {
                  icon: <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />,
                  label: "Obras em que estou",
                  valor: kpiTotal,
                },
                {
                  icon: (
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                  ),
                  label: "Progresso médio",
                  valor: `${kpiMediaProgresso}%`,
                },
              ].map((c, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-5 flex items-center gap-2 sm:gap-3 transition-all"
                >
                  {c.icon}
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {c.label}
                    </p>
                    <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                      {c.valor}
                    </h2>
                  </div>
                </div>
              ))}
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-5 mb-6 sm:mb-8 transition-all">
              {/* Mobile chips */}
              <div className="flex sm:hidden overflow-x-auto gap-2 pb-2">
                {["Todas", "A iniciar", "Em andamento", "Concluída", "Atrasada"].map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => setFiltroStatus(s)}
                      className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                        filtroStatus === s
                          ? "bg-blue-600 text-white"
                          : "bg-[#f1f5f9] dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {s}
                    </button>
                  )
                )}
              </div>

              {/* Desktop */}
              <div className="hidden sm:grid grid-cols-1 xl:grid-cols-4 gap-4 items-center">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar obra, empresa ou local..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1b2332] text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1b2332] text-gray-900 dark:text-gray-100"
                >
                  <option>Todas</option>
                  <option>A iniciar</option>
                  <option>Em andamento</option>
                  <option>Concluída</option>
                  <option>Atrasada</option>
                </select>

                <select
                  value={filtroCidade}
                  onChange={(e) => setFiltroCidade(e.target.value)}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1b2332] text-gray-900 dark:text-gray-100"
                >
                  {cidades.map((c, i) => (
                    <option key={i}>{c}</option>
                  ))}
                </select>

                <select
                  value={filtroEmpresa}
                  onChange={(e) => setFiltroEmpresa(e.target.value)}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1b2332] text-gray-900 dark:text-gray-100"
                >
                  {empresas.map((e, i) => (
                    <option key={i}>{e}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lista / Estado vazio */}
            {loading ? (
              <div className="flex justify-center py-20 text-gray-400">
                <Loader2 className="animate-spin w-6 h-6 text-blue-500 mr-2" />
                Carregando...
              </div>
            ) : obrasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="w-12 h-12 text-blue-500 mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Você não está alocado em nenhuma obra
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-md text-sm">
                  Veja novas vagas para começar a trabalhar. Assim que você for
                  alocado em uma obra, ela aparecerá aqui automaticamente.
                </p>
                <button
                  onClick={() => onIrParaVagas?.()}
                  className="mt-6 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition"
                >
                  Ver vagas disponíveis
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                {obrasFiltradas.map((obra: any) => (
                  <motion.div
                    key={obra.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {obra.nome || "Obra sem nome"}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 truncate">
                          <MapPin className="w-4 h-4 text-blue-400" />
                          {obra.endereco || "Endereço não informado"}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setObraSelecionada(obra);
                          setAbaAtiva("detalhes");
                        }}
                        className="text-blue-500 dark:text-blue-400 text-xs sm:text-sm hover:underline flex items-center gap-1"
                      >
                        <Eye size={15} /> Ver
                      </button>
                    </div>

                    <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-3">
                      <span
                        className={`font-medium px-2 py-1 rounded-full ${
                          statusCores[obra.status] ||
                          "bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {obra.status}
                      </span>
                      <span>
                        <UserCheck className="inline w-4 h-4 mr-1 text-emerald-500 dark:text-emerald-400" />
                        {obra.funcao}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2 overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${obra.progresso || 0}%` }}
                        transition={{ duration: 0.6 }}
                        className="bg-blue-500 h-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 sm:mt-4">
                      <button
                        onClick={() => {
                          setObraSelecionada(obra);
                          setAbaAtiva("presenca");
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm rounded-lg py-2 flex items-center justify-center gap-2"
                      >
                        <CalendarCheck2 className="w-4 h-4" />
                        Presença
                      </button>

                      <button
                        onClick={() => {
                          setObraSelecionada(obra);
                          setAbaAtiva("relatorio");
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-lg py-2 flex items-center justify-center gap-2"
                      >
                        <BadgeCheck className="w-4 h-4" />
                        Relatório
                      </button>

                      <button
                        onClick={() => {
                          setObraSelecionada(obra);
                          setAbaAtiva("chat");
                        }}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-[#344256] dark:hover:bg-[#3c4c64] text-gray-800 dark:text-white text-xs sm:text-sm rounded-lg py-2 flex items-center justify-center gap-2 border border-zinc-200 dark:border-transparent"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                      </button>

                      <button
                        onClick={() => {
                          setObraSelecionada(obra);
                          setAbaAtiva("mapa");
                        }}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-[#263143] dark:hover:bg-[#2b3750] text-gray-800 dark:text-white text-xs sm:text-sm rounded-lg py-2 flex items-center justify-center gap-2 border border-zinc-200 dark:border-transparent"
                      >
                        <Waypoints className="w-4 h-4" />
                        Mapa
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="detalhe"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <button
              onClick={voltarLista}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4 sm:mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            {obraSelecionada ? (
              renderConteudo()
            ) : (
              <div className="flex justify-center py-20 text-gray-400">
                <Loader2 className="animate-spin w-6 h-6 text-blue-500 mr-2" />
                Carregando obra...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
