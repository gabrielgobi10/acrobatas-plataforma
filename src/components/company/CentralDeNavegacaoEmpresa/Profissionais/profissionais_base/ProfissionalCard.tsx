import {
  MapPin,
  Star,
  Heart,
  HeartOff,
  Plus,
  Eye,
} from "lucide-react";

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
  prof: Profissional;
  fav: boolean;
  onFav: () => void;
  onQuick: () => void;
  onAdd: () => void;
  onView?: () => void;
};

export default function ProfissionalCard({
  prof,
  fav,
  onFav,
  onQuick,
  onAdd,
  onView,
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white bg-gray-100 p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-full ring-1 ring-zinc-200">
          {prof.foto_url ? (
            <img
              src={prof.foto_url}
              alt={prof.nome}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm font-medium text-zinc-600">
              {prof.nome?.[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{prof.nome}</div>
          <div className="truncate text-xs text-zinc-500">{prof.funcao}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
        <MapPin className="h-3.5 w-3.5" />
        {prof.cidade} {prof.distrito ? `— ${prof.distrito}` : ""}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-500" />
          {prof.rating_media?.toFixed(1) ?? "0,0"}
        </span>
        <span>{prof.experiencia_anos ?? 0} anos</span>
      </div>

      <div className="mt-2 text-xs text-zinc-600">
        <strong>Valor ref. (hora):</strong>{" "}
        {prof.valor_ref_hora
          ? `${prof.valor_ref_hora.toFixed(2)} €`
          : "—"}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={onView}
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:underline"
        >
          <Eye className="h-4 w-4" /> Ver Perfil
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onFav}
            className="rounded-full border border-zinc-200 p-1 hover:bg-zinc-50"
          >
            {fav ? (
              <HeartOff className="h-4 w-4 text-zinc-600" />
            ) : (
              <Heart className="h-4 w-4 text-zinc-600" />
            )}
          </button>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" /> Adicionar à Obra
          </button>
        </div>
      </div>
    </div>
  );
}
