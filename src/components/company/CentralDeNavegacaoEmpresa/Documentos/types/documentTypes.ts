export interface GrupoDocumento {
  id: string;
  nome: string;
  descricao?: string | null;
}

export interface TipoDocumento {
  id: string;
  grupo_id: string;
  nome: string;
  validade_meses?: number | null;
}

export interface ArquivoDoTipo {
  name: string;
  size: number;
  created_at: string;
  publicUrl: string;
}

export interface TipoComArquivo {
  tipo: TipoDocumento;
  arquivo?: ArquivoDoTipo; // undefined = ainda não enviado
}

export interface GrupoComTipos {
  grupo: GrupoDocumento;
  tipos: TipoComArquivo[];
}
