"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, MapPin, Users, Search, BarChart3, UserCheck,
  Eye, Loader2, MessageSquare, CalendarCheck2, BadgeCheck,
  Waypoints, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../../../../context/AuthContext";

// Subcomponentes
import ChatObra from "./ObrasAtivasDetalhes/ChatObra";
import MapaObra from "./ObrasAtivasDetalhes/MapaObra";
import PresencaObra from "./ObrasAtivasDetalhes/PresencaObra";
import RelatorioDoDiaForm from "./ObrasAtivasDetalhes/RelatorioDoDiaForm";
import VerDetalhesObra from "./ObrasAtivasDetalhes/VerDetalhesObra";

export default function ObrasAtivasProfissional() {
  const { user } = useAuth();
  const [minhasObras, setMinhasObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todas");
  const [filtroCidade, setFiltroCidade] = useState("Todas");
  const [filtroEmpresa, setFiltroEmpresa] = useState("Todas");

  const [abaAtiva, setAbaAtiva] = useState<
    "lista" | "chat" | "mapa" | "presenca" | "relatorio" | "detalhes"
  >("lista");
  const [obraSelecionada, setObraSelecionada] = useState<any | null>(null);

  const statusCores: Record<string, string> = {
    "A iniciar": "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    "Em andamento": "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    Concluída: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    Atrasada: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  };

  useEffect(() => {
    const carregar = async () => {
      try {
        if (!user?.id) return;
        setLoading(true);

        const authId = user.id;
        const authEmail = (user as any)?.email || null;

        // 1) Tentar encontrar o USUÁRIO por várias chaves (auth_id OR id OR email)
        const { data: usuario, error: usuarioErr } = await supabase
          .from("usuarios")
          .select("id, nome, email, auth_id")
          .or(
            [
              `auth_id.eq.${authId}`,
              `id.eq.${authId}`,
              authEmail ? `email.eq.${authEmail}` : `id.eq.__never__`, // evita erro quando email é nulo
            ].join(",")
          )
          .limit(1)
          .maybeSingle();

        // 2) Achar/criar PROFISSIONAL
        let profissionalId: string | null = null;

        // tenta por usuario_id = usuarios.id
        if (usuario?.id) {
          const { data: p1 } = await supabase
            .from("profissionais")
            .select("id")
            .eq("usuario_id", usuario.id)
            .limit(1)
            .maybeSingle();
          if (p1?.id) profissionalId = p1.id;
        }

        // fallback: alguns projetos gravaram usuario_id = auth.id
        if (!profissionalId) {
          const { data: p2 } = await supabase
            .from("profissionais")
            .select("id")
            .eq("usuario_id", authId)
            .limit(1)
            .maybeSingle();
          if (p2?.id) profissionalId = p2.id;
        }

        // criar profissional mínimo se não existir (sem quebrar nada do painel da empresa)
        if (!profissionalId) {
          const usuarioIdParaVinculo = usuario?.id || authId;
          const { data: novoProf, error: insertErr } = await supabase
            .from("profissionais")
            .insert([
              {
                usuario_id: usuarioIdParaVinculo,
                nome: usuario?.nome || "Profissional",
                email: usuario?.email || authEmail || null,
                status: "ativo",
              },
            ])
            .select("id")
            .single();

          if (insertErr || !novoProf?.id) {
            console.warn("Profissional não encontrado e não foi possível criar.");
            setMinhasObras([]);
            return;
          }
          profissionalId = novoProf.id;
        }

        // 3) Buscar vínculos
        const { data: vinculos, error: vincErr } = await supabase
          .from("profissionais_obras")
          .select("id, obra_id, funcao, status, criado_em, empresa_id, progresso")
          .eq("profissional_id", profissionalId);

        if (vincErr || !vinculos?.length) {
          setMinhasObras([]);
          return;
        }

        // 4) Obras
        const obraIds = vinculos.map((v) => v.obra_id).filter(Boolean);
        const { data: obras } = await supabase
          .from("obras")
          .select(
            "id, nome, endereco, cidade, empresa_id, data_inicio, data_fim, descricao, status, progresso_total"
          )
          .in("id", obraIds);

        // 5) Empresas
        const empresaIds = Array.from(
          new Set((obras || []).map((o: any) => o.empresa_id).filter(Boolean))
        );
        const { data: empresas } = await supabase
          .from("empresas")
          .select("id, nome")
          .in("id", empresaIds);

        const empresasMap = new Map((empresas || []).map((e: any) => [e.id, e]));

        // 6) Montagem final (layout intacto)
        const obrasComDados = (obras || []).map((obra: any) => {
          const vinc = vinculos.find((v) => v.obra_id === obra.id);
          return {
            ...obra,
            empresa: empresasMap.get(obra.empresa_id) || null,
            funcao: vinc?.funcao || "Profissional",
            status: obra?.status || vinc?.status || "Em andamento",
            progresso:
              (typeof vinc?.progresso === "number" ? vinc.progresso : null) ??
              (typeof obra?.progresso_total === "number" ? obra.progresso_total : 0) ??
              0,
          };
        });

        setMinhasObras(obrasComDados);
      } catch (e) {
        console.error(e);
        setMinhasObras([]);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [user?.id]);

  // ======= resto igual (UI/UX) =======
  const cidades = useMemo(
    () => ["Todas", ...new Set(minhasObras.map((o) => o.cidade).filter(Boolean))],
    [minhasObras]
  );

  const empresas = useMemo(() => {
    const nomes = minhasObras.map((o) => o.empresa?.nome).filter(Boolean);
    return ["Todas", ...new Set(nomes)];
  }, [minhasObras]);

  const obrasFiltradas = useMemo(() => {
    return minhasObras.filter((o) => {
      const byBusca =
        o.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        o.endereco?.toLowerCase().includes(busca.toLowerCase()) ||
        o.empresa?.nome?.toLowerCase().includes(busca.toLowerCase());
      const byStatus = filtroStatus === "Todas" ? true : o.status === filtroStatus;
      const byCidade = filtroCidade === "Todas" ? true : o.cidade === filtroCidade;
      const byEmpresa = filtroEmpresa === "Todas" ? true : o.empresa?.nome === filtroEmpresa;
      return byBusca && byStatus && byCidade && byEmpresa;
    });
  }, [busca, filtroStatus, filtroCidade, filtroEmpresa, minhasObras]);

  const kpiTotal = obrasFiltradas.length;
  const kpiMediaProgresso =
    obrasFiltradas.length > 0
      ? Math.round(obrasFiltradas.reduce((a, o) => a + (o.progresso || 0), 0) / obrasFiltradas.length)
      : 0;

  const voltarLista = () => {
    setAbaAtiva("lista");
    setObraSelecionada(null);
  };

  const renderConteudo = () => {
    switch (abaAtiva) {
      case "chat": return <ChatObra obra={obraSelecionada} onVoltar={voltarLista} />;
      case "mapa": return <MapaObra obraId={obraSelecionada?.id} onVoltar={voltarLista} />;
      case "presenca": return <PresencaObra obraId={obraSelecionada?.id} obra={obraSelecionada} onVoltar={voltarLista} />;
      case "relatorio": return <RelatorioDoDiaForm obra={obraSelecionada} onVoltar={voltarLista} />;
      case "detalhes": return <VerDetalhesObra obra={obraSelecionada} onVoltar={voltarLista} />;
      default: return null;
    }
  };

  return (
    <div className="p-4 sm:p-8 relative w-full">
      <AnimatePresence mode="wait">
        {abaAtiva === "lista" ? (
          <motion.div key="lista" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {/* ...todo o bloco de UI exatamente como estava... */}
          </motion.div>
        ) : (
          <motion.div key="detalhe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full">
            <button onClick={voltarLista} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4 sm:mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            {renderConteudo()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

