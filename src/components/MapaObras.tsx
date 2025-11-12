
// src/components/company/MapaObras.tsx
"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import "leaflet/dist/leaflet.css";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Eye,
  Loader2,
  ChevronDown,
  PanelLeftOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Obra = {
  id: string;
  nome: string;
  status?: "Em andamento" | "Concluída" | "Atrasada" | string | null;
  latitude?: number | null;
  longitude?: number | null;
  local?: string | null;
  custo_real?: number | null;
  progresso?: number | null;
};

const iconBase = (color: string) =>
  new L.Icon({
    iconUrl: `https://cdn.mapmarker.io/api/v1/pin?icon=fa-circle&size=40&hoffset=0&color=${color}`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -35],
  });

const getIcon = (status?: string | null) => {
  if (status === "Concluída") return iconBase("00C853");
  if (status === "Atrasada") return iconBase("FFC107");
  if (status === "Em andamento") return iconBase("1976D2");
  return iconBase("9E9E9E");
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  });
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

function AjustarMapa({ obras }: { obras: Obra[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = obras.filter((o) => o.latitude && o.longitude);
    if (pts.length > 0) {
      const bounds = L.latLngBounds(
        pts.map((o) => [o.latitude as number, o.longitude as number])
      );
      map.fitBounds(bounds, { padding: [60, 60] });
    } else {
      map.setView([39.5, -8], 6);
    }
  }, [obras, map]);
  return null;
}

export default function MapaObras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtro, setFiltro] = useState<"Todas" | "Ativas" | "Concluída" | "Atrasada">("Todas");
  const [painelAberto, setPainelAberto] = useState(true);      // desktop
  const [sheetAberta, setSheetAberta] = useState(false);       // mobile: fechado por padrão (com botão para abrir)

  const isMobile = useIsMobile(768);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 260);
    return () => clearTimeout(t);
  }, [painelAberto, sheetAberta, isMobile]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("obras").select("*");
      if (!error && data) setObras(data as Obra[]);
      setLoading(false);
    })();
  }, []);

  const obrasFiltradas = useMemo(() => {
    if (filtro === "Todas") return obras;
    if (filtro === "Ativas")
      return obras.filter((o) => o.status === "Em andamento");
    return obras.filter((o) => o.status === filtro);
  }, [obras, filtro]);

  const progressoMedio = useMemo(() => {
    if (obras.length === 0) return 0;
    const soma = obras.reduce((a, b) => a + (b.progresso ?? 0), 0);
    return Math.round(soma / obras.length);
  }, [obras]);

  const totais = useMemo(
    () => ({
      ativas: obras.filter((o) => o.status === "Em andamento").length,
      concluidas: obras.filter((o) => o.status === "Concluída").length,
      atrasadas: obras.filter((o) => o.status === "Atrasada").length,
    }),
    [obras]
  );

  return (
    <div
      className="
        relative w-full rounded-2xl overflow-hidden shadow-sm
        border border-gray-200 dark:border-[#1f2a37]
        bg-white dark:bg-[#161d27] mt-2 sm:mt-4
        h-[460px] sm:h-[520px]
      "
    >
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        </div>
      ) : obras.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Layers className="w-10 h-10 mb-2 text-gray-400" />
          Nenhuma obra registrada
        </div>
      ) : (
        <>
          <MapContainer
            whenCreated={(map) => (mapRef.current = map)}
            center={[39.5, -8]}
            zoom={6}
            minZoom={4}
            maxZoom={18}
            zoomControl={!isMobile}
            scrollWheelZoom
            touchZoom
            dragging
            style={{
              height: "100%",
              width: "100%",
              borderRadius: "1rem",
              zIndex: 0,
              touchAction: "pan-x pan-y",
            }}
          >
            <AjustarMapa obras={obrasFiltradas} />
            {!isMobile && <ZoomControl position="bottomright" />}

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {obrasFiltradas.map((obra) => {
              if (!obra.latitude || !obra.longitude) return null;
              return (
                <Marker
                  key={obra.id}
                  position={[obra.latitude, obra.longitude]}
                  icon={getIcon(obra.status)}
                >
                  <Popup>
                    <div className="text-sm">
                      <h3 className="font-semibold text-blue-600">{obra.nome}</h3>
                      {obra.local && <p><strong>Cidade:</strong> {obra.local}</p>}
                      {obra.status && <p><strong>Status:</strong> {obra.status}</p>}
                      {typeof obra.custo_real === "number" && (
                        <p><strong>Custo:</strong> €{obra.custo_real.toLocaleString()}</p>
                      )}
                      {typeof obra.progresso === "number" && (
                        <p><strong>Progresso:</strong> {obra.progresso}%</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* ===== MOBILE: botão flutuante para reabrir quando fechado ===== */}
          {isMobile && !sheetAberta && (
            <button
              onClick={() => setSheetAberta(true)}
              className="absolute bottom-[calc(env(safe-area-inset-bottom,0)+10px)] left-1/2 -translate-x-1/2
                         z-[31] inline-flex items-center gap-2 rounded-full px-3 py-2
                         bg-white/95 dark:bg-[#1b2535]/95 border border-gray-200 dark:border-[#2a3647]
                         shadow-md"
              aria-label="Abrir resumo de obras"
            >
              <ChevronDown className="w-4 h-4 rotate-180 text-gray-700 dark:text-gray-200" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                Resumo de obras
              </span>
              <span className="text-[10px] ml-1 text-gray-500 dark:text-gray-400">
                ({totais.ativas} / {totais.concluidas} / {totais.atrasadas})
              </span>
            </button>
          )}

          {/* ===== MOBILE: Bottom Sheet ===== */}
          {isMobile ? (
            <motion.div
              initial={{ y: 180 }}
              animate={{ y: sheetAberta ? 0 : 180 }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-[#1b2535]/95 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-[#2a3647] z-[30] p-3 pb-[calc(env(safe-area-inset-bottom,0)+12px)]"
            >
              <button
                onClick={() => setSheetAberta((s) => !s)}
                className="w-full flex justify-center items-center text-gray-500 hover:text-gray-800 dark:text-gray-400"
                aria-label={sheetAberta ? "Recolher painel" : "Expandir painel"}
              >
                <div className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600 mb-1.5" />
                <ChevronDown
                  className={`w-6 h-6 ml-2 transform transition-transform ${
                    sheetAberta ? "rotate-180" : ""
                  }`}
                />
              </button>

              {sheetAberta && (
                <div className="space-y-2 mt-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <button
                      onClick={() => setFiltro("Ativas")}
                      className={`rounded-lg py-2 text-xs font-medium ${
                        filtro === "Ativas"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300"
                      }`}
                    >
                      <Building2 className="w-4 h-4 mx-auto mb-1" />
                      {totais.ativas}
                      <p className="text-[10px] mt-0.5">Ativas</p>
                    </button>

                    <button
                      onClick={() => setFiltro("Concluída")}
                      className={`rounded-lg py-2 text-xs font-medium ${
                        filtro === "Concluída"
                          ? "bg-green-600 text-white"
                          : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                      {totais.concluidas}
                      <p className="text-[10px] mt-0.5">Concluídas</p>
                    </button>

                    <button
                      onClick={() => setFiltro("Atrasada")}
                      className={`rounded-lg py-2 text-xs font-medium ${
                        filtro === "Atrasada"
                          ? "bg-yellow-500 text-white"
                          : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-300"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                      {totais.atrasadas}
                      <p className="text-[10px] mt-0.5">Atrasadas</p>
                    </button>
                  </div>

                  <button
                    onClick={() => setFiltro("Todas")}
                    className={`w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition font-medium ${
                      filtro === "Todas"
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    <Eye className="w-3 h-3" /> Mostrar todas
                  </button>

                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-[#2a3647] pt-2">
                    <div className="flex justify-between">
                      <span>Média progresso</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        {progressoMedio}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-[#2a3647] rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-1.5 bg-blue-600 rounded-full transition-all duration-700"
                        style={{ width: `${progressoMedio}%` }}
                      />
                    </div>
                    <p className="text-[10px] mt-1 text-gray-400">
                      Total: {obras.length} obras
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: painelAberto ? 0 : -280 }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                className="absolute top-[120px] left-4 w-[250px] bg-white dark:bg-[#1b2535] backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 dark:border-[#2a3647] p-4 z-[30]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Layers className="text-blue-600 w-5 h-5" /> Obras
                  </h2>
                  <button
                    onClick={() => setPainelAberto(false)}
                    className="text-gray-400 hover:text-gray-700 text-sm font-bold"
                    aria-label="Fechar painel"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setFiltro("Ativas")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      filtro === "Ativas"
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-blue-50 text-gray-700 hover:bg-blue-100"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Ativas
                    </span>
                    <span>{totais.ativas}</span>
                  </button>

                  <button
                    onClick={() => setFiltro("Concluída")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      filtro === "Concluída"
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-green-50 text-gray-700 hover:bg-green-100"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Concluídas
                    </span>
                    <span>{totais.concluidas}</span>
                  </button>

                  <button
                    onClick={() => setFiltro("Atrasada")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      filtro === "Atrasada"
                        ? "bg-yellow-500 text-white shadow-md"
                        : "bg-yellow-50 text-gray-700 hover:bg-yellow-100"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Atrasadas
                    </span>
                    <span>{totais.atrasadas}</span>
                  </button>

                  <button
                    onClick={() => setFiltro("Todas")}
                    className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      filtro === "Todas"
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Eye className="w-4 h-4" /> Mostrar todas
                  </button>

                  <div className="mt-4 border-t border-gray-200 dark:border-[#2a3647] pt-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Média progresso</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        {progressoMedio}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-[#2a3647] h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 transition-all duration-700"
                        style={{ width: `${progressoMedio}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      Total de obras: <strong>{obras.length}</strong>
                    </p>
                  </div>
                </div>
              </motion.div>

              {!painelAberto && (
                <button
                  onClick={() => setPainelAberto(true)}
                  className="absolute top-[120px] left-4 z-[31] inline-flex items-center gap-2 rounded-full px-3 py-2 bg-white/90 dark:bg-[#1b2535]/90 border border-gray-200 dark:border-[#2a3647] shadow-md hover:bg-white"
                  aria-label="Abrir painel de obras"
                >
                  <PanelLeftOpen className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Abrir painel
                  </span>
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
