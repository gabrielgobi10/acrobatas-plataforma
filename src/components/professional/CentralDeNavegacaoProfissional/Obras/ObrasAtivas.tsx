// src/components/professional/CentralDeNavegacaoProfissional/Obras/ObrasAtivas.tsx
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

type ObrasAtivasProfissionalProps = {
  onIrParaVagas?: () => void;
};

type ProfRow = { id: string };

export default function ObrasAtivasProfissional({
  onIrParaVagas,
}: ObrasAtivasProfissionalProps) {
  const { user } = useAuth();

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
  >(obraIdInicial ? "detalhes" : "lista");

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

  function mapStatus(s?: string | null) {
    const dict: Record<string, string> = {
      Ativo: "Em andamento",
      Convocado: "A iniciar",
      Inativo: "Concluída",
    };
    return s && dict[s] ? dict[s] : "Em andamento";
  }

  function pickEmpresaNome(empresa: any): string {
    return (
      empresa?.nome_comercial ||
      empresa?.nome_legal ||
      empresa?.nome ||
      "Empresa"
    );
  }

  async function resolverProfissionalIdPorAuthUid(authUid: string) {
    {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id")
        .eq("usuario_id", authUid)
        .maybeSingle<ProfRow>();

      if (error) {
        console.error(
          "[obras_ativas] erro ao buscar profissional por usuario_id:",
          error
        );
      }
      if (data?.id) return data.id;
    }

    {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id")
        .eq("auth_id", authUid)
        .maybeSingle<ProfRow>();

      if (error) {
        console.error(
          "[obras_ativas] erro ao buscar profissional por auth_id:",
          error
        );
      }
      if (data?.id) return data.id;
    }

    {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id")
        .eq("user_id", authUid)
        .maybeSingle<ProfRow>();

      if (error) {
        console.error(
          "[obras_ativas] erro ao buscar profissional por user_id:",
          error
        );
      }
      if (data?.id) return data.id;
    }

    return null;
  }

  useEffect(() => {
    if (!user) return;

    const carregar = async () => {
      setLoading(true);
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) {
          console.error(
            "[obras_ativas] erro ao supabase.auth.getUser():",
            authErr
          );
        }

        const authUid = authData?.user?.id;
        if (!authUid) {
          setMinhasObras([]);
          return;
        }

        const profissionalId = await resolverProfissionalIdPorAuthUid(authUid);

        if (!profissionalId) {
          setMinhasObras([]);
          return;
        }

        const { data: vincs, error: ev } = await supabase
          .from("profissionais_obras")
          .select("id, obra_id, funcao, status, progresso, empresa_id")
          .eq("profissional_id", profissionalId);

        if (ev || !vincs || vincs.length === 0) {
          if (ev) console.error("[obras_ativas] erro ao carregar vínculos:", ev);
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
              nome,
              nome_comercial,
              nome_legal
            )
          `
          )
          .in("id", obraIds);

        if (eo) {
          console.error("[obras_ativas] erro ao carregar obras:", eo);
          setMinhasObras([]);
          return;
        }

        const mapaObras = new Map((obras || []).map((o: any) => [o.id, o]));

        const obrasComDados =
          vincs?.map((v: any) => {
            const obra = mapaObras.get(v.obra_id);

            const empresaObj = obra?.empresa
              ? { id: obra.empresa.id, nome: pickEmpresaNome(obra.empresa) }
              : null;

            return {
              id: obra?.id ?? v.obra_id,
              nome: obra?.nome ?? "Obra sem nome",
              cidade: obra?.cidade ?? null,
              endereco:
                obra?.endereco ??
                (obra?.cidade ? obra.cidade : "Endereço não informado"),
              empresa: empresaObj,
              funcao: v.funcao || "Profissional",
              status: mapStatus(v.status),
              progresso: v.progresso ?? 0,

              empresa_id: obra?.empresa_id ?? v.empresa_id ?? null,
              data_inicio: obra?.data_inicio ?? null,
              data_fim: obra?.data_fim ?? null,
              descricao: obra?.descricao ?? null,
              latitude: obra?.latitude ?? null,
              longitude: obra?.longitude ?? null,
            };
          }) ?? [];

        setMinhasObras(obrasComDados);

        if (obraIdInicial) {
          const obra = obrasComDados.find((o: any) => o.id === obraIdInicial);
          if (obra) {
            setObraSelecionada(obra);
            setAbaAtiva("detalhes");
          } else {
            setAbaAtiva("lista");
          }

          if (typeof window !== "undefined") {
            localStorage.removeItem("prof_obras_ativas_obraId");
          }
          setObraIdInicial(null);
        }
      } catch (e) {
        console.error("[obras_ativas] erro inesperado ao carregar:", e);
        setMinhasObras([]);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [user, obraIdInicial]);

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

      const byStatus =
        filtroStatus === "Todas" ? true : o.status === filtroStatus;
      const byCidade =
        filtroCidade === "Todas" ? true : o.cidade === filtroCidade;
      const byEmpresa =
        filtroEmpresa === "Todas" ? true : o.empresa?.nome === filtroEmpresa;

      return byBusca && byStatus && byCidade && byEmpresa;
    });
  }, [busca, filtroStatus, filtroCidade, filtroEmpresa, minhasObras]);

  const kpiTotal = obrasFiltradas.length;
  const kpiMediaProgresso =
    obrasFiltradas.length > 0
      ? Math.round(
          obrasFiltradas.reduce(
            (a: number, o: any) => a + (o.progresso || 0),
            0
          ) / obrasFiltradas.length
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
        return (
          <RelatorioDoDiaForm obra={obraSelecionada} onVoltar={voltarLista} />
        );
      case "detalhes":
        return (
          <VerDetalhesObra
            obra={obraSelecionada}
            onIrPresenca={() => setAbaAtiva("presenca")}
            onIrRelatorio={() => setAbaAtiva("relatorio")}
            onIrChat={() => setAbaAtiva("chat")}
            onIrMapa={() => setAbaAtiva("mapa")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 relative w-full max-w-7xl mx-auto">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-7">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Minhas Obras
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                    Aqui estão as obras onde você está alocado.
                  </p>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-7">
              {[
                {
                  icon: (
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                  ),
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
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 truncate">
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
              {/* Mobile layout */}
              <div className="sm:hidden flex flex-col gap-3">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar obra, empresa ou local..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1b2332] text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex overflow-x-auto gap-2 pb-1">
                  {[
                    "Todas",
                    "A iniciar",
                    "Em andamento",
                    "Concluída",
                    "Atrasada",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFiltroStatus(s)}
                      className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap ${
                        filtroStatus === s
                          ? "bg-blue-600 text-white"
                          : "bg-[#f1f5f9] dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <select
                    value={filtroCidade}
                    onChange={(e) => setFiltroCidade(e.target.value)}
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#1b2332] text-gray-900 dark:text-gray-100"
                  >
                    {cidades.map((c, i) => (
                      <option key={i}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#1b2332] text-gray-900 dark:text-gray-100"
                  >
                    {empresas.map((e, i) => (
                      <option key={i}>{e}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Desktop layout */}
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
              // Mobile normal: 1 coluna; 2 colunas só em “mobile grande” (>=520px)
              <div className="grid gap-3 sm:gap-6 grid-cols-1 min-[520px]:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
                {obrasFiltradas.map((obra: any) => (
                  <motion.div
                    key={obra.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm sm:shadow-md hover:shadow-xl transition-all w-full"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {obra.nome || "Obra sem nome"}
                        </h2>

                        <p className="mt-0.5 flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 min-w-0">
                          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
                          <span className="truncate">
                            {obra.endereco || "Endereço não informado"}
                          </span>
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setObraSelecionada(obra);
                          setAbaAtiva("detalhes");
                        }}
                        className="text-blue-500 dark:text-blue-400 text-xs sm:text-sm hover:underline flex items-center gap-1 shrink-0"
                        aria-label="Ver detalhes"
                      >
                        <Eye size={14} /> Ver
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-2 gap-2">
                      <span
                        className={`font-medium px-2 py-1 rounded-full ${
                          statusCores[obra.status] ||
                          "bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {obra.status}
                      </span>
                      <span className="truncate min-w-0">
                        <UserCheck className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-emerald-500 dark:text-emerald-400" />
                        {obra.funcao}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${obra.progresso || 0}%` }}
                        transition={{ duration: 0.6 }}
                        className="bg-blue-500 h-full"
                      />
                    </div>

                    {/* Ações: MOBILE 2x2 (maior e legível) / DESKTOP 2x2 */}
                    <div className="mt-3 sm:mt-4">
                      {/* Mobile */}
                      <div className="sm:hidden grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setObraSelecionada(obra);
                            setAbaAtiva("presenca");
                          }}
                          className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
                        >
                          <CalendarCheck2 className="w-4 h-4" />
                          <span className="text-xs">Presença</span>
                        </button>

                        <button
                          onClick={() => {
                            setObraSelecionada(obra);
                            setAbaAtiva("relatorio");
                          }}
                          className="h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                        >
                          <BadgeCheck className="w-4 h-4" />
                          <span className="text-xs">Relatório</span>
                        </button>

                        <button
                          onClick={() => {
                            setObraSelecionada(obra);
                            setAbaAtiva("chat");
                          }}
                          className="h-10 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-[#344256] dark:hover:bg-[#3c4c64] text-gray-800 dark:text-white flex items-center justify-center gap-2 border border-zinc-200 dark:border-transparent"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-xs">Chat</span>
                        </button>

                        <button
                          onClick={() => {
                            setObraSelecionada(obra);
                            setAbaAtiva("mapa");
                          }}
                          className="h-10 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-[#263143] dark:hover:bg-[#2b3750] text-gray-800 dark:text-white flex items-center justify-center gap-2 border border-zinc-200 dark:border-transparent"
                        >
                          <Waypoints className="w-4 h-4" />
                          <span className="text-xs">Mapa</span>
                        </button>
                      </div>

                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={() => {
                            setObraSelecionada(obra);
                            setAbaAtiva("presenca");
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg py-2 flex items-center justify-center gap-2"
                        >
                          <CalendarCheck2 className="w-4 h-4" />
                          Presença
                        </button>

                        <button
                          onClick={() => {
                            setObraSelecionada(obra);
                            setAbaAtiva("relatorio");
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg py-2 flex items-center justify-center gap-2"
                        >
                          <BadgeCheck className="w-4 h-4" />
                          Relatório
                        </button>

                        <button
                          onClick={() => {
                            setObraSelecionada(obra);
                            setAbaAtiva("chat");
                          }}
                          className="bg-gray-100 hover:bg-gray-200 dark:bg-[#344256] dark:hover:bg-[#3c4c64] text-gray-800 dark:text-white text-sm rounded-lg py-2 flex items-center justify-center gap-2 border border-zinc-200 dark:border-transparent"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Chat
                        </button>

                        <button
                          onClick={() => {
                            setObraSelecionada(obra);
                            setAbaAtiva("mapa");
                          }}
                          className="bg-gray-100 hover:bg-gray-200 dark:bg-[#263143] dark:hover:bg-[#2b3750] text-gray-800 dark:text-white text-sm rounded-lg py-2 flex items-center justify-center gap-2 border border-zinc-200 dark:border-transparent"
                        >
                          <Waypoints className="w-4 h-4" />
                          Mapa
                        </button>
                      </div>
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
            className="w-full max-w-5xl mx-auto"
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
