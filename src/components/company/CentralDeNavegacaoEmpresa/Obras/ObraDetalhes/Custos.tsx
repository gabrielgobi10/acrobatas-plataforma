// src/components/company/CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Custos.tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Wallet, Clock, Users } from "lucide-react";

type Profissional = {
  id: string;
  nome: string;
  area?: string | null;
  funcao?: string | null;
  foto_url?: string | null;
  valor_dia?: number | null;
  horas?: number | null;
};

export default function Custos({ obraId }: { obraId: string }) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [valorHoraEmpresa, setValorHoraEmpresa] = useState<number>(0);
  const [totalHoras, setTotalHoras] = useState<number>(0);
  const [totalFaturado, setTotalFaturado] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  async function carregarDados() {
    if (!obraId) return;
    setLoading(true);
    try {
      const { data: obraData, error: erroObra } = await supabase
        .from("obras")
        .select("valor_hora_empresa")
        .eq("id", obraId)
        .single();
      if (erroObra) throw erroObra;

      const valorHora = obraData?.valor_hora_empresa || 0;
      setValorHoraEmpresa(valorHora);

      const { data: vinculos, error: erroProf } = await supabase
        .from("profissionais_obras")
        .select(`
          id,
          funcao,
          profissionais!fk_profissional_obra (
            id,
            nome,
            area,
            foto_url,
            valor_dia
          )
        `)
        .eq("obra_id", obraId);
      if (erroProf) throw erroProf;

      const { data: relatorios } = await supabase
        .from("relatorios_dia")
        .select("profissional_id, horas_trabalhadas, obra_id")
        .eq("obra_id", obraId);

      const lista: Profissional[] = (vinculos || []).map((v) => {
        const horasTotais =
          relatorios
            ?.filter((r) => r.profissional_id === v.profissionais.id)
            ?.reduce((acc, r) => acc + (r.horas_trabalhadas || 0), 0) || 0;
        return {
          id: v.profissionais.id,
          nome: v.profissionais.nome,
          area: v.profissionais.area,
          foto_url: v.profissionais.foto_url,
          valor_dia: v.profissionais.valor_dia,
          horas: horasTotais,
          funcao: v.funcao,
        };
      });

      const somaHoras = lista.reduce((acc, p) => acc + (p.horas || 0), 0);
      const totalFaturadoCalc = somaHoras * valorHora;

      setProfissionais(lista);
      setTotalHoras(somaHoras);
      setTotalFaturado(totalFaturadoCalc);
    } catch (err) {
      console.error("❌ Erro ao carregar custos:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, [obraId]);

  const formatar = (v: number) =>
    v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

  return (
    <div className="w-full flex flex-col gap-6 sm:gap-8 p-3 sm:p-6">
      {/* ==================== RESUMO ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <ResumoCard
          icon={<Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />}
          titulo="Valor Faturado"
          valor={formatar(totalFaturado)}
        />
        <ResumoCard
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />}
          titulo="Total de Horas"
          valor={`${totalHoras.toFixed(1)} h`}
        />
        <ResumoCard
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />}
          titulo="Valor por Hora"
          valor={formatar(valorHoraEmpresa)}
        />
      </div>

      {/* ==================== TABELA ==================== */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
          <h2 className="text-sm sm:text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            Custos de Mão de Obra
          </h2>
        </div>

        {loading ? (
          <div className="p-5 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            A carregar dados...
          </div>
        ) : profissionais.length === 0 ? (
          <div className="p-5 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            Nenhum registo encontrado para esta obra.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs sm:text-sm min-w-[600px]">
              <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <tr>
                  <th className="text-left p-3 font-medium">Profissional</th>
                  <th className="text-left p-3 font-medium">Função</th>
                  <th className="text-center p-3 font-medium">Horas</th>
                  <th className="text-center p-3 font-medium">€/Hora</th>
                  <th className="text-right p-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {profissionais.map((p) => {
                  const total = (p.horas || 0) * valorHoraEmpresa;
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="p-3 flex items-center gap-3 text-zinc-800 dark:text-zinc-200 font-medium">
                        <img
                          src={
                            p.foto_url ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              p.nome || "?"
                            )}`
                          }
                          alt={p.nome}
                          className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover"
                        />
                        <span className="truncate max-w-[140px] sm:max-w-none">{p.nome}</span>
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">
                        {p.funcao || p.area || "-"}
                      </td>
                      <td className="p-3 text-center text-zinc-700 dark:text-zinc-300">
                        {p.horas?.toFixed(1)}
                      </td>
                      <td className="p-3 text-center text-zinc-700 dark:text-zinc-300">
                        {formatar(valorHoraEmpresa)}
                      </td>
                      <td className="p-3 text-right text-zinc-800 dark:text-zinc-200 font-semibold">
                        {formatar(total)}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================== RODAPÉ ==================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-xs sm:text-sm mt-4 text-zinc-700 dark:text-zinc-300"
      >
        Total de horas:{" "}
        <span className="font-semibold text-emerald-500">
          {totalHoras.toFixed(1)}h
        </span>{" "}
        | Valor por hora:{" "}
        <span className="font-semibold text-blue-500">
          {formatar(valorHoraEmpresa)}
        </span>{" "}
        | Total faturado:{" "}
        <span className="font-semibold text-green-600 dark:text-green-400">
          {formatar(totalFaturado)}
        </span>
      </motion.div>
    </div>
  );
}

function ResumoCard({
  icon,
  titulo,
  valor,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl sm:rounded-2xl bg-white/70 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 sm:p-4 shadow-sm flex flex-col gap-1"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          {icon}
        </div>
        <div>
          <div className="text-[11px] sm:text-sm text-zinc-600 dark:text-zinc-400">
            {titulo}
          </div>
          <div className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white">
            {valor}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

