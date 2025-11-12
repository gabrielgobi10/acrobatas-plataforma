// src/pages/Outros/Notificacoes.tsx
import { useEffect, useState } from "react";
import { Bell, Check, Filter, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "pedido" | "profissional" | "documento" | "financeiro" | "sistema";
  lida: boolean;
  data: string;
  link?: string | null;
};

const cores = {
  pedido: "border-blue-500",
  profissional: "border-yellow-500",
  documento: "border-red-500",
  financeiro: "border-green-500",
  sistema: "border-gray-500",
};

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [filtro, setFiltro] = useState<string>("todas");

  useEffect(() => {
    buscarNotificacoes();
  }, []);

  async function buscarNotificacoes() {
    const { data } = await supabase
      .from("notificacoes_empresa")
      .select("*")
      .order("data", { ascending: false });
    setNotificacoes(data || []);
  }

  async function marcarComoLida(id: string) {
    await supabase.from("notificacoes_empresa").update({ lida: true }).eq("id", id);
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
  }

  async function marcarTodasLidas() {
    await supabase.from("notificacoes_empresa").update({ lida: true }).eq("lida", false);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  }

  async function limparAntigas() {
    await supabase.from("notificacoes_empresa").delete().eq("lida", true);
    setNotificacoes((prev) => prev.filter((n) => !n.lida));
  }

  const filtradas =
    filtro === "todas"
      ? notificacoes
      : notificacoes.filter((n) => n.tipo === filtro);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        <Bell className="text-blue-500" /> Notificações
      </h1>

      {/* Ações topo */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {["todas", "pedido", "profissional", "documento", "financeiro", "sistema"].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltro(tipo)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                filtro === tipo
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {tipo === "todas"
                ? "Todas"
                : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={marcarTodasLidas}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1"
          >
            <Check className="w-4 h-4" /> Marcar todas como lidas
          </button>
          <button
            onClick={limparAntigas}
            className="text-sm border border-gray-500 dark:border-gray-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-white/10"
          >
            <Trash2 className="w-4 h-4" /> Limpar antigas
          </button>
        </div>
      </div>

      {/* Lista de notificações */}
      <div className="space-y-3">
        {filtradas.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            Nenhuma notificação encontrada.
          </div>
        )}

        {filtradas.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border-l-4 ${cores[n.tipo]} rounded-xl bg-white/60 dark:bg-white/5 p-4 shadow-sm`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3
                  className={`font-medium ${
                    n.lida ? "text-gray-500" : "text-gray-900 dark:text-white"
                  }`}
                >
                  {n.titulo}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {n.mensagem}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.data).toLocaleDateString("pt-PT")}
                </p>
              </div>
              <div className="flex gap-2">
                {!n.lida ? (
                  <button
                    onClick={() => marcarComoLida(n.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Marcar como lida
                  </button>
                ) : (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Lida
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
