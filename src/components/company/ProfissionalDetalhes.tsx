import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Phone, Mail, MapPin, BadgeCheck, Calendar, Briefcase, Globe2, Star, UserCog, Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profissional = {
  id: string;
  usuario_id: string;
  empresa_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  area: string | null;
  experiencia: number | null;
  disponibilidade: boolean | null;
  avaliacao: number | null;
  foto_url: string | null;
  cidade: string | null;
  pais: string | null;
  documentacao_ok: boolean | null;
  status: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  nivel: string | null;
};

type Perfil = {
  id: string; // mesmo id do profissional
  area_principal: string | null;
  nivel: string | null;
  anos_experiencia: number | null;
  disponibilidade: string | null; // na tabela perfil está text
  funcao_obra: string | null;
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  nacionalidade: string | null;
  idiomas: string[] | null;
  cidade_base: string | null;
  pode_viajar: boolean | null;
  pode_alojamento: boolean | null;
  raio_deslocacao: string | null;
  habilidades: string[] | null;
  status_perfil: string | null;
  progresso: number | null;
  perfil_completo: boolean | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

type Vinculo = {
  id: string;
  obra_id: string;
  status: string | null;
  data_inicio: string | null;
  data_fim: string | null;
};

type Obra = { id: string; nome: string | null; cidade?: string | null };

export default function ProfissionalPerfil() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [prof, setProf] = useState<Profissional | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [vinculos, setVinculos] = useState<(Vinculo & { obra_nome?: string })[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        // 1) profissionais
        const { data: p, error: eP } = await supabase
          .from("profissionais")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (eP) throw eP;
        setProf(p as Profissional);

        // 2) profissionais_perfil (id = profissional.id)
        const { data: perf, error: ePerf } = await supabase
          .from("profissionais_perfil")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (ePerf) throw ePerf;
        setPerfil(perf as Perfil);

        // 3) vínculos e nomes das obras
        const { data: vincs, error: eV } = await supabase
          .from("profissionais_obras")
          .select("id, obra_id, status, data_inicio, data_fim")
          .eq("profissional_id", id);
        if (eV) throw eV;

        const obraIds = Array.from(
          new Set((vincs ?? []).map((v: any) => v.obra_id).filter(Boolean))
        ) as string[];

        const obrasById = new Map<string, string>();
        if (obraIds.length) {
          const { data: obras, error: eOb } = await supabase
            .from("obras")
            .select("id, nome")
            .in("id", obraIds);
          if (eOb) throw eOb;
          (obras as Obra[] ?? []).forEach((o) => o?.id && obrasById.set(o.id, o.nome ?? "—"));
        }

        const vincsComNome = (vincs ?? []).map((v: any) => ({
          ...v,
          obra_nome: obrasById.get(v.obra_id) ?? "—",
        }));

        setVinculos(vincsComNome);
      } catch (e: any) {
        setErro(e?.message ?? "Falha ao carregar perfil.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const idiomasFmt = useMemo(
    () => (perfil?.idiomas?.length ? perfil.idiomas.join(", ") : "—"),
    [perfil?.idiomas]
  );
  const habilidadesFmt = useMemo(
    () => (perfil?.habilidades?.length ? perfil.habilidades.join(", ") : "—"),
    [perfil?.habilidades]
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-40 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-40 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-40 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-4 sm:p-6 text-red-600">
        Erro: {erro}
      </div>
    );
  }

  if (!prof) {
    return (
      <div className="p-4 sm:p-6">
        <button
          onClick={() => nav(-1)}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <p className="mt-4 text-sm text-gray-500">Profissional não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-violet-600 to-blue-500 text-white p-5 rounded-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{prof.nome}</h1>
            <p className="text-sm opacity-90">
              {perfil?.funcao_obra || prof.area || "—"} • {prof.nivel || perfil?.nivel || "—"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1">
              <Star size={16} /> {Number(prof.avaliacao ?? 0).toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1">
              <BadgeCheck size={16} /> {prof.documentacao_ok ? "Docs OK" : "Docs pendentes"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Contatos / Local / Disponibilidade */}
        <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <UserCog size={18} /> Informações básicas
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-gray-500" /> {prof.email || perfil?.email || "—"}
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-gray-500" /> {prof.telefone || perfil?.telefone || "—"}
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-500" /> {prof.cidade || perfil?.cidade_base || "—"} {prof.pais ? `• ${prof.pais}` : ""}
            </div>
            <div className="flex items-center gap-2">
              <Briefcase size={16} className="text-gray-500" /> Experiência: {prof.experiencia ?? perfil?.anos_experiencia ?? "—"} {((prof.experiencia ?? perfil?.anos_experiencia) != null) ? "anos" : ""}
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" /> Criado em: {prof.criado_em ? new Date(prof.criado_em).toLocaleDateString() : "—"}
            </div>
            <div className="flex items-center gap-2">
              <Globe2 size={16} className="text-gray-500" /> Idiomas: {idiomasFmt}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-500">Habilidades</p>
            <p className="text-sm">{habilidadesFmt}</p>
          </div>
        </div>

        {/* Coluna 2: Perfil Profundo */}
        <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3">Perfil Profissional</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Área principal</p>
              <p>{perfil?.area_principal || prof.area || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">Função/Obra</p>
              <p>{perfil?.funcao_obra || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">Nível</p>
              <p>{perfil?.nivel || prof.nivel || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">Disponibilidade</p>
              <p>
                {typeof prof.disponibilidade === "boolean"
                  ? (prof.disponibilidade ? "Disponível" : "Indisponível")
                  : (perfil?.disponibilidade || "—")}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Pode viajar</p>
              <p>{perfil?.pode_viajar === null ? "—" : perfil?.pode_viajar ? "Sim" : "Não"}</p>
            </div>
            <div>
              <p className="text-gray-500">Alojamento</p>
              <p>{perfil?.pode_alojamento === null ? "—" : perfil?.pode_alojamento ? "Aceita" : "Não"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500">Raio de deslocação</p>
              <p>{perfil?.raio_deslocacao || "—"}</p>
            </div>
          </div>
        </div>

        {/* Coluna 3: Vínculos/Obras */}
        <div className="bg-white dark:bg-slate-900/70 border border-gray-100 dark:border-slate-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Building2 size={18}/> Vínculos em Obras
          </h2>
          {vinculos.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum vínculo encontrado.</p>
          ) : (
            <ul className="space-y-2">
              {vinculos.map((v) => (
                <li key={v.id} className="border border-gray-100 dark:border-slate-800 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{v.obra_nome}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs text-white ${v.status === "Ativo" ? "bg-emerald-600" : "bg-gray-500"}`}>
                      {v.status ?? "—"}
                    </span>
                  </div>
                  <p className="text-gray-500">
                    {v.data_inicio ? `Início: ${new Date(v.data_inicio).toLocaleDateString()}` : "Início: —"}
                    {v.data_fim ? ` • Fim: ${new Date(v.data_fim).toLocaleDateString()}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
