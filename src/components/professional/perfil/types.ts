export type Perfil = {
  usuario_id: string;
  nome_completo?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade_base?: string | null;
  nacionalidade?: string | null;
  data_nascimento?: string | null;
  nivel?: string | null;
  anos_experiencia?: number | null;
  area_principal?: string | null;
  funcao_obra?: string | null;
  disponibilidade?: string | null;
  raio_deslocacao?: string | null;
  pode_viajar?: boolean | null;
  pode_alojamento?: boolean | null;
  idiomas?: string[] | null;
  habilidades?: string[] | null;
  perfil_completo?: boolean | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  site?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
};

export type PastaPortfolio = {
  id: string;
  titulo: string;
  obra_id?: string | null;
  cliente?: string | null;
  cidade?: string | null;
  ano?: number | null;
  capa_url?: string | null;
  midias?: { url: string; tipo: "image" | "video" }[];
};

export type Experiencia = {
  id: string;
  empresa?: string | null;
  cargo?: string | null;
  cidade?: string | null;
  inicio?: string | null; // YYYY-MM
  fim?: string | null; // YYYY-MM | null
  descricao?: string | null;
  tecnologias?: string[] | null;
};

export type Documento = {
  id: string;
  titulo: string;
  tipo: string;
  status: "Aprovado" | "Pendente" | "Rejeitado";
  validade?: string | null;
  arquivo_url?: string | null;
};

export type Avaliacao = {
  id: string;
  avaliador?: string | null;
  comentario?: string | null;
  nota?: number | null; // 1..5
  data?: string | null;
  obra?: string | null;
};

export type HistoricoObra = {
  id: string;
  nome: string;
  cidade?: string | null;
  ano?: number | null;
  horas?: number | null;
};
