import { Loader2 } from "lucide-react";
import ProfissionalCard from "./ProfissionalCard";

type Profissional = {
  id: string;
  nome: string;
  funcao: string;
  cidade: string;
  distrito?: string;
  rating_media?: number;
  status?: string;
  experiencia_anos?: number;
  valor_ref_hora?: number | null;
  foto_url?: string | null;
};

type Props = {
  profissionais: Profissional[];
  loading: boolean;
  error?: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onFav: (id: string) => void;
  onQuick: (id: string) => void;
  onAdd: (p: Profissional) => void;
  onView?: (id: string) => void;
  fav: Record<string, boolean>;
};

export default function ProfissionalList({
  profissionais,
  loading,
  error,
  hasMore,
  onLoadMore,
  onFav,
  onQuick,
  onAdd,
  onView,
  fav,
}: Props) {
  if (error)
    return (
      <div className="p-6 text-center text-sm text-red-500">
        Erro ao carregar profissionais: {error}
      </div>
    );

  if (loading && profissionais.length === 0)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );

  if (!loading && profissionais.length === 0)
    return (
      <div className="p-6 text-center text-sm text-zinc-500">
        Nenhum profissional encontrado.
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {profissionais.map((p) => (
          <ProfissionalCard
            key={p.id}
            prof={p}
            fav={!!fav[p.id]}
            onFav={() => onFav(p.id)}
            onQuick={() => onQuick(p.id)}
            onAdd={() => onAdd(p)}
            onView={() => onView?.(p.id)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  );
}
