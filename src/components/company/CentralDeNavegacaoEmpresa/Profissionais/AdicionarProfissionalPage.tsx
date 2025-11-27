// src/components/company/Profissionais.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Star,
  MapPin,
  Briefcase,
  Award,
  Flame,
  Hammer,
  ShieldCheck,
  Wrench,
  Zap,
  Paintbrush,
  HardHat,
  Building2,
  UsersRound,
  Globe2,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profissional = {
  id: string;
  nome: string;
  funcao: string;
  cidade: string;
  nivel: string;
  avaliacao: number;
  obras: number;
  experiencia: number;
  disponibilidade: string;
  foto_url: string;
  capa_url: string;
  descricao: string;
};

export default function Profissionais() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("todas");
  const [filtroFuncao, setFiltroFuncao] = useState("todas");
  const [filtroNivel, setFiltroNivel] = useState("todos");

  // alternar entre base global e equipa da empresa
  const [modoEmpresa, setModoEmpresa] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // —— lê o state vindo de Equipas
  const fromObra = Boolean((location.state as any)?.fromObra);
  const backTo: string | undefined = (location.state as any)?.backTo;

  useEffect(() => {
    const data: Profissional[] = [
      {
        id: "1",
        nome: "João Ferreira",
        funcao: "Canalizador",
        cidade: "Cascais",
        nivel: "Oficial",
        avaliacao: 4.8,
        obras: 12,
        experiencia: 6,
        disponibilidade: "Disponível",
        foto_url: "https://randomuser.me/api/portraits/men/44.jpg",
        capa_url:
          "https://images.unsplash.com/photo-1616627451873-bc1b3c48ffcd?auto=format&fit=crop&w=800&q=60",
        descricao:
          "Instalações e reparações hidráulicas em obras residenciais e comerciais.",
      },
      {
        id: "2",
        nome: "Pedro Almeida",
        funcao: "Eletricista",
        cidade: "Lisboa",
        nivel: "Mestre",
        avaliacao: 4.9,
        obras: 27,
        experiencia: 10,
        disponibilidade: "Em obra",
        foto_url: "https://randomuser.me/api/portraits/men/67.jpg",
        capa_url:
          "https://images.unsplash.com/photo-1604147706283-360c79c3d3a0?auto=format&fit=crop&w=800&q=60",
        descricao:
          "Eletricista certificado com especialização em sistemas industriais e prediais.",
      },
      {
        id: "3",
        nome: "Carla Nunes",
        funcao: "Pintora",
        cidade: "Porto",
        nivel: "Profissional",
        avaliacao: 4.7,
        obras: 9,
        experiencia: 4,
        disponibilidade: "Disponível",
        foto_url: "https://randomuser.me/api/portraits/women/68.jpg",
        capa_url:
          "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=60",
        descricao:
          "Especialista em pintura decorativa e acabamento fino de interiores.",
      },
      {
        id: "4",
        nome: "Carlos Pinto",
        funcao: "Pedreiro",
        cidade: "Sintra",
        nivel: "Profissional",
        avaliacao: 4.6,
        obras: 18,
        experiencia: 7,
        disponibilidade: "Disponível",
        foto_url: "https://randomuser.me/api/portraits/men/79.jpg",
        capa_url:
          "https://images.unsplash.com/photo-1581093458791-9b6c26fa2a67?auto=format&fit=crop&w=800&q=60",
        descricao:
          "Experiente em alvenaria estrutural, assentamento e acabamentos de obra.",
      },
    ];
    setProfissionais(data);
  }, []);

  // IDs dos profissionais vinculados à empresa (simulação por enquanto)
  const idsDaEmpresa = ["1", "3"];

  const filtrados = profissionais.filter((p) => {
    const combinaBusca =
      busca === "" ||
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.funcao.toLowerCase().includes(busca.toLowerCase());

    const combinaCidade = filtroCidade === "todas" || p.cidade === filtroCidade;
    const combinaFuncao = filtroFuncao === "todas" || p.funcao === filtroFuncao;
    const combinaNivel = filtroNivel === "todos" || p.nivel === filtroNivel;

    // quando modoEmpresa = true, mostra apenas quem está vinculado
    const pertenceEmpresa = !modoEmpresa || idsDaEmpresa.includes(p.id);

    return (
      combinaBusca &&
      combinaCidade &&
      combinaFuncao &&
      combinaNivel &&
      pertenceEmpresa
    );
  });

  const badgeCor = (nivel: string) => {
    switch (nivel) {
      case "Mestre":
        return "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md";
      case "Oficial":
        return "bg-blue-600 text-white";
      case "Profissional":
        return "bg-green-600 text-white";
      case "Auxiliar":
        return "bg-yellow-400 text-slate-800";
      default:
        return "bg-slate-400 text-white";
    }
  };

  const iconeFuncao = (funcao: string) => {
    if (funcao.toLowerCase().includes("canal"))
      return <Wrench className="w-4 h-4" />;
    if (funcao.toLowerCase().includes("eletric"))
      return <Zap className="w-4 h-4" />;
    if (funcao.toLowerCase().includes("pint"))
      return <Paintbrush className="w-4 h-4" />;
    if (funcao.toLowerCase().includes("pedr"))
      return <Hammer className="w-4 h-4" />;
    return <HardHat className="w-4 h-4" />;
  };

  return (
    <div className="p-6 md:p-10">
      {/* Voltar quando veio de uma obra */}
      {fromObra && (
        <div className="mb-4">
          <button
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para a obra
          </button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {modoEmpresa ? "Profissionais da Minha Empresa" : "Base Acrobatas"}
          </h1>
          <p className="text-slate-500 text-sm">
            {modoEmpresa
              ? "Profissionais já vinculados à sua empresa."
              : "Explore profissionais verificados e encontre a equipa ideal para sua obra."}
          </p>
        </div>

        {/* Busca */}
        <div className="mt-4 md:mt-0 flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-sm">
          <input
            type="text"
            placeholder="Pesquisar por nome ou função..."
            className="bg-transparent outline-none text-sm w-64 text-slate-700 dark:text-slate-100"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Toggle Base / Empresa */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setModoEmpresa(false)}
          className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
            !modoEmpresa
              ? "bg-blue-600 text-white"
              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          }`}
        >
          <Globe2 className="w-4 h-4" />
          Base Acrobatas
        </button>

        <button
          onClick={() => setModoEmpresa(true)}
          className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
            modoEmpresa
              ? "bg-blue-600 text-white"
              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          }`}
        >
          <UsersRound className="w-4 h-4" />
          Minha Equipa
        </button>
      </div>

      {/* Filtros (escondidos quando em modo empresa) */}
      {!modoEmpresa && (
        <div className="flex flex-wrap gap-3 mb-8">
          <select
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm"
            value={filtroCidade}
            onChange={(e) => setFiltroCidade(e.target.value)}
          >
            <option value="todas">Todas as cidades</option>
            <option value="Lisboa">Lisboa</option>
            <option value="Cascais">Cascais</option>
            <option value="Porto">Porto</option>
            <option value="Sintra">Sintra</option>
          </select>

          <select
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm"
            value={filtroFuncao}
            onChange={(e) => setFiltroFuncao(e.target.value)}
          >
            <option value="todas">Todas as funções</option>
            <option value="Canalizador">Canalizador</option>
            <option value="Eletricista">Eletricista</option>
            <option value="Pintora">Pintora</option>
            <option value="Pedreiro">Pedreiro</option>
          </select>

          <select
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm"
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
          >
            <option value="todos">Todos os níveis</option>
            <option value="Aprendiz">Aprendiz</option>
            <option value="Profissional">Profissional</option>
            <option value="Oficial">Oficial</option>
            <option value="Mestre">Mestre</option>
          </select>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtrados.map((p) => (
          <motion.div
            key={p.id}
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 150 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-lg overflow-hidden flex flex-col transition-all"
          >
            <div
              className="h-24 bg-cover bg-center relative"
              style={{ backgroundImage: `url(${p.capa_url})` }}
            >
              <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
              <div className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2">
                <img
                  src={p.foto_url}
                  alt={p.nome}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
                />
              </div>
            </div>

            <div className="pt-10 pb-5 px-4 text-center">
              <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm mb-1">
                {iconeFuncao(p.funcao)}
                <span>{p.funcao}</span>
              </div>

              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {p.nome}
              </h2>
              <p className="text-slate-400 text-xs italic mb-1">{p.descricao}</p>

              <div className="flex items-center justify-center gap-1 mt-1 text-yellow-500">
                <Star className="w-4 h-4 fill-yellow-500" />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {p.avaliacao.toFixed(1)}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1 mt-1 text-slate-500 dark:text-slate-400 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{p.cidade}</span>
              </div>

              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    p.disponibilidade === "Disponível"
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {p.disponibilidade}
                </span>

                <span
                  className={`text-xs px-3 py-1 rounded-full font-semibold ${badgeCor(
                    p.nivel
                  )} flex items-center gap-1`}
                >
                  {p.nivel === "Mestre" && <Flame className="w-3 h-3" />}
                  {p.nivel === "Oficial" && <Award className="w-3 h-3" />}
                  {p.nivel === "Profissional" && <Hammer className="w-3 h-3" />}
                  {p.nivel}
                </span>
              </div>

              <div className="flex justify-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" /> {p.obras} obras
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" /> {p.experiencia} anos
                </div>
              </div>

              <button
                onClick={() => navigate(`/empresa/profissional/${p.id}`)}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-blue-700 transition-all"
              >
                <ShieldCheck className="w-4 h-4" /> Ver Perfil
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
