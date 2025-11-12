
// src/components/professional/CentralDeNavegacaoProfissional/Obras/ObrasAtivasDetalhes/VerDetalhesObra.tsx
// ============================================================================
// ✔ Layout otimizado para mobile + modo claro
// ✔ Cards leves, espaçamento ideal e hierarquia visual refinada
// ✔ Mantém toda a lógica original (Supabase, relatórios, fotos, chat)
// ✔ Animações suaves e sensação de app nativo
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  MapPin,
  CalendarCheck2,
  BadgeCheck,
  MessageSquare,
  Waypoints,
  Users,
  Clock4,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { MapContainer, Marker, TileLayer, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Obra = {
  id: string;
  nome?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  empresa_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  descricao?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Vinculo = { profissional_id: string; funcao?: string | null };
type Presenca = { id: string; data: string; hora_entrada: string | null; hora_saida: string | null; profissional_id: string };
type RelatorioObra = { id: string; data_relatorio?: string | null; progresso?: number | null; descricao?: string | null };
type FotoItem = { name: string; id: string; updated_at: string; path: string; publicURL?: string };

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-PT");
  } catch {
    return d;
  }
}

function diffSegundos(h1: string, h2: string) {
  const [H1, M1, S1] = h1.split(":").map(Number);
  const [H2, M2, S2] = h2.split(":").map(Number);
  return Math.max(0, (H2 * 3600 + M2 * 60 + S2) - (H1 * 3600 + M1 * 60 + S1));
}

const iconObra = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/484/484167.png",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

export default function VerDetalhesObra({
  obra,
  onIrPresenca,
  onIrRelatorio,
  onIrChat,
  onIrMapa,
}: {
  obra: Obra;
  onIrPresenca?: () => void;
  onIrRelatorio?: () => void;
  onIrChat?: () => void;
  onIrMapa?: () => void;
}) {
  const { user } = useAuth();

  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<(Vinculo & { presenteHoje: boolean | null })[]>([]);
  const [presencasHoje, setPresencasHoje] = useState<Presenca[]>([]);
  const [ultimoRelatorio, setUltimoRelatorio] = useState<RelatorioObra | null>(null);
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [meusTotais, setMeusTotais] = useState<{ dias: number; horas: number; presencas: number }>({ dias: 0, horas: 0, presencas: 0 });
  const [ultimaPresenca, setUltimaPresenca] = useState<string | null>(null);
  const [chatPreview, setChatPreview] = useState<{ autor?: string; texto?: string; quando?: string } | null>(null);
  const [novasMensagens, setNovasMensagens] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const hojeISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 🔹 Carregar dados
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (obra.empresa_id) {
          const { data } = await supabase.from("empresas").select("nome").eq("id", obra.empresa_id).maybeSingle();
          setEmpresaNome(data?.nome ?? null);
        }

        const { data: presHoje } = await supabase
          .from("presencas_profissionais")
          .select("id, data, hora_entrada, hora_saida, profissional_id")
          .eq("obra_id", obra.id)
          .eq("data", hojeISO);
        setPresencasHoje(presHoje || []);

        const { data: vincs } = await supabase.from("profissionais_obras").select("profissional_id, funcao").eq("obra_id", obra.id);
        const equipeComStatus =
          (vincs || []).map((v) => ({
            ...v,
            presenteHoje: presHoje?.some((p) => p.profissional_id === v.profissional_id) ?? null,
          })) || [];
        equipeComStatus.sort((a, b) => (a.presenteHoje === b.presenteHoje ? 0 : a.presenteHoje ? -1 : 1));
        setEquipe(equipeComStatus);

        if (user?.id) {
          const { data: minhas } = await supabase
            .from("presencas_profissionais")
            .select("data, hora_entrada, hora_saida")
            .eq("obra_id", obra.id)
            .eq("profissional_id", user.id)
            .order("data", { ascending: false });

          if (minhas?.[0]?.data)
            setUltimaPresenca(`${formatDate(minhas[0].data)} ${minhas[0].hora_entrada?.slice(0, 5) || ""}`);

          let diasSet = new Set<string>();
          let horasSomadas = 0;
          (minhas || []).forEach((p) => {
            if (p.data) diasSet.add(p.data);
            if (p.hora_entrada && p.hora_saida) {
              const seg = diffSegundos(p.hora_entrada.slice(0, 8), p.hora_saida.slice(0, 8));
              horasSomadas += Math.max(0, seg - 3600);
            }
          });
          setMeusTotais({ dias: diasSet.size, horas: Number((horasSomadas / 3600).toFixed(1)), presencas: minhas?.length || 0 });
        }

        const { data: rel } = await supabase
          .from("relatorios_obras")
          .select("id, data_relatorio, progresso, descricao")
          .eq("obra_id", obra.id)
          .order("data_relatorio", { ascending: false })
          .limit(1);
        setUltimoRelatorio(rel?.[0] ?? null);

        const { data: msgs } = await supabase
          .from("chat_mensagens")
          .select("autor, mensagem, criado_em, lido")
          .eq("obra_id", obra.id)
          .order("criado_em", { ascending: false })
          .limit(1);
        if (msgs && msgs[0]) {
          setChatPreview({
            autor: msgs[0].autor,
            texto: msgs[0].mensagem,
            quando: new Date(msgs[0].criado_em).toLocaleString("pt-PT"),
          });
          setNovasMensagens(msgs.filter((m) => !m.lido).length);
        }

        const list = await supabase.storage.from("relatorios_fotos").list(obra.id, {
          limit: 8,
          sortBy: { column: "updated_at", order: "desc" },
        });
        const files = (list.data || []).map((f) => ({
          id: f.id!,
          name: f.name,
          updated_at: f.updated_at!,
          path: `${obra.id}/${f.name}`,
        })) as FotoItem[];
        const withUrl = await Promise.all(
          files.map(async (f) => {
            const { data } = supabase.storage.from("relatorios_fotos").getPublicUrl(f.path);
            return { ...f, publicURL: data.publicUrl };
          })
        );
        setFotos(withUrl);
      } finally {
        setLoading(false);
      }
    })();
  }, [obra.id]);

  // 🔹 Status presença de hoje
  const statusPresencaHoje = useMemo(() => {
    if (!user?.id) return null;
    const linhas = presencasHoje.filter((p) => p.profissional_id === user.id);
    if (linhas.length === 0) return "Sem registro";
    const p = linhas[0];
    if (p.hora_entrada && !p.hora_saida) return "Em serviço";
    if (p.hora_entrada && p.hora_saida) return "Encerrado";
    return "Sem registro";
  }, [presencasHoje, user?.id]);

  // 🔹 Upload de foto
  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !obra.id) return;
    const path = `${obra.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("relatorios_fotos").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("relatorios_fotos").getPublicUrl(path);
      setFotos((prev) => [{ id: path, name: file.name, updated_at: new Date().toISOString(), path, publicURL: data.publicUrl }, ...prev]);
    } else {
      alert("Erro ao enviar foto");
    }
  }

  return (
    <div className="w-full px-3 sm:px-6 py-4">
      {/* ================== CABEÇALHO ================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-[#141b29]/95 p-5 mb-6 shadow-sm dark:shadow-md backdrop-blur-sm"
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-5">
          <div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-lg sm:text-xl font-bold">
              <Building2 className="text-blue-500" /> {obra.nome || "Obra sem nome"}
            </div>
            <div className="mt-1 text-gray-600 dark:text-gray-400 flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-blue-400" />
              {obra.endereco || "Sem endereço"} {obra.cidade ? `— ${obra.cidade}` : ""}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Empresa: <span className="text-gray-800 dark:text-gray-200">{empresaNome || "—"}</span> • Início: {formatDate(obra.data_inicio)}{" "}
              {obra.data_fim && `• Fim: ${formatDate(obra.data_fim)}`}
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
              <button onClick={onIrPresenca} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
                <CalendarCheck2 size={16} /> Presença
              </button>
              <button onClick={onIrRelatorio} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
                <BadgeCheck size={16} /> Relatório
              </button>
              <button onClick={onIrChat} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-[#2f3c51] dark:hover:bg-[#3a4961] dark:text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm relative">
                <MessageSquare size={16} /> Chat
                {novasMensagens > 0 && <span className="absolute -top-1 -right-2 bg-red-600 text-[10px] px-1 rounded-full text-white font-semibold">{novasMensagens}</span>}
              </button>
              <button onClick={onIrMapa} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#243144] dark:hover:bg-[#2e3d56] text-gray-800 dark:text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
                <Waypoints size={16} /> Mapa
              </button>
            </div>
          </div>

          {/* MINI MAPA */}
          <div className="w-full md:w-[380px]">
            {obra.latitude && obra.longitude ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700">
                <MapContainer center={[obra.latitude, obra.longitude]} zoom={16} style={{ height: 180, width: "100%" }} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[obra.latitude, obra.longitude]} icon={iconObra}>
                    <Popup>{obra.nome}</Popup>
                  </Marker>
                  <Circle center={[obra.latitude, obra.longitude]} radius={300} pathOptions={{ color: "blue", fillOpacity: 0.1 }} />
                </MapContainer>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-zinc-700 p-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                📍 Localização não registada
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ================== CONTEÚDO PRINCIPAL ================== */}
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Carregando dados...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Equipa */}
          <motion.div whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 120 }} className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-[#141b29] p-5 shadow-sm dark:shadow-md">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-3"><Users className="text-blue-500" /> Equipa na obra</div>
            {equipe.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-sm">Nenhum profissional registado.</div>
            ) : (
              <div className="space-y-3">
                {equipe.slice(0, 6).map((p) => (
                  <div key={p.profissional_id} className="flex items-center justify-between bg-gray-50 dark:bg-[#1a2334] rounded-lg p-3 border border-gray-200 dark:border-zinc-700/50">
                    <div>
                      <div className="text-gray-800 dark:text-gray-100 font-medium text-sm">{p.profissional_id.slice(0, 8)}…</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">{p.funcao || "Profissional"}</div>
                    </div>
                    {p.presenteHoje ? (
                      <span className="text-emerald-500 text-xs flex items-center gap-1"><CheckCircle2 size={14} /> Presente</span>
                    ) : (
                      <span className="text-amber-500 text-xs flex items-center gap-1"><XCircle size={14} /> Não marcou</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Meu resumo */}
          <motion.div whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 120 }} className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-[#141b29] p-5 shadow-sm dark:shadow-md">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-3"><Clock4 className="text-blue-500" /> Meu resumo</div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(meusTotais).map(([k, v]) => (
                <div key={k} className="bg-gray-50 dark:bg-[#1a2334] p-3 text-center rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{k}</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              Hoje:{" "}
              {statusPresencaHoje === "Em serviço" ? (
                <span className="text-emerald-500 font-medium">🟢 Em serviço</span>
              ) : statusPresencaHoje === "Encerrado" ? (
                <span className="text-blue-500 font-medium">🔵 Encerrado</span>
              ) : (
                <span className="text-amber-500 font-medium">⚠️ Sem registro</span>
              )}
            </div>
            {ultimaPresenca && (
              <div className="text-xs text-gray-400 mt-1">
                Última: {ultimaPresenca}
              </div>
            )}
          </motion.div>

          {/* Último relatório */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-[#141b29] p-5 shadow-sm dark:shadow-md"
          >
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-3">
              <BadgeCheck className="text-blue-500" /> Último relatório
            </div>
            {!ultimoRelatorio ? (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Nenhum relatório enviado.
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  📅 {formatDate(ultimoRelatorio.data_relatorio)}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Progresso:{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {ultimoRelatorio.progresso ?? 0}%
                  </span>
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 italic">
                  {ultimoRelatorio.descricao || "Sem descrição."}
                </div>
                <button
                  onClick={onIrRelatorio}
                  className="mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-2"
                >
                  <BadgeCheck size={14} /> Ver completo
                </button>
              </>
            )}
          </motion.div>

          {/* Chat da obra */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-[#141b29] p-5 shadow-sm dark:shadow-md"
          >
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-3">
              <MessageSquare className="text-blue-500" /> Chat da obra
            </div>
            {!chatPreview ? (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Sem mensagens recentes.
              </div>
            ) : (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="mb-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    Última:
                  </span>{" "}
                  <span className="text-gray-800 dark:text-gray-100">
                    {chatPreview.autor}
                  </span>
                </p>
                <p className="line-clamp-2 text-gray-900 dark:text-gray-100">
                  “{chatPreview.texto}”
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {chatPreview.quando}
                </p>
              </div>
            )}
            <button
              onClick={onIrChat}
              className="mt-3 px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#2f3c51] dark:hover:bg-[#3a4961] text-gray-800 dark:text-white rounded-lg text-xs flex items-center justify-center gap-2"
            >
              <MessageSquare size={14} /> Abrir chat
            </button>
          </motion.div>

          {/* Fotos recentes */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-[#141b29] p-5 shadow-sm dark:shadow-md xl:col-span-2"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold">
                <ImageIcon className="text-blue-500" /> Fotos recentes
              </div>
              <label className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer">
                <Upload size={16} /> <span>Enviar</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadFoto}
                  className="hidden"
                />
              </label>
            </div>

            {fotos.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Nenhuma foto encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {fotos.map((f) => (
                  <motion.div
                    key={f.id}
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 140 }}
                    className="relative group overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700 shadow-sm"
                  >
                    <img
                      src={f.publicURL}
                      alt={f.name}
                      className="w-full h-36 object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-xs text-gray-200 p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {new Date(f.updated_at).toLocaleDateString("pt-PT")}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
