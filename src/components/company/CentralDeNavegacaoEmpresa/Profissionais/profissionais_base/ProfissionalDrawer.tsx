import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Star,
  BadgeCheck,
  Calendar,
  Euro,
  User,
  Loader2,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profissional = {
  id: string;
  nome: string;
  funcao: string;
  cidade?: string | null;
  distrito?: string | null;
  rating_media?: number | null;
  experiencia_anos?: number | null;
  valor_ref_hora?: number | null;
  status?: "disponivel" | "em_obra" | "indisponivel";
  habilidades?: string[] | null;
  foto_url?: string | null;
};

export default function ProfissionalDrawer({
  id,
  onClose,
  onAdicionar,
}: {
  id: string | null;
  onClose: () => void;
  onAdicionar: (p: Profissional) => void;
}) {
  const [p, setP] = useState<Profissional | null>(null);
  const [loading, setLoading] = useState(true);
  const [ultimaObra, setUltimaObra] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profissionais_view")
        .select(
          "id, nome, funcao, cidade, distrito, rating_media, experiencia_anos, valor_ref_hora, status, habilidades, foto_url"
        )
        .eq("id", id)
        .limit(1)
        .single();

      if (!error && data) {
        setP(data as Profissional);
        buscarUltimaObra(data.id);
      } else setP(null);

      setLoading(false);
    })();
  }, [id]);

  async function buscarUltimaObra(profissionalId: string) {
    const { data } = await supabase
      .from("profissionais_obras")
      .select("obra(nome)")
      .eq("profissional_id", profissionalId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setUltimaObra(data[0].obra?.nome || null);
    }
  }

  const statusLabel = (status?: string) => {
    switch (status) {
      case "disponivel":
        return { label: "Disponível", color: "text-emerald-600 bg-emerald-50", dot: "bg-emerald-500" };
      case "em_obra":
        return { label: "Em obra", color: "text-amber-600 bg-amber-50", dot: "bg-amber-500" };
      default:
        return { label: "Indisponível", color: "text-zinc-600 bg-zinc-100", dot: "bg-zinc-400" };
    }
  };

  const formatMoney = (v?: number | null) =>
    typeof v === "number"
      ? `${v.toFixed(2).replace(".", ",")} €`
      : "—";

  return (
    <AnimatePresence>
      {id && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-zinc-200 bg-white bg-gray-100 shadow-2xl"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-zinc-200 p-5">
            <h3 className="text-lg font-semibold">Detalhes rápidos</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-zinc-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Corpo */}
          <div className="h-[calc(100%-60px)] overflow-y-auto p-5">
            {loading ? (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Carregando informações…
              </div>
            ) : !p ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Profissional não encontrado.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Identidade */}
                <div className="flex items-center gap-4">
                  <div className="h-[70px] w-[70px] overflow-hidden rounded-full ring-1 ring-zinc-200">
                    {p.foto_url ? (
                      <img
                        src={p.foto_url}
                        alt={p.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-lg font-medium text-zinc-600">
                        {p.nome?.[0]?.toUpperCase() ?? "P"}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold leading-none">{p.nome}</h2>
                    <p className="text-sm text-zinc-600">{p.funcao}</p>

                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusLabel(p.status).color}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${statusLabel(p.status).dot}`} />
                        {statusLabel(p.status).label}
                      </span>

                      {p.experiencia_anos && p.experiencia_anos >= 5 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <BadgeCheck className="h-3 w-3" /> Profissional experiente
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Principais informações */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-zinc-200 p-3">
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                      <MapPin className="h-3 w-3" /> Local
                    </div>
                    <div className="font-medium">{p.cidade ?? "—"}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 p-3">
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                      <Star className="h-3 w-3" /> Avaliação
                    </div>
                    <div className="font-medium">
                      {p.rating_media ? `${p.rating_media.toFixed(1)} ⭐` : "Sem avaliações"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 p-3">
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                      <Calendar className="h-3 w-3" /> Experiência
                    </div>
                    <div className="font-medium">
                      {p.experiencia_anos ? `${p.experiencia_anos} anos` : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 p-3">
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                      <Euro className="h-3 w-3" /> Valor ref. hora
                    </div>
                    <div className="font-medium">{formatMoney(p.valor_ref_hora)}</div>
                  </div>
                </div>

                {/* Última obra */}
                {ultimaObra && (
                  <div className="rounded-xl border border-zinc-200 p-3 text-sm">
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                      <Briefcase className="h-3 w-3" /> Última obra
                    </div>
                    <div className="font-medium">{ultimaObra}</div>
                  </div>
                )}

                {/* Habilidades */}
                {p.habilidades && p.habilidades.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-zinc-700">Principais habilidades</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {p.habilidades.slice(0, 6).map((h, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => onAdicionar(p)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition"
                  >
                    <User className="h-4 w-4" /> Adicionar à obra
                  </button>
                  <button
                    onClick={() => window.location.assign(`/professional/${p.id}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                  >
                    Ver perfil completo
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
