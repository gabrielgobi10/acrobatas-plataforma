// src/components/company/CentralDeNavegacaoEmpresa/Relatorios/CustosMensaisReportPDF.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

/**
 * Coloca "Design sem nome (44).png" na pasta /public
 * e garante que o nome está igual.
 */
const LOGO_URL = "/Design sem nome (44).png";

/* =======================
   Tipos
======================= */

type LinhaTabela = {
  obra: string;
  horas: number;
  custoTotal: number;
  custoMedioHora: number;
  profissionais: number;
};

type Resumo = {
  custoTotalMes: number;
  horasTotais: number;
  obrasComEquipe: number;
  custoMedioHora: number;
};

type ProfissionalLinha = {
  nome: string;
  funcao: string | null;
  horasNormais: number;
  horasExtra: number;
  horasTotais: number;
  valorHora: number | null;
  custoMes: number;
};

type ResumoProfissionais = {
  obraNome: string | null;
  totalCusto: number;
  totalHoras: number;
  totalProfissionais: number;
};

type Props = {
  mesLabel: string;
  ano: number;
  resumo: Resumo;
  linhas: LinhaTabela[];
  obraLabel: string;
  profissionais?: ProfissionalLinha[];
  resumoProfissionais?: ResumoProfissionais | null;
};

/* =======================
   Helpers
======================= */

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "0,00 €";
  return `${value.toFixed(2).replace(".", ",")} €`;
}

function formatHours(value: number) {
  if (!Number.isFinite(value)) return "0,0 h";
  return `${value.toFixed(1).replace(".", ",")} h`;
}

function formatDateTime() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  const horas = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} ${horas}:${min}`;
}

/* =======================
   Estilos (layout branco)
======================= */

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#0f172a",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 90,
    height: 24,
  },

  titleBlock: {
    marginBottom: 10,
    marginTop: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#6b7280",
  },

  chipsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 9,
    color: "#0f172a",
    marginRight: 6,
    backgroundColor: "#f9fafb",
  },
  chipBlue: {
    borderColor: "#38bdf8",
    color: "#0369a1",
    backgroundColor: "#e0f2fe",
  },

  // bloco branco com borda
  card: {
    marginTop: 4,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  summaryRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 8,
  },
  summaryCardLast: {
    marginRight: 0,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 6,
    color: "#111827",
  },

  tableWrapper: {
    marginTop: 4,
  },
  table: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: 600,
    color: "#374151",
  },
  tableHeaderCellObra: {
    flex: 2,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  tableCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 9,
    color: "#111827",
  },
  tableCellObra: {
    flex: 2,
  },

  bottomSummary: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  bottomSummaryItem: {
    marginLeft: 16,
  },
  bottomSummaryLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  bottomSummaryValue: {
    fontSize: 9,
    fontWeight: 600,
    color: "#111827",
  },

  // Profissionais
  profHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  profSubtitle: {
    fontSize: 8,
    color: "#6b7280",
  },
  profSummaryRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  profSummaryCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 8,
  },
  profSummaryCardLast: {
    marginRight: 0,
  },

  footer: {
    marginTop: 12,
    fontSize: 8,
    color: "#6b7280",
    textAlign: "right",
  },
});

/* =======================
   Componente PDF
======================= */

export function CustosMensaisReportPDF({
  mesLabel,
  ano,
  resumo,
  linhas,
  obraLabel,
  profissionais,
  resumoProfissionais,
}: Props) {
  const { custoTotalMes, horasTotais, obrasComEquipe, custoMedioHora } = resumo;

  const temProfissionais = profissionais && profissionais.length > 0 && resumoProfissionais;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header simples: só logo */}
        <View style={styles.header}>
          <Image src={LOGO_URL} style={styles.logo} />
        </View>

        {/* Título */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Relatório ▸ Custos Mensais</Text>
          <Text style={styles.subtitle}>
            Visão dos custos de mão de obra da equipa Acrobatas por obra, no período selecionado.
          </Text>
        </View>

        {/* Chips de contexto */}
        <View style={styles.chipsRow}>
          <Text style={[styles.chip, styles.chipBlue]}>
            {mesLabel} {ano}
          </Text>
          <Text style={styles.chip}>Obra: {obraLabel}</Text>
          <Text style={styles.chip}>Gerado em: {formatDateTime()}</Text>
        </View>

        {/* Bloco resumo do mês + tabela de obras */}
        <View style={styles.card}>
          {/* Cards resumo */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Custo total do mês</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(custoTotalMes)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Horas totais trabalhadas</Text>
              <Text style={styles.summaryValue}>
                {formatHours(horasTotais)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Custo médio por hora</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(custoMedioHora)}
              </Text>
            </View>

            <View style={[styles.summaryCard, styles.summaryCardLast]}>
              <Text style={styles.summaryLabel}>Obras com equipa no mês</Text>
              <Text style={styles.summaryValue}>{obrasComEquipe}</Text>
            </View>
          </View>

          {/* Tabela: Detalhe por obra */}
          <View style={styles.tableWrapper}>
            <Text style={styles.sectionTitle}>Detalhe por obra</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text
                  style={[styles.tableHeaderCell, styles.tableHeaderCellObra]}
                >
                  Obra
                </Text>
                <Text style={styles.tableHeaderCell}>Horas</Text>
                <Text style={styles.tableHeaderCell}>Custo total (€)</Text>
                <Text style={styles.tableHeaderCell}>
                  Custo médio/hora (€)
                </Text>
                <Text style={styles.tableHeaderCell}>Profissionais</Text>
              </View>

              {linhas.map((linha, index) => (
                <View
                  key={linha.obra + index}
                  style={[
                    styles.tableRow,
                    index % 2 === 1 && styles.tableRowAlt,
                  ]}
                >
                  <Text
                    style={[styles.tableCell, styles.tableCellObra]}
                    wrap={false}
                  >
                    {linha.obra}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatHours(linha.horas)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatCurrency(linha.custoTotal)}
                  </Text>
                  <Text style={styles.tableCell}>
                    {formatCurrency(linha.custoMedioHora)}
                  </Text>
                  <Text style={styles.tableCell}>{linha.profissionais}</Text>
                </View>
              ))}
            </View>

            {/* Resumo por baixo da tabela */}
            <View style={styles.bottomSummary}>
              <View style={styles.bottomSummaryItem}>
                <Text style={styles.bottomSummaryLabel}>
                  Obras com equipa no mês
                </Text>
                <Text style={styles.bottomSummaryValue}>
                  {obrasComEquipe}
                </Text>
              </View>
              <View style={styles.bottomSummaryItem}>
                <Text style={styles.bottomSummaryLabel}>
                  Total de horas no período
                </Text>
                <Text style={styles.bottomSummaryValue}>
                  {formatHours(horasTotais)}
                </Text>
              </View>
              <View style={styles.bottomSummaryItem}>
                <Text style={styles.bottomSummaryLabel}>Total a pagar</Text>
                <Text style={styles.bottomSummaryValue}>
                  {formatCurrency(custoTotalMes)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Secção de profissionais (só aparece se tiver detalhe carregado) */}
        {temProfissionais && resumoProfissionais && (
          <View style={[styles.card, { marginTop: 16 }]}>
            <View style={styles.profHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>
                  Profissionais na obra —{" "}
                  {resumoProfissionais.obraNome || obraLabel}
                </Text>
                <Text style={styles.profSubtitle}>
                  {mesLabel} de {ano}
                </Text>
              </View>
            </View>

            {/* Cards resumo dos profissionais */}
            <View style={styles.profSummaryRow}>
              <View style={styles.profSummaryCard}>
                <Text style={styles.summaryLabel}>Total a pagar na obra</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(resumoProfissionais.totalCusto)}
                </Text>
              </View>
              <View style={styles.profSummaryCard}>
                <Text style={styles.summaryLabel}>Horas totais</Text>
                <Text style={styles.summaryValue}>
                  {formatHours(resumoProfissionais.totalHoras)}
                </Text>
              </View>
              <View style={[styles.profSummaryCard, styles.profSummaryCardLast]}>
                <Text style={styles.summaryLabel}>Nº de profissionais</Text>
                <Text style={styles.summaryValue}>
                  {resumoProfissionais.totalProfissionais}
                </Text>
              </View>
            </View>

            {/* Tabela de profissionais */}
            <View style={styles.tableWrapper}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text
                    style={[styles.tableHeaderCell, styles.tableHeaderCellObra]}
                  >
                    Profissional
                  </Text>
                  <Text style={styles.tableHeaderCell}>Função</Text>
                  <Text style={styles.tableHeaderCell}>Horas normais</Text>
                  <Text style={styles.tableHeaderCell}>Horas extra</Text>
                  <Text style={styles.tableHeaderCell}>Total horas</Text>
                  <Text style={styles.tableHeaderCell}>Valor/hora</Text>
                  <Text style={styles.tableHeaderCell}>Custo mês</Text>
                </View>

                {profissionais!.map((p, index) => (
                  <View
                    key={p.nome + index}
                    style={[
                      styles.tableRow,
                      index % 2 === 1 && styles.tableRowAlt,
                    ]}
                  >
                    <Text
                      style={[styles.tableCell, styles.tableCellObra]}
                      wrap={false}
                    >
                      {p.nome}
                    </Text>
                    <Text style={styles.tableCell}>{p.funcao ?? "—"}</Text>
                    <Text style={styles.tableCell}>
                      {formatHours(p.horasNormais)}
                    </Text>
                    <Text style={styles.tableCell}>
                      {formatHours(p.horasExtra)}
                    </Text>
                    <Text style={styles.tableCell}>
                      {formatHours(p.horasTotais)}
                    </Text>
                    <Text style={styles.tableCell}>
                      {p.valorHora != null
                        ? formatCurrency(p.valorHora)
                        : "—"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {formatCurrency(p.custoMes)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Rodapé */}
        <Text style={styles.footer}>
          Relatório gerado automaticamente pela plataforma Acrobatas.
        </Text>
      </Page>
    </Document>
  );
}
