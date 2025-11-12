// src/components/admin/Admindashboard/CentralDeNavegacaoAdmin/carreira/pages/RegrasNiveis.tsx
// ============================================================================
// ⚙️ Regras de Níveis – Painel do Administrador (versão completa)
// Mostra, cria, edita e exclui critérios da tabela career_criterion
// Integrado ao career_level via level_id
// ============================================================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  PlusCircle,
  Settings,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

type Nivel = {
  id: string;
  name: string;
  xp_step?: number;
  active?: boolean;
  sort_order?: number;
};

type Criterio = {
  id: string;
  level_id: string;
  kind: string;
  operator: string;
  value: string;
  required: boolean;
  meta: any;
  level_name?: string;
};

export default function RegrasNiveis() {
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [openDelete, setOpenDelete] = useState<null | string>(null);

  const [filtroNivel, setFiltroNivel] = useState("");

  const [form, setForm] = useState({
    id: "",
    level_id: "",
    kind: "",
    operator: ">=",
    value: "",
    required: true,
    meta_window: "",
  });

  // 🔹 Carrega níveis e critérios
  async function fetchData() {
    setLoading(true);
    try {
      const { data: levels } = await supabase
        .from("career_level")
        .select("id, name, xp_step, active, sort_order")
        .order("sort_order", { ascending: true });

      const { data: criteria } = await supabase
        .from("career_criterion")
        .select("*");

      const join = criteria.map((c: any) => {
        const lvl = levels.find((l) => l.id === c.level_id);
        return { ...c, level_name: lvl?.name || "—" };
      });

      setNiveis(levels);
      setCriterios(join);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // 🔹 Salva (criar ou editar)
  async function salvar() {
    if (!form.level_id || !form.kind || !form.value) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const meta = form.meta_window
      ? { window_days: Number(form.meta_window) }
      : null;

    if (editando) {
      const { error } = await supabase
        .from("career_criterion")
        .update({
          level_id: form.level_id,
          kind: form.kind,
          operator: form.operator,
          value: form.value,
          required: form.required,
          meta,
        })
        .eq("id", form.id);

      if (error) return toast.error("Erro ao atualizar critério");
      toast.success("Critério atualizado");
    } else {
      const { error } = await supabase.from("career_criterion").insert([
        {
          level_id: form.level_id,
          kind: form.kind,
          operator: form.operator,
          value: form.value,
          required: form.required,
          meta,
        },
      ]);
      if (error) return toast.error("Erro ao adicionar critério");
      toast.success("Critério adicionado");
    }

    setOpenModal(false);
    setEditando(false);
    await fetchData();
  }

  // 🔹 Editar
  function handleEdit(c: Criterio) {
    setForm({
      id: c.id,
      level_id: c.level_id,
      kind: c.kind,
      operator: c.operator,
      value: c.value,
      required: c.required,
      meta_window: c.meta?.window_days || "",
    });
    setEditando(true);
    setOpenModal(true);
  }

  // 🔹 Deletar
  async function handleDelete(id: string) {
    const { error } = await supabase
      .from("career_criterion")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Critério removido");
      await fetchData();
    }
    setOpenDelete(null);
  }

  // 🔹 Formata tipo
  const formatKind = (kind: string) => {
    const map: Record<string, string> = {
      xp_total: "XP Total",
      dias_ativos: "Dias Ativos",
      rating: "Avaliação Média",
      no_show: "Faltas (No-show)",
    };
    return map[kind] || kind;
  };

  const criteriosFiltrados = filtroNivel
    ? criterios.filter((c) => c.level_id === filtroNivel)
    : criterios;

  return (
    <div className="p-6 space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-500" />
            Regras de Níveis e Promoção
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Critérios que definem a progressão dos profissionais na carreira.
          </p>
        </div>
        <button
          onClick={() => {
            setEditando(false);
            setForm({
              id: "",
              level_id: "",
              kind: "",
              operator: ">=",
              value: "",
              required: true,
              meta_window: "",
            });
            setOpenModal(true);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          <PlusCircle className="w-4 h-4" /> Novo
        </button>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-blue-500" />
        <select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          className="border dark:border-gray-700 rounded-lg px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-sm"
        >
          <option value="">Todos os níveis</option>
          {niveis.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {loading ? (
          <p className="p-4 text-gray-500">Carregando...</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-4 py-2 text-left">Nível</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Operador</th>
                <th className="px-4 py-2 text-left">Valor</th>
                <th className="px-4 py-2 text-left">Janela</th>
                <th className="px-4 py-2 text-left">Obrigatório</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {criteriosFiltrados.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition"
                >
                  <td className="px-4 py-2 font-medium">{c.level_name}</td>
                  <td className="px-4 py-2">{formatKind(c.kind)}</td>
                  <td className="px-4 py-2">{c.operator}</td>
                  <td className="px-4 py-2">{c.value}</td>
                  <td className="px-4 py-2">
                    {c.meta?.window_days ? `${c.meta.window_days} dias` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {c.required ? "✅" : "⚪"}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(c)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => setOpenDelete(c.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Criação/Edição */}
      <AnimatePresence>
        {openModal && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editando ? "Editar Critério" : "Novo Critério"}
                </h3>
                <button
                  onClick={() => setOpenModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <select
                  value={form.level_id}
                  onChange={(e) =>
                    setForm({ ...form, level_id: e.target.value })
                  }
                  className="w-full rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
                >
                  <option value="">Selecione o nível</option>
                  {niveis.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>

                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  className="w-full rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
                >
                  <option value="">Tipo de regra</option>
                  <option value="xp_total">XP total</option>
                  <option value="dias_ativos">Dias ativos</option>
                  <option value="rating">Avaliação</option>
                  <option value="no_show">Faltas</option>
                </select>

                <div className="flex gap-3">
                  <select
                    value={form.operator}
                    onChange={(e) =>
                      setForm({ ...form, operator: e.target.value })
                    }
                    className="rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
                  >
                    <option value=">=">≥</option>
                    <option value="<=">≤</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Valor"
                    value={form.value}
                    onChange={(e) =>
                      setForm({ ...form, value: e.target.value })
                    }
                    className="flex-1 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
                  />
                </div>

                <input
                  type="number"
                  placeholder="Janela (dias)"
                  value={form.meta_window}
                  onChange={(e) =>
                    setForm({ ...form, meta_window: e.target.value })
                  }
                  className="w-full rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
                />

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.required}
                    onChange={(e) =>
                      setForm({ ...form, required: e.target.checked })
                    }
                    className="accent-blue-600 w-4 h-4"
                  />
                  Obrigatório
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setOpenModal(false)}
                  className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />{" "}
                  {editando ? "Salvar alterações" : "Salvar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação Delete */}
      <AnimatePresence>
        {openDelete && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700"
            >
              <p className="text-lg font-medium mb-3">
                Confirmar exclusão do critério?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setOpenDelete(null)}
                  className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(openDelete)}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
