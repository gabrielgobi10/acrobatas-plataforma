import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
  Building2,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

type PoliticaValor = {
  id?: string;
  tipo_profissional: string;
  nivel: string;
  valor_profissional_min: number;
  valor_profissional_max: number;
  valor_empresa_min: number;
  valor_empresa_max: number;
  margem: number;
};

const NIVEIS = [
  "Aprendiz",
  "Auxiliar",
  "Profissional",
  "Oficial",
  "Encarregado",
  "Mestre",
];

export default function ConfiguracoesAvancadas() {
  const [valores, setValores] = useState<PoliticaValor[]>([]);
  const [profissoes, setProfissoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroProfissao, setFiltroProfissao] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");

  // 🔹 Buscar profissões já cadastradas
  useEffect(() => {
    async function carregarProfissoes() {
      const { data, error } = await supabase
        .from("politica_valores")
        .select("tipo_profissional");
      if (!error && data) {
        const unicos = Array.from(
          new Set(data.map((p: any) => p.tipo_profissional).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));
        setProfissoes(unicos);
      }
    }
    carregarProfissoes();
  }, []);

  // 🔹 Buscar dados da tabela principal
  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data, error } = await supabase
        .from("politica_valores")
        .select("*")
        .order("tipo_profissional", { ascending: true })
        .order("nivel", { ascending: true });
      if (error) {
        console.error("Erro ao carregar valores:", error);
        toast.error("Erro ao carregar dados");
      } else setValores(data || []);
      setLoading(false);
    }
    carregar();
  }, []);

  // 🔹 Salvar linha
  async function salvarLinha(item: PoliticaValor) {
    if (!item.tipo_profissional || !item.nivel) {
      toast.error("Preencha o tipo e o nível.");
      return;
    }

    // calcula margem automaticamente antes de salvar
    const margemCalc =
      item.valor_empresa_min > 0 && item.valor_profissional_min > 0
        ? (((item.valor_empresa_min - item.valor_profissional_min) /
            item.valor_empresa_min) *
            100).toFixed(1)
        : item.margem;

    const payload = {
      ...item,
      margem: parseFloat(margemCalc as any) || 0,
    };

    let res;
    if (item.id) {
      res = await supabase.from("politica_valores").update(payload).eq("id", item.id);
    } else {
      res = await supabase.from("politica_valores").insert([payload]);
    }

    if (res.error) {
      console.error(res.error);
      toast.error("Erro ao salvar.");
    } else {
      toast.success("Salvo com sucesso!");
      setEditando(null);
    }
  }

  // 🔹 Excluir linha
  async function excluir(id: string) {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    const { error } = await supabase.from("politica_valores").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      setValores((prev) => prev.filter((v) => v.id !== id));
      toast.success("Excluído");
    }
  }

  // 🔹 Nova linha
  function novaLinha() {
    setValores((v) => [
      {
        tipo_profissional: "",
        nivel: NIVEIS[0],
        valor_profissional_min: 0,
        valor_profissional_max: 0,
        valor_empresa_min: 0,
        valor_empresa_max: 0,
        margem: 40,
      },
      ...v,
    ]);
    setEditando("novo");
  }

  // 🔹 Cálculo dinâmico da margem ao editar
  const calcularMargem = (prof: number, emp: number) => {
    if (emp <= 0) return 0;
    const val = ((emp - prof) / emp) * 100;
    return isNaN(val) ? 0 : parseFloat(val.toFixed(1));
  };

  // 🔹 Filtro inteligente
  const filtrados = valores.filter((v) => {
    const buscaTexto =
      v.tipo_profissional.toLowerCase().includes(busca.toLowerCase()) ||
      v.nivel.toLowerCase().includes(busca.toLowerCase());

    const filtroPorProfissao = filtroProfissao
      ? v.tipo_profissional === filtroProfissao
      : true;
    const filtroPorNivel = filtroNivel ? v.nivel === filtroNivel : true;

    return buscaTexto && filtroPorProfissao && filtroPorNivel;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <motion.h1
            className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Building2 className="text-blue-500" /> Política de Valores
          </motion.h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Configure quanto a empresa paga e quanto o profissional recebe — por nível e profissão.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar..."
              className="pl-8 pr-3 py-2 rounded-lg bg-white dark:bg-[#1e2a3a] border border-gray-200 dark:border-[#1f2a37] text-sm"
            />
          </div>
          <button
            onClick={novaLinha}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg shadow"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 border p-3 rounded-lg bg-gray-50 dark:bg-[#1f2a37] shadow-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
          <Filter size={16} />
          Filtros:
        </div>

        <select
          value={filtroProfissao}
          onChange={(e) => setFiltroProfissao(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-[#1e2a3a] text-sm"
        >
          <option value="">Todas as profissões</option>
          {profissoes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-[#1e2a3a] text-sm"
        >
          <option value="">Todos os níveis</option>
          {NIVEIS.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>

        {(filtroProfissao || filtroNivel) && (
          <button
            onClick={() => {
              setFiltroProfissao("");
              setFiltroNivel("");
            }}
            className="text-xs text-red-500 hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl shadow border border-gray-200 dark:border-[#1f2a37]">
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-gray-100 dark:bg-[#1f2a37] text-gray-700 dark:text-gray-300">
            <tr>
              <th className="px-3 py-2 text-left">Profissão</th>
              <th className="px-3 py-2 text-left">Nível</th>
              <th className="px-3 py-2">💶 Prof. Mín</th>
              <th className="px-3 py-2">💶 Prof. Máx</th>
              <th className="px-3 py-2">🏗️ Empresa Mín</th>
              <th className="px-3 py-2">🏗️ Empresa Máx</th>
              <th className="px-3 py-2">% Margem</th>
              <th className="px-3 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#141b26]">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500" />
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-gray-500 dark:text-gray-400 py-6"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((item, i) => {
                const margemAuto = calcularMargem(
                  item.valor_profissional_min,
                  item.valor_empresa_min
                );

                return (
                  <tr
                    key={item.id || i}
                    className="border-t border-gray-100 dark:border-[#1f2a37] hover:bg-gray-50 dark:hover:bg-[#1f2a37] transition"
                  >
                    {/* Profissão */}
                    <td className="px-3 py-2">
                      {editando === item.id || (editando === "novo" && !item.id) ? (
                        <select
                          value={item.tipo_profissional}
                          onChange={(e) =>
                            setValores((prev) =>
                              prev.map((v, idx) =>
                                idx === i ? { ...v, tipo_profissional: e.target.value } : v
                              )
                            )
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-[#1e2a3a]"
                        >
                          <option value="">Selecione...</option>
                          {profissoes.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-medium">{item.tipo_profissional}</span>
                      )}
                    </td>

                    {/* Nível */}
                    <td className="px-3 py-2">
                      {editando === item.id || (editando === "novo" && !item.id) ? (
                        <select
                          value={item.nivel}
                          onChange={(e) =>
                            setValores((prev) =>
                              prev.map((v, idx) =>
                                idx === i ? { ...v, nivel: e.target.value } : v
                              )
                            )
                          }
                          className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-[#1e2a3a]"
                        >
                          {NIVEIS.map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      ) : (
                        <span>{item.nivel}</span>
                      )}
                    </td>

                    {/* Valores e Margem */}
                    {[
                      "valor_profissional_min",
                      "valor_profissional_max",
                      "valor_empresa_min",
                      "valor_empresa_max",
                    ].map((campo) => (
                      <td key={campo} className="px-3 py-2 text-center">
                        {editando === item.id || (editando === "novo" && !item.id) ? (
                          <input
                            type="number"
                            step="0.1"
                            value={(item as any)[campo]}
                            onChange={(e) =>
                              setValores((prev) =>
                                prev.map((v, idx) =>
                                  idx === i
                                    ? {
                                        ...v,
                                        [campo]: parseFloat(e.target.value) || 0,
                                        margem: calcularMargem(
                                          campo.includes("prof")
                                            ? parseFloat(e.target.value)
                                            : v.valor_profissional_min,
                                          campo.includes("emp")
                                            ? parseFloat(e.target.value)
                                            : v.valor_empresa_min
                                        ),
                                      }
                                    : v
                                )
                              )
                            }
                            className="w-20 text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-[#1e2a3a]"
                          />
                        ) : (
                          <span>
                            {(item as any)[campo].toFixed
                              ? (item as any)[campo].toFixed(2)
                              : (item as any)[campo]}
                          </span>
                        )}
                      </td>
                    ))}

                    {/* Margem */}
                    <td
                      className={`px-3 py-2 text-center font-semibold ${
                        margemAuto > 40
                          ? "text-emerald-500"
                          : margemAuto > 30
                          ? "text-yellow-500"
                          : "text-red-500"
                      }`}
                    >
                      {margemAuto.toFixed(1)}%
                    </td>

                    {/* Ações */}
                    <td className="px-3 py-2 text-center">
                      {editando === item.id || (editando === "novo" && !item.id) ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => salvarLinha(item)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            onClick={() => setEditando(null)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setEditando(item.id!)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => excluir(item.id!)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

