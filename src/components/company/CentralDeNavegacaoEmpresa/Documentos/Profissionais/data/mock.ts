import type { Profissional } from "../types";

const addDays = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
};

export const MOCK_PROFISSIONAIS: Profissional[] = [
  {
    id: "p1",
    nome: "Carlos Ferreira",
    funcao: "Canalizador",
    senioridade: "Sénior",
    obras: ["Residencial Gaia Hills"],
    documentos: [
      { id: "d1", nome: "Cartão de Cidadão", tipo: "Identificação", validade: addDays(600), status: "válido", emissor: "Governo de Portugal", numero: "XXXX-1234" },
      { id: "d2", nome: "Seguro de Acidentes de Trabalho", tipo: "Segurança", validade: addDays(60), status: "pendente", emissor: "Luzimeca Seguros", observacao: "Aguardando apólice atualizada." },
      { id: "d3", nome: "Formação em Trabalhos em Altura", tipo: "Certificação", validade: addDays(-12), status: "vencido", emissor: "TecSafety" },
    ],
  },
  {
    id: "p2",
    nome: "João Mendes",
    funcao: "Pedreiro",
    senioridade: "Pleno",
    obras: ["Escola do Porto"],
    documentos: [
      { id: "d4", nome: "Atestado Médico", tipo: "Saúde", validade: addDays(240), status: "válido", emissor: "SNS" },
      { id: "d5", nome: "NIF / Situação Fiscal", tipo: "Fiscal", validade: addDays(15), status: "pendente", emissor: "AT - Finanças" },
    ],
  },
  {
    id: "p3",
    nome: "André Silva",
    funcao: "Armador de Ferro",
    senioridade: "Júnior",
    obras: ["Hospital de Braga"],
    documentos: [
      { id: "d6", nome: "Seguro de Acidentes de Trabalho", tipo: "Segurança", validade: addDays(-60), status: "vencido", emissor: "Mota Seguros" },
    ],
  },
  {
    id: "p4",
    nome: "Luana Rocha",
    funcao: "Eletricista",
    senioridade: "Sénior",
    obras: ["Data Center Sines"],
    documentos: [
      { id: "d7", nome: "Certificação NR10 (equivalente)", tipo: "Certificação", validade: addDays(365), status: "válido", emissor: "ElecForm" },
      { id: "d8", nome: "Seguro de Acidentes de Trabalho", tipo: "Segurança", validade: addDays(180), status: "válido", emissor: "SeguroPlus" },
    ],
  },
];

export function getProfissionais() {
  return MOCK_PROFISSIONAIS.map((p) => {
    const counters = {
      validos: p.documentos.filter((d) => d.status === "válido").length,
      pendentes: p.documentos.filter((d) => d.status === "pendente").length,
      vencidos: p.documentos.filter((d) => d.status === "vencido").length,
    };
    const criticidade = (counters.vencidos * 2 + counters.pendentes) * 10; // peso básico

    return { ...p, counters, criticidade };
  });
}


export function getProfissionalById(id: string) {
  return MOCK_PROFISSIONAIS.find((p) => p.id === id) || null;
}

