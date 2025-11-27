// ============================================================================
// ✔ Registro de Presença – Profissional (com GPS funcional e UX melhorada)
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck2,
  Clock4,
  CheckCircle2,
  LogOut,
  Loader2,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Info,
  ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Presenca = {
  id: string;
  data: string;
  hora_entrada: string | null;
  hora_saida: string | null;
  status: string;
  device_timestamp?: string | null;
  device_latitude?: number | null;
  device_longitude?: number | null;
  device_accuracy?: number | null;
  gps_denied?: boolean | null;
};

type Obra = {
  id: string;
  nome?: string | null;
  endereco?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const RAIO_PADRAO_METROS = 300;

function distanciaMetros(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

function formatHHMMSS(segundos: number) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}h${pad(m)}`;
}

export default function Presenca({ obraId }: { obraId: string }) {
  const { user } = useAuth();

  const [obra, setObra] = useState<Obra | null>(null);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [presenteHoje, setPresenteHoje] = useState<Presenca | null>(null);
  const [loading, setLoading] = useState(false);
  const [horaAgora, setHoraAgora] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);

  const [mesSelecionado, setMesSelecionado] = useState<number | "todos">(
    "todos"
  );
  const [ordemAsc, setOrdemAsc] = useState<boolean>(false);

  // POSIÇÃO ATUAL DO DISPOSITIVO (GPS)
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distObra, setDistObra] = useState<number | null>(null);
  const distTimer = useRef<number | null>(null);

  // Estado da permissão de geolocalização
  const [geoPerm, setGeoPerm] = useState<
    "unknown" | "granted" | "denied" | "prompt"
  >("unknown");

  // Modal "fora do raio"
  const [mostrarForaRaio, setMostrarForaRaio] = useState(false);
  const [distanciaTentativa, setDistanciaTentativa] = useState<number | null>(
    null
  );

  const segundosEmServico = useMemo(() => {
    if (!presenteHoje?.hora_entrada || presenteHoje?.hora_saida) return 0;
    const hojeISO = new Date().toISOString().slice(0, 10);
    const base = new Date(
      `${hojeISO}T${presenteHoje.hora_entrada.slice(0, 8)}`
    );
    const s = (Date.now() - base.getTime()) / 1000;
    return s > 0 ? s : 0;
  }, [presenteHoje, horaAgora]);

  // Relógio em tempo real
  useEffect(() => {
    const tick = setInterval(() => {
      const d = new Date();
      setHoraAgora(
        d.toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Carregar obra + presenças ao montar
  useEffect(() => {
    (async () => {
      await carregarObra();
      await carregarPresencas();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Descobre o estado da permissão de geolocalização (quando suportado)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const navAny = navigator as any;
    if (!navAny.permissions?.query) return;

    try {
      navAny.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status: PermissionStatus) => {
          setGeoPerm(status.state as any);
          status.onchange = () => setGeoPerm(status.state as any);
        })
        .catch(() => setGeoPerm("unknown"));
    } catch {
      setGeoPerm("unknown");
    }
  }, []);

  // ATUALIZA DISTÂNCIA SEM FICAR VENDO GPS EM BACKGROUND
  useEffect(() => {
    const temCoordsObra =
      obra?.latitude !== null &&
      obra?.latitude !== undefined &&
      obra?.longitude !== null &&
      obra?.longitude !== undefined;

    if (temCoordsObra && pos) {
      if (distTimer.current) window.clearTimeout(distTimer.current);
      distTimer.current = window.setTimeout(() => {
        setDistObra(
          Math.round(
            distanciaMetros(pos, {
              lat: obra!.latitude as number,
              lng: obra!.longitude as number,
            })
          )
        );
      }, 150);
    } else {
      setDistObra(null);
    }
  }, [pos, obra?.latitude, obra?.longitude]);

  async function carregarObra() {
    const { data, error } = await supabase
      .from("obras")
      .select("id, nome, endereco, latitude, longitude")
      .eq("id", obraId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }
    if (data) setObra(data as Obra);
  }

  async function carregarPresencas() {
    if (!user) return;
    const { data, error } = await supabase
      .from("presencas_profissionais")
      .select("*")
      .eq("profissional_id", (user as any).auth_id || user.id)
      .eq("obra_id", obraId)
      .order("data", { ascending: false });

    if (error) {
      console.error(error);
      setErro("Erro ao carregar presenças.");
      return;
    }

    setPresencas((data || []) as Presenca[]);
    const hojeISO = new Date().toISOString().slice(0, 10);
    setPresenteHoje((data || []).find((p) => p.data === hojeISO) || null);
  }

  // Captura de localização no momento da ação (entrada/saída OU botão manual)
  async function capturarDeviceInfo(timeoutMs = 8000) {
    const device_timestamp = new Date().toISOString();

    if (!("geolocation" in navigator)) {
      setErro(
        "Seu dispositivo/navegador não suporta localização. A presença será registrada sem GPS."
      );
      setGeoPerm("denied");
      return { device_timestamp, coords: null, accuracy: null, gps_denied: true };
    }

    return new Promise<{
      device_timestamp: string;
      coords: { lat: number; lng: number } | null;
      accuracy: number | null;
      gps_denied: boolean;
    }>((resolve) => {
      let finished = false;

      const finalizar = (payload: {
        coords: { lat: number; lng: number } | null;
        accuracy: number | null;
        gps_denied: boolean;
      }) => {
        if (finished) return;
        finished = true;
        resolve({ device_timestamp, ...payload });
      };

      const fail = (gps_denied = true) => {
        if (gps_denied) {
          setGeoPerm("denied");
          setErro(
            "Você bloqueou o acesso à localização no navegador. Para permitir novamente, clique no cadeado ao lado do endereço do site, abra as permissões e mude 'Localização' para 'Permitir'."
          );
        } else {
          setErro(
            "Não foi possível obter sua localização. Verifique se o GPS está ligado e tente novamente."
          );
        }
        finalizar({ coords: null, accuracy: null, gps_denied });
      };

      const success = (posicao: GeolocationPosition) => {
        const coords = {
          lat: posicao.coords.latitude,
          lng: posicao.coords.longitude,
        };
        setGeoPerm("granted");
        setPos(coords);
        finalizar({
          coords,
          accuracy: posicao.coords.accuracy ?? null,
          gps_denied: false,
        });
      };

      try {
        navigator.geolocation.getCurrentPosition(
          success,
          (err) => {
            console.error("Erro geolocalização:", err);
            fail(err.code === err.PERMISSION_DENIED);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: timeoutMs,
          }
        );

        // fallback se nada voltar
        setTimeout(() => fail(false), timeoutMs + 1500);
      } catch (e) {
        console.error(e);
        fail(true);
      }
    });
  }

  // ------------------------------
  // MARCAR ENTRADA (com bloqueio fora do raio)
  // ------------------------------
  async function marcarEntrada() {
    setErro(null);
    setLoading(true);

    const hojeISO = new Date().toISOString().slice(0, 10);
    const horaEntrada = new Date().toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    try {
      // 1) Captura localização primeiro
      const dev = await capturarDeviceInfo();

      const obraTemCoords =
        obra?.latitude !== null &&
        obra?.latitude !== undefined &&
        obra?.longitude !== null &&
        obra?.longitude !== undefined;

      // 2) Se temos coords da obra e coords do dispositivo, valida raio
      let distanciaAtual: number | null = null;
      if (obraTemCoords && dev.coords) {
        distanciaAtual = Math.round(
          distanciaMetros(dev.coords, {
            lat: obra!.latitude as number,
            lng: obra!.longitude as number,
          })
        );
      }

      // 3) Bloqueia se estiver claramente fora do raio
      if (distanciaAtual !== null && distanciaAtual > RAIO_PADRAO_METROS) {
        setDistanciaTentativa(distanciaAtual);
        setMostrarForaRaio(true);
        setLoading(false);
        return;
      }

      const novoRegistro: Presenca = {
        id: "temp",
        data: hojeISO,
        hora_entrada: horaEntrada,
        hora_saida: null,
        status: "Presente",
        device_timestamp: dev.device_timestamp,
        device_latitude: dev.coords?.lat ?? null,
        device_longitude: dev.coords?.lng ?? null,
        device_accuracy: dev.accuracy ?? null,
        gps_denied: !!dev.gps_denied,
      };

      setPresencas((prev) => [novoRegistro, ...prev]);
      setPresenteHoje(novoRegistro);

      const { data: authData } = await supabase.auth.getUser();
      const authUID = authData?.user?.id;

      await supabase.from("presencas_profissionais").insert([
        {
          profissional_id: authUID,
          obra_id: obraId,
          data: hojeISO,
          hora_entrada: horaEntrada,
          status: "Presente",
          device_timestamp: dev.device_timestamp,
          device_latitude: dev.coords?.lat ?? null,
          device_longitude: dev.coords?.lng ?? null,
          device_accuracy: dev.accuracy ?? null,
          gps_denied: !!dev.gps_denied,
        },
      ]);

      await carregarPresencas();
    } catch (e) {
      console.error(e);
      setErro("Falha ao marcar entrada.");
    } finally {
      setLoading(false);
    }
  }

  async function marcarSaida() {
    if (!presenteHoje) return;
    setErro(null);
    setLoading(true);

    try {
      const dev = await capturarDeviceInfo();
      const horaSaida = new Date().toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setPresenteHoje({ ...presenteHoje, hora_saida: horaSaida });
      setPresencas((prev) =>
        prev.map((p) =>
          p.id === presenteHoje.id ? { ...p, hora_saida: horaSaida } : p
        )
      );

      await supabase
        .from("presencas_profissionais")
        .update({
          hora_saida: horaSaida,
          device_timestamp: dev.device_timestamp,
          device_latitude: dev.coords?.lat ?? null,
          device_longitude: dev.coords?.lng ?? null,
          device_accuracy: dev.accuracy ?? null,
          gps_denied: !!dev.gps_denied,
        })
        .eq("id", presenteHoje.id);

      await carregarPresencas();
    } catch (e) {
      console.error(e);
      setErro("Falha ao marcar saída.");
    } finally {
      setLoading(false);
    }
  }

  const dentroDoRaio = useMemo(
    () => (distObra == null ? null : distObra <= RAIO_PADRAO_METROS),
    [distObra]
  );

  const presencasFiltradas = useMemo(() => {
    let lista = [...presencas];
    if (mesSelecionado !== "todos") {
      lista = lista.filter(
        (p) => new Date(p.data).getMonth() === mesSelecionado
      );
    }
    return ordemAsc ? lista.reverse() : lista;
  }, [presencas, mesSelecionado, ordemAsc]);

  function calcularHoras(p: Presenca) {
    if (!p.hora_entrada || !p.hora_saida) return null;
    const entrada = new Date(`2000-01-01T${p.hora_entrada}`);
    const saida = new Date(`2000-01-01T${p.hora_saida}`);
    let diff = (saida.getTime() - entrada.getTime()) / 1000;
    if (diff > 5 * 3600) diff -= 3600;
    return formatHHMMSS(diff);
  }

  const obraTemCoords =
    obra?.latitude !== null &&
    obra?.latitude !== undefined &&
    obra?.longitude !== null &&
    obra?.longitude !== undefined;

  // Handler do botão "Atualizar localização"
  async function handleAtualizarLocalizacao() {
    setErro(null);

    if (geoPerm === "denied") {
      setErro(
        "Você bloqueou o acesso à localização para este site. Clique no cadeado ao lado do endereço, abra as permissões e mude 'Localização' para 'Permitir'."
      );
      return;
    }

    await capturarDeviceInfo();
  }

  // ============================================================================  
  // RENDERIZAÇÃO  
  // ============================================================================  

  return (
    <div className="p-4 sm:p-8 transition-colors duration-200">
      {/* MODAL FORA DO RAIO */}
      {mostrarForaRaio && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-amber-500" size={20} />
                <h2 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                  Você está longe da obra
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Para marcar presença é preciso estar{" "}
                <span className="font-semibold">próximo ao ponto da obra</span>.
              </p>
              {distanciaTentativa !== null && (
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">
                  Distância atual estimada:{" "}
                  <span className="font-semibold">
                    {distanciaTentativa} m
                  </span>{" "}
                  (limite: {RAIO_PADRAO_METROS} m).
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Verifique se está no local correto e tente atualizar a
                localização. Se continuar a dar erro, fale com a equipa
                Acrobatas ou com o encarregado da obra.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={async () => {
                    setMostrarForaRaio(false);
                    // tenta atualizar o GPS de novo; o utilizador volta a clicar em "Marcar entrada"
                    await handleAtualizarLocalizacao();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={() => {
                    setMostrarForaRaio(false);
                    setErro(
                      "Você está fora do raio da obra. Se estiver mesmo no local, entre em contacto com a equipa Acrobatas ou com o encarregado para ajustar a presença."
                    );
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Pedir ajuda
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <motion.h1 className="text-2xl font-bold flex items-center gap-2 mb-2 text-gray-900 dark:text-gray-100">
        <CalendarCheck2 className="text-blue-500" />
        Registro de Presença
      </motion.h1>

      <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
        Usamos a sua localização <span className="font-semibold">apenas</span>{" "}
        no momento de marcar entrada ou saída, para confirmar que você está
        próximo da obra. Não rastreamos seus movimentos ao longo do dia.
      </p>

      {/* Cards de status */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Data e hora */}
        <div className="rounded-2xl border border-gray-200 dark:border-blue-800/30 bg-white/70 dark:bg-[#0B1736]/60 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="text-xs uppercase text-gray-500 dark:text-gray-400 flex items-center gap-2">
            Data e hora
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400">
                Hoje
              </div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {new Date().toLocaleDateString("pt-PT")}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString("pt-PT", {
                  weekday: "long",
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400">
                Agora
              </div>
              <div className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100">
                {horaAgora}
              </div>
            </div>
          </div>
        </div>

        {/* Localização / distância */}
        <div className="rounded-2xl border border-gray-200 dark:border-blue-800/30 bg-white/70 dark:bg-[#0B1736]/60 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="text-xs uppercase text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <MapPin size={16} />
            Localização
          </div>
          <div className="mt-2 text-sm font-medium text-gray-800 dark:text-gray-100">
            <div className="text-[11px] uppercase text-gray-500 dark:text-gray-400 mb-1">
              Ponto da obra
            </div>
            <div>{obra?.endereco || obra?.nome || "Obra"}</div>

            <div className="mt-3 text-[11px] uppercase text-gray-500 dark:text-gray-400">
              Sua posição agora
            </div>
            <div
              className={
                !obraTemCoords
                  ? "text-amber-600 dark:text-amber-300 text-sm"
                  : geoPerm === "denied"
                  ? "text-amber-600 dark:text-amber-300 text-sm"
                  : distObra == null
                  ? "text-gray-400 text-sm"
                  : dentroDoRaio
                  ? "text-green-600 dark:text-green-300 text-sm"
                  : "text-amber-600 dark:text-amber-300 text-sm"
              }
            >
              {!obraTemCoords
                ? "Coordenadas da obra não configuradas."
                : geoPerm === "denied"
                ? "Localização bloqueada pelo navegador."
                : distObra == null
                ? "Aguardando GPS…"
                : `${distObra} m do ponto da obra`}
            </div>
            {distObra != null && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Fora do raio de {RAIO_PADRAO_METROS} m da obra.
              </div>
            )}
          </div>
          <button
            onClick={handleAtualizarLocalizacao}
            className="mt-3 text-xs px-3 py-1.5 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-500/10"
          >
            {geoPerm === "denied"
              ? "Como permitir localização"
              : "Atualizar localização"}
          </button>
        </div>

        {/* Status do dia */}
        <div className="rounded-2xl border border-gray-200 dark:border-blue-800/30 bg-white/70 dark:bg-[#0B1736]/60 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="text-xs uppercase text-gray-500 dark:text-gray-400 flex items-center gap-2">
            Status do dia
          </div>
          <div className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">
            {presenteHoje ? (
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm bg-green-100 text-green-700 dark:bg-green-700/50 dark:text-green-200 w-fit">
                  <CheckCircle2 size={16} /> Presente
                </span>
                {presenteHoje.hora_entrada && !presenteHoje.hora_saida && (
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Em serviço: {formatHHMMSS(segundosEmServico)}
                  </span>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                <Info size={16} /> Ainda não marcado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Botão principal */}
      <div className="rounded-2xl border border-gray-200 dark:border-blue-800/30 bg-white/70 dark:bg-[#0B1736]/60 p-5 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {obra?.nome}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {obra?.endereco}
          </div>
        </div>

        {loading ? (
          <Loader2 className="animate-spin text-blue-500" size={26} />
        ) : presenteHoje && !presenteHoje.hora_saida ? (
          <button
            onClick={marcarSaida}
            className="bg-red-500 hover:bg-red-600 active:bg-red-700 transition-all text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <LogOut size={18} /> Marcar Saída
          </button>
        ) : presenteHoje ? (
          <button
            disabled
            className="bg-emerald-700/70 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-inner w-full sm:w-auto"
          >
            <ShieldCheck size={18} /> Presença já marcada
          </button>
        ) : (
          <button
            onClick={marcarEntrada}
            className="bg-green-600 hover:bg-green-700 active:bg-green-800 transition-all text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md w-full sm:w-auto"
          >
            <CalendarCheck2 size={18} /> Marcar Entrada
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <select
          value={mesSelecionado}
          onChange={(e) =>
            setMesSelecionado(
              e.target.value === "todos" ? "todos" : Number(e.target.value)
            )
          }
          className="bg-gray-100 dark:bg-[#0B1736]/60 border border-gray-300 dark:border-blue-800/40 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option value="todos">Todos os meses</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {new Date(2025, i, 1).toLocaleString("pt-PT", {
                month: "long",
              })}
            </option>
          ))}
        </select>

        <button
          onClick={() => setOrdemAsc((p) => !p)}
          className="text-sm flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-blue-800/40 rounded-lg bg-gray-100 dark:bg-[#0B1736]/50 text-gray-700 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-blue-800/40 transition-all duration-200"
        >
          <ArrowUpDown size={16} />{" "}
          {ordemAsc ? "Mais antigos" : "Mais recentes"}
        </button>
      </div>

      {/* Histórico */}
      <h2 className="flex items-center gap-2 text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        <Clock4 className="text-yellow-500" /> Histórico de Presenças
      </h2>

      <div className="rounded-2xl border border-gray-200 dark:border-blue-800/20 bg-white/80 dark:bg-[#0B1736]/40 p-4 sm:p-5 shadow-sm">
        {presencasFiltradas.length === 0 ? (
          <p className="text-center text-gray-500 py-6">
            Nenhum registro encontrado.
          </p>
        ) : (
          <div className="space-y-3">
            {presencasFiltradas.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg bg-gray-50 dark:bg-[#101B3F]/70 border border-gray-200 dark:border-blue-800/20 hover:shadow-md transition-shadow duration-200"
              >
                <div className="w-full">
                  <p className="font-semibold text-gray-900 dark:text-blue-300">
                    {new Date(p.data).toLocaleDateString("pt-PT")}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Entrada: {p.hora_entrada || "--:--"} | Saída:{" "}
                    {p.hora_saida || "--:--"}
                  </p>

                  {p.device_latitude ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      📍 ({p.device_latitude.toFixed(5)},{" "}
                      {p.device_longitude?.toFixed(5)}){" "}
                      {p.device_accuracy
                        ? `— ±${Math.round(p.device_accuracy)}m`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Sem localização
                    </p>
                  )}

                  {p.hora_entrada && p.hora_saida && (
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                      Total: {calcularHoras(p)} (1h almoço descontado)
                    </p>
                  )}

                  {p.gps_denied && (
                    <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> GPS negado no registo
                    </p>
                  )}
                </div>

                <span
                  className={`mt-2 sm:mt-0 px-3 py-1 rounded-lg text-sm font-medium ${
                    p.status === "Presente"
                      ? "bg-green-100 text-green-700 dark:bg-green-700/50 dark:text-green-200"
                      : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  {p.status}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {erro && (
        <div className="text-red-500 dark:text-red-400 text-sm mt-4 flex items-center gap-1">
          <AlertTriangle size={14} /> {erro}
        </div>
      )}

      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-8 pb-6 sm:pb-0 leading-relaxed">
        Dica: a hora e a localização são capturadas apenas no momento do
        registo — o profissional pode editar horários em relatórios, mas o
        registo original fica guardado para auditoria.
      </div>
    </div>
  );
}
