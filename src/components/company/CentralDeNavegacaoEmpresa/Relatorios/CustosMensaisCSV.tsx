// src/components/company/CentralDeNavegacaoEmpresa/Relatorios/CustosMensaisCSV.tsx
"use client";

import { Download } from "lucide-react";

/**
 * Linha de profissionais para exportar em CSV
 * (um registo por profissional / obra / mês)
 */
export type CustosMensaisCsvRow = {
  obra: string;
  profissional: string;
  funcao: string | null;
  horasNormais: number;
  horasExtra: number;
  horasTotais: number;
  valorHora: number | null;
  custoMes: number;
};

type CustosMensaisCSVButtonProps = {
  mesLabel: string; // ex.: "Novembro"
  ano: number; // ex.: 2025
  linhas: CustosMensaisCsvRow[];
  disabled?: boolean;
};

/**
 * Botão reutilizável para exportar CSV dos custos mensais (nível profissional)
 * - Usa separador ";" (melhor para Excel em pt-PT)
 * - Força BOM UTF-8 para não estragar os acentos
 */
export function CustosMensaisCSVButton({
  mesLabel,
  ano,
  linhas,
  disabled,
}: CustosMensaisCSVButtonProps) {
  function formatNumber(value: number | null | undefined, casas = 2) {
    if (value == null || Number.isNaN(value)) return "";
    return value.toFixed(casas).replace(".", ",");
  }

  function escapeCsv(value: string | number | null | undefined) {
    if (value == null) return "";
    const str = String(value);
    // Escapa aspas e envolve em aspas para garantir segurança
    return `"${str.replace(/"/g, '""')}"`;
  }

  function handleExport() {
    if (!linhas.length) return;

    const separator = ";";

    const header = [
      "Obra",
      "Profissional",
      "Função",
      "Horas normais",
      "Horas extra",
      "Total horas",
      "Valor/hora (€)",
      "Custo mês (€)",
    ].join(separator);

    const lines = linhas.map((row) => {
      const cols = [
        escapeCsv(row.obra),
        escapeCsv(row.profissional),
        escapeCsv(row.funcao ?? ""),
        escapeCsv(formatNumber(row.horasNormais, 1)),
        escapeCsv(formatNumber(row.horasExtra, 1)),
        escapeCsv(formatNumber(row.horasTotais, 1)),
        escapeCsv(
          row.valorHora == null ? "" : formatNumber(row.valorHora, 2)
        ),
        escapeCsv(formatNumber(row.custoMes, 2)),
      ];
      return cols.join(separator);
    });

    const csvContent = [header, ...lines].join("\n");

    // BOM UTF-8 para o Excel ler acentos direito
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CustosMensais_${mesLabel}_${ano}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const isDisabled = disabled || !linhas.length;

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isDisabled}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
    >
      <Download className="w-4 h-4" />
      Exportar CSV
    </button>
  );
}
