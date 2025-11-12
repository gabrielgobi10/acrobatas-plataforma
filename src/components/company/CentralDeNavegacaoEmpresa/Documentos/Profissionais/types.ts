export type DocStatus = "válido" | "pendente" | "vencido";
export type DocTipo = "Identificação" | "Segurança" | "Certificação" | "Saúde" | "Fiscal";

export type Documento = {
  id: string;
  nome: string;
  tipo: DocTipo;
  validade?: string;
  emissor?: string;
  numero?: string;
  status: DocStatus;
  arquivo_url?: string;
  observacao?: string;
};

export type Profissional = {
  id: string;
  nome: string;
  funcao: string;
  senioridade?: "Júnior" | "Pleno" | "Sénior";
  obras: string[];
  documentos: Documento[];
};
